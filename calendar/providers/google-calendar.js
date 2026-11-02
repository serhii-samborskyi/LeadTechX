import { DateTime } from "luxon";

const PROVIDER = "google_calendar";

function zoneFor(config) {
  const zone = String(config?.timezone || "America/Chicago");
  return DateTime.now().setZone(zone).isValid ? zone : "America/Chicago";
}

function parseClock(date, clock, zone) {
  const [hour, minute] = String(clock || "00:00").split(":").map(Number);
  return DateTime.fromObject({ year: date.year, month: date.month, day: date.day, hour: hour || 0, minute: minute || 0 }, { zone });
}

async function connectionFor(prisma, profile) {
  const connection = await prisma.bookingConnection.findUnique({
    where: { businessProfileId_provider: { businessProfileId: profile.id, provider: PROVIDER } },
  });
  if (!connection || connection.status !== "active") throw new Error("Connect Google Calendar before checking availability");
  return connection;
}

async function googleRequest(path, { accessToken, method = "GET", body = null } = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Google Calendar request failed (${response.status})`);
  return payload;
}

function candidateSlots({ config, fromDate, days, durationMinutes }) {
  const zone = zoneFor(config);
  const duration = Math.max(5, Number(durationMinutes || config.slotDurationMinutes || 30));
  const dayCount = Math.min(31, Math.max(1, Number(days || 14)));
  const now = DateTime.now().setZone(zone);
  const requested = DateTime.fromISO(String(fromDate || now.toISODate()), { zone }).startOf("day");
  if (!requested.isValid) throw new Error("Invalid start date");
  const firstDay = requested < now.startOf("day") ? now.startOf("day") : requested;
  const rules = new Map((config.availabilityRules || []).map((rule) => [rule.dayOfWeek, rule]));
  const buffer = Math.max(0, Number(config.bufferMinutes || 0));
  const slots = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = firstDay.plus({ days: offset });
    const rule = rules.get(date.weekday % 7);
    if (!rule?.enabled) continue;
    let cursor = parseClock(date, rule.startTime, zone);
    const end = parseClock(date, rule.endTime, zone);
    while (cursor.plus({ minutes: duration }) <= end && slots.length < 300) {
      const slotEnd = cursor.plus({ minutes: duration });
      if (cursor > now) {
        slots.push({
          start: cursor.toISO(),
          end: slotEnd.toISO(),
          date: cursor.toISODate(),
          label: cursor.toFormat("ccc, LLL d 'at' h:mm a"),
          timezone: zone,
        });
      }
      cursor = cursor.plus({ minutes: duration + buffer });
    }
  }
  return { slots, timezone: zone, durationMinutes: duration, firstDay, rangeEnd: firstDay.plus({ days: dayCount }) };
}

export async function listSlots({ prisma, profile, config, fromDate, days = 14, durationMinutes, resolveCalendarAccessToken }) {
  const connection = await connectionFor(prisma, profile);
  if (typeof resolveCalendarAccessToken !== "function") throw new Error("Google Calendar authentication is unavailable");
  const accessToken = await resolveCalendarAccessToken(connection);
  const candidates = candidateSlots({ config, fromDate, days, durationMinutes });
  const calendarId = String(connection.settings?.calendarId || "primary");
  const freeBusy = await googleRequest("/freeBusy", {
    accessToken,
    method: "POST",
    body: {
      timeMin: candidates.firstDay.toUTC().toISO(),
      timeMax: candidates.rangeEnd.toUTC().toISO(),
      timeZone: candidates.timezone,
      items: [{ id: calendarId }],
    },
  });
  const busy = freeBusy?.calendars?.[calendarId]?.busy || [];
  const slots = candidates.slots.filter((slot) => {
    const start = DateTime.fromISO(slot.start).toUTC();
    const end = DateTime.fromISO(slot.end).toUTC();
    return !busy.some((entry) => start < DateTime.fromISO(entry.end).toUTC() && end > DateTime.fromISO(entry.start).toUTC());
  });
  const appointments = await prisma.appointment.findMany({
    where: {
      businessName: profile.businessName,
      website: profile.website,
      calendarProvider: PROVIDER,
      scheduledStart: { gte: candidates.firstDay.toUTC().toJSDate(), lt: candidates.rangeEnd.toUTC().toJSDate() },
      status: { notIn: ["cancelled", "rejected"] },
    },
    orderBy: { scheduledStart: "asc" },
  });
  return { slots, appointments, timezone: candidates.timezone, durationMinutes: candidates.durationMinutes, provider: PROVIDER, workflowMode: "direct_booking" };
}

export async function book({ prisma, profile, config, start, durationMinutes, customer, intakeData, reason, resolveCalendarAccessToken }) {
  const requested = DateTime.fromISO(String(start || ""), { zone: zoneFor(config) });
  if (!requested.isValid) throw new Error("A valid appointment start time is required");
  const availability = await listSlots({ prisma, profile, config, fromDate: requested.toISODate(), days: 1, durationMinutes, resolveCalendarAccessToken });
  const slot = availability.slots.find((item) => Math.abs(DateTime.fromISO(item.start).toMillis() - requested.toMillis()) < 60_000);
  if (!slot) throw new Error("That Google Calendar time is no longer available");
  const connection = await connectionFor(prisma, profile);
  const accessToken = await resolveCalendarAccessToken(connection);
  const calendarId = String(connection.settings?.calendarId || "primary");
  const event = await googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    accessToken,
    method: "POST",
    body: {
      summary: `${customer?.name || "Customer"} - ${reason || "Appointment"}`,
      description: [`Booked by RingPort`, reason ? `Reason: ${reason}` : "", customer?.phone ? `Phone: ${customer.phone}` : ""].filter(Boolean).join("\n"),
      start: { dateTime: DateTime.fromISO(slot.start).toISO(), timeZone: availability.timezone },
      end: { dateTime: DateTime.fromISO(slot.end).toISO(), timeZone: availability.timezone },
      attendees: customer?.email ? [{ email: customer.email, displayName: customer.name || undefined }] : undefined,
      extendedProperties: { private: { ringportBusinessId: String(profile.id) } },
    },
  });
  return prisma.appointment.create({
    data: {
      businessName: profile.businessName,
      website: profile.website,
      customerName: String(customer?.name || "Customer"),
      phone: customer?.phone || null,
      email: customer?.email || null,
      requestedAt: slot.start,
      scheduledStart: DateTime.fromISO(slot.start).toUTC().toJSDate(),
      scheduledEnd: DateTime.fromISO(slot.end).toUTC().toJSDate(),
      durationMinutes: availability.durationMinutes,
      timezone: availability.timezone,
      intakeData: { ...(intakeData || {}), googleEventUrl: event.htmlLink || null, calendarId },
      calendarProvider: PROVIDER,
      bookingKey: `${profile.cacheKey}:${PROVIDER}:${event.id}`,
      externalId: event.id,
      reason: reason || null,
      status: "confirmed",
    },
  });
}

export async function update({ prisma, profile, config, appointment, start, durationMinutes, customer, reason, resolveCalendarAccessToken }) {
  const zone = zoneFor(config);
  const nextStart = DateTime.fromISO(String(start || appointment.scheduledStart), { zone });
  if (!nextStart.isValid) throw new Error("A valid appointment start time is required");
  const duration = Math.max(5, Number(durationMinutes || appointment.durationMinutes || config.slotDurationMinutes || 30));
  const nextEnd = nextStart.plus({ minutes: duration });
  const currentStart = DateTime.fromJSDate(new Date(appointment.scheduledStart)).setZone(zone);
  if (Math.abs(currentStart.toMillis() - nextStart.toMillis()) >= 60_000) {
    const availability = await listSlots({
      prisma,
      profile,
      config,
      fromDate: nextStart.toISODate(),
      days: 1,
      durationMinutes: duration,
      resolveCalendarAccessToken,
    });
    const open = availability.slots.some((item) => Math.abs(DateTime.fromISO(item.start).toMillis() - nextStart.toMillis()) < 60_000);
    if (!open) throw new Error("That Google Calendar time is no longer available");
  }
  const connection = await connectionFor(prisma, profile);
  const accessToken = await resolveCalendarAccessToken(connection);
  const calendarId = String(connection.settings?.calendarId || appointment.intakeData?.calendarId || "primary");
  const event = await googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(appointment.externalId)}?sendUpdates=all`, {
    accessToken,
    method: "PATCH",
    body: {
      summary: `${customer?.name || appointment.customerName || "Customer"} - ${reason || appointment.reason || "Appointment"}`,
      start: { dateTime: nextStart.toISO(), timeZone: zone },
      end: { dateTime: nextEnd.toISO(), timeZone: zone },
      attendees: customer?.email ? [{ email: customer.email, displayName: customer.name || undefined }] : undefined,
    },
  });
  return prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      customerName: customer?.name || appointment.customerName,
      phone: customer?.phone ?? appointment.phone,
      email: customer?.email ?? appointment.email,
      requestedAt: nextStart.toISO(),
      scheduledStart: nextStart.toUTC().toJSDate(),
      scheduledEnd: nextEnd.toUTC().toJSDate(),
      durationMinutes: duration,
      timezone: zone,
      reason: reason ?? appointment.reason,
      intakeData: { ...((appointment.intakeData && typeof appointment.intakeData === "object") ? appointment.intakeData : {}), googleEventUrl: event.htmlLink || null, calendarId },
    },
  });
}

export async function cancel({ prisma, profile, appointment, resolveCalendarAccessToken }) {
  const connection = await connectionFor(prisma, profile);
  const accessToken = await resolveCalendarAccessToken(connection);
  const calendarId = String(connection.settings?.calendarId || appointment.intakeData?.calendarId || "primary");
  await googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(appointment.externalId)}?sendUpdates=all`, { accessToken, method: "DELETE" });
  return prisma.appointment.update({ where: { id: appointment.id }, data: { status: "cancelled", bookingKey: null } });
}
