import crypto from "node:crypto";
import { DateTime } from "luxon";

const PROVIDER = "calendly";

function safeZone(value) {
  const zone = String(value || "America/Chicago");
  return DateTime.now().setZone(zone).isValid ? zone : "America/Chicago";
}

async function connectionFor(prisma, profile) {
  const connection = await prisma.bookingConnection.findUnique({
    where: { businessProfileId_provider: { businessProfileId: profile.id, provider: PROVIDER } },
  });
  if (!connection || connection.status !== "active") throw new Error("Connect Calendly before checking availability");
  if (!connection.settings?.eventTypeUri) throw new Error("Choose a Calendly event type in appointment settings");
  return connection;
}

async function calendlyRequest(path, { accessToken, method = "GET", body = null } = {}) {
  const response = await fetch(`https://api.calendly.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.title || `Calendly request failed (${response.status})`);
  return payload;
}

function resourceId(uri) {
  return String(uri || "").split("/").filter(Boolean).pop() || "";
}

function mapExternalAppointment(appointment) {
  const start = appointment.scheduledStart ? new Date(appointment.scheduledStart) : null;
  const end = appointment.scheduledEnd ? new Date(appointment.scheduledEnd) : null;
  return {
    id: `external-${appointment.id}`,
    externalRecordId: appointment.id,
    businessProfileId: appointment.businessProfileId,
    calendarProvider: PROVIDER,
    externalId: appointment.externalId,
    customerName: appointment.customerName || "Calendly invitee",
    phone: appointment.phone,
    email: appointment.email,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    durationMinutes: start && end ? Math.max(1, Math.round((end - start) / 60000)) : null,
    timezone: appointment.timezone,
    reason: appointment.serviceTitle || "Calendly appointment",
    status: String(appointment.status || appointment.bookingStatus || "confirmed").toLowerCase() === "cancelled" ? "cancelled" : "confirmed",
    bookingStatus: appointment.bookingStatus,
    bookingUrl: appointment.bookingUrl,
    manageUrl: appointment.manageUrl,
    intakeData: {
      provider: PROVIDER,
      source: appointment.source,
      externalId: appointment.externalId,
      calendlyEventId: appointment.calendarEventId,
      rescheduleUrl: appointment.manageUrl,
    },
  };
}

export async function listSlots({ prisma, profile, config, fromDate, days = 14, resolveCalendarAccessToken }) {
  const connection = await connectionFor(prisma, profile);
  if (typeof resolveCalendarAccessToken !== "function") throw new Error("Calendly authentication is unavailable");
  const accessToken = await resolveCalendarAccessToken(connection);
  const zone = safeZone(config.timezone || connection.settings?.timezone);
  const now = DateTime.now().setZone(zone);
  const parsed = DateTime.fromISO(String(fromDate || now.toISODate()), { zone }).startOf("day");
  if (!parsed.isValid) throw new Error("Invalid start date");
  const start = parsed < now ? now.plus({ minutes: 1 }) : parsed;
  const end = start.plus({ days: Math.min(31, Math.max(1, Number(days || 14))) });
  const query = new URLSearchParams({
    event_type: String(connection.settings.eventTypeUri),
    start_time: start.toUTC().toISO(),
    end_time: end.toUTC().toISO(),
  });
  const response = await calendlyRequest(`/event_type_available_times?${query}`, { accessToken });
  const eventType = (connection.settings?.eventTypes || []).find((item) => item.uri === connection.settings.eventTypeUri) || {};
  const duration = Math.max(5, Number(eventType.duration || config.slotDurationMinutes || 30));
  const slots = (response.collection || []).map((item) => {
    const slotStart = DateTime.fromISO(item.start_time).setZone(zone);
    return {
      start: slotStart.toISO(),
      end: slotStart.plus({ minutes: duration }).toISO(),
      date: slotStart.toISODate(),
      label: slotStart.toFormat("ccc, LLL d 'at' h:mm a"),
      timezone: zone,
      schedulingUrl: item.scheduling_url || connection.bookingUrl || "",
    };
  });
  const [directAppointments, externalAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessName: profile.businessName,
        website: profile.website,
        calendarProvider: PROVIDER,
        scheduledStart: { gte: start.toUTC().toJSDate(), lt: end.toUTC().toJSDate() },
        status: { notIn: ["cancelled", "rejected"] },
      },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.bookingAppointment.findMany({
      where: {
        businessProfileId: profile.id,
        provider: PROVIDER,
        scheduledStart: { gte: start.toUTC().toJSDate(), lt: end.toUTC().toJSDate() },
        status: { notIn: ["cancelled", "canceled", "deleted"] },
      },
      orderBy: { scheduledStart: "asc" },
    }),
  ]);
  const directEventIds = new Set(directAppointments.map((item) => String(item.externalId || "")).filter(Boolean));
  const appointments = [
    ...directAppointments,
    ...externalAppointments
      .filter((item) => !directEventIds.has(String(item.calendarEventId || "")))
      .map(mapExternalAppointment),
  ].sort((left, right) => new Date(left.scheduledStart || 0) - new Date(right.scheduledStart || 0));
  return {
    slots,
    appointments,
    timezone: zone,
    durationMinutes: duration,
    provider: PROVIDER,
    workflowMode: connection.workflowMode || "direct_booking",
    selectedService: eventType.name ? { name: eventType.name, externalId: resourceId(eventType.uri), durationMinutes: duration } : null,
  };
}

export async function book({ prisma, profile, config, start, customer, intakeData, reason, resolveCalendarAccessToken }) {
  if (!customer?.email) throw new Error("Calendly requires the customer's email before booking");
  const requested = DateTime.fromISO(String(start || ""), { zone: safeZone(config.timezone) });
  if (!requested.isValid) throw new Error("A valid appointment start time is required");
  const availability = await listSlots({ prisma, profile, config, fromDate: requested.toISODate(), days: 1, resolveCalendarAccessToken });
  const slot = availability.slots.find((item) => Math.abs(DateTime.fromISO(item.start).toMillis() - requested.toMillis()) < 60_000);
  if (!slot) throw new Error("That Calendly time is no longer available");
  const connection = await connectionFor(prisma, profile);
  const accessToken = await resolveCalendarAccessToken(connection);
  const response = await calendlyRequest("/invitees", {
    accessToken,
    method: "POST",
    body: {
      event_type: connection.settings.eventTypeUri,
      start_time: DateTime.fromISO(slot.start).toUTC().toISO(),
      invitee: { name: String(customer.name || "Customer"), email: String(customer.email).toLowerCase(), timezone: availability.timezone },
      tracking: { utm_source: "ringport", utm_medium: "ai_receptionist" },
    },
  });
  const resource = response.resource || {};
  const eventUri = resource.event || resource.scheduled_event || "";
  const externalId = resourceId(eventUri) || resourceId(resource.uri) || crypto.randomUUID();
  return prisma.appointment.create({
    data: {
      businessName: profile.businessName,
      website: profile.website,
      customerName: String(customer.name || "Customer"),
      phone: customer.phone || null,
      email: String(customer.email).toLowerCase(),
      requestedAt: slot.start,
      scheduledStart: DateTime.fromISO(slot.start).toUTC().toJSDate(),
      scheduledEnd: DateTime.fromISO(slot.end).toUTC().toJSDate(),
      durationMinutes: availability.durationMinutes,
      timezone: availability.timezone,
      intakeData: {
        ...(intakeData || {}),
        calendlyInviteeUri: resource.uri || null,
        calendlyEventUri: eventUri || null,
        cancelUrl: resource.cancel_url || null,
        rescheduleUrl: resource.reschedule_url || null,
      },
      calendarProvider: PROVIDER,
      bookingKey: `${profile.cacheKey}:${PROVIDER}:${externalId}`,
      externalId,
      reason: reason || availability.selectedService?.name || null,
      status: "confirmed",
    },
  });
}

export async function cancel({ prisma, profile, appointment, resolveCalendarAccessToken, reason = "Cancelled through RingPort" }) {
  const connection = await connectionFor(prisma, profile);
  const accessToken = await resolveCalendarAccessToken(connection);
  const eventId = resourceId(appointment.intakeData?.calendlyEventUri) || appointment.externalId;
  if (!eventId) throw new Error("Calendly event ID is missing");
  await calendlyRequest(`/scheduled_events/${encodeURIComponent(eventId)}/cancellation`, {
    accessToken,
    method: "POST",
    body: { reason: String(reason || "Cancelled through RingPort").slice(0, 500) },
  });
  return prisma.appointment.update({ where: { id: appointment.id }, data: { status: "cancelled", bookingKey: null } });
}

export async function update({ appointment }) {
  const rescheduleUrl = appointment?.intakeData?.rescheduleUrl;
  const error = new Error("Calendly rescheduling uses the secure reschedule link");
  error.rescheduleUrl = rescheduleUrl || null;
  throw error;
}
