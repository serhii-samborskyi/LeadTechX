import { DateTime } from "luxon";

const PROVIDER = "vagaro";
const DEFAULT_REGION = "us02";
const DEFAULT_TIMEOUT_MS = 4500;

function bookingStatusToType(status) {
  const normalized = String(status || "").toLowerCase();
  if (["cancel", "cancelled", "canceled", "deleted", "denied", "no show"].includes(normalized)) return "cancelled";
  if (["confirmed", "accepted", "service completed", "service in progress", "show", "ready to start"].includes(normalized)) return "confirmed";
  if (["awaiting confirmation", "need acceptance"].includes(normalized)) return "requested";
  return normalized || "external";
}

function externalId(value) {
  return String(value || "").trim();
}

function includesText(haystack, needle) {
  const left = String(haystack || "").toLowerCase();
  const right = String(needle || "").toLowerCase().trim();
  return right && left.includes(right);
}

async function activeConnection(prisma, profile) {
  if (!profile?.id) return null;
  return prisma.bookingConnection.findUnique({
    where: { businessProfileId_provider: { businessProfileId: profile.id, provider: PROVIDER } },
    include: {
      services: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      professionals: { where: { active: true }, orderBy: [{ displayName: "asc" }] },
      links: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
  });
}

function findService(connection, args = {}) {
  const requested = externalId(args.serviceId || args.serviceExternalId);
  if (requested) {
    return connection.services.find((service) => String(service.id) === requested || service.externalId === requested) || null;
  }
  const name = String(args.serviceName || args.service || args.reason || "").trim();
  if (name) {
    return connection.services.find((service) => includesText(service.name, name) || includesText(name, service.name)) || null;
  }
  return connection.services[0] || null;
}

function findProfessional(connection, args = {}) {
  const requested = externalId(args.professionalId || args.serviceProviderId || args.professionalExternalId);
  if (requested) {
    return connection.professionals.find((pro) => String(pro.id) === requested || pro.externalId === requested) || null;
  }
  const name = String(args.professionalName || args.professional || "").trim();
  if (name) {
    return connection.professionals.find((pro) => includesText(pro.displayName, name) || includesText(name, pro.displayName)) || null;
  }
  return null;
}

function mapAppointment(appointment) {
  return {
    id: appointment.id,
    businessProfileId: appointment.businessProfileId,
    calendarProvider: appointment.provider,
    externalId: appointment.externalId,
    customerName: appointment.customerName || "Vagaro customer",
    phone: appointment.phone,
    email: appointment.email,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    durationMinutes:
      appointment.scheduledStart && appointment.scheduledEnd
        ? Math.max(1, Math.round((new Date(appointment.scheduledEnd) - new Date(appointment.scheduledStart)) / 60000))
        : null,
    timezone: appointment.timezone,
    serviceTitle: appointment.serviceTitle,
    professionalName: appointment.professionalName,
    reason: [appointment.serviceTitle, appointment.professionalName].filter(Boolean).join(" with ") || appointment.source || "Vagaro appointment",
    status: bookingStatusToType(appointment.bookingStatus || appointment.status),
    bookingStatus: appointment.bookingStatus,
    bookingUrl: appointment.bookingUrl,
    manageUrl: appointment.manageUrl,
    intakeData: {
      provider: appointment.provider,
      service: appointment.serviceTitle,
      professional: appointment.professionalName,
      source: appointment.source,
      externalId: appointment.externalId,
    },
  };
}

async function localAppointments({ prisma, profile, fromDate, days, timezone }) {
  const zone = timezone || "America/Chicago";
  const firstDay = DateTime.fromISO(fromDate || DateTime.now().setZone(zone).toISODate(), { zone }).startOf("day");
  const dayCount = Math.min(60, Math.max(1, Number(days || 14)));
  const rangeEnd = firstDay.plus({ days: dayCount });
  const appointments = await prisma.bookingAppointment.findMany({
    where: {
      businessProfileId: profile.id,
      provider: PROVIDER,
      scheduledStart: { gte: firstDay.toUTC().toJSDate(), lt: rangeEnd.toUTC().toJSDate() },
      status: { notIn: ["cancelled", "deleted"] },
    },
    orderBy: { scheduledStart: "asc" },
  });
  return appointments.map(mapAppointment);
}

function normalizeAvailabilityResponse(data, { service, professional, timezone }) {
  const zone = timezone || "America/Chicago";
  const slots = [];
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  for (const row of rows) {
    const appointmentDate = row.appointmentDate;
    const items = Array.isArray(row.items) ? row.items : [];
    const item = items[0] || {};
    const duration = Math.max(5, Number(item.duration || service?.durationMinutes || 30));
    const providerName = item.serviceProvider || professional?.displayName || "";
    const providerId = item.serviceProviderId || professional?.externalId || "";
    const serviceTitle = item.serviceTitle || service?.name || "";
    const serviceId = item.serviceId || service?.externalId || "";
    for (const time of row.timeSlot || []) {
      const start = DateTime.fromISO(`${appointmentDate}T${time}`, { zone });
      if (!start.isValid) continue;
      const end = start.plus({ minutes: duration });
      slots.push({
        start: start.toISO(),
        end: end.toISO(),
        date: start.toISODate(),
        label: `${start.toFormat("ccc, LLL d 'at' h:mm a")}${providerName ? ` with ${providerName}` : ""}`,
        timezone: zone,
        provider: PROVIDER,
        serviceId,
        serviceName: serviceTitle,
        professionalId: providerId,
        professionalName: providerName,
        durationMinutes: duration,
      });
    }
  }
  return slots;
}

async function liveAvailability({ connection, service, professional, fromDate, days, timezone, resolveBookingAccessToken, requestBookingProvider }) {
  if (!connection?.externalBusinessId) throw new Error("Vagaro business ID is not configured");
  if (!service?.externalId) throw new Error("Choose a Vagaro service before searching availability");
  if (typeof resolveBookingAccessToken !== "function" || typeof requestBookingProvider !== "function") {
    throw new Error("Vagaro API helpers are not configured");
  }
  const token = await resolveBookingAccessToken(connection);
  if (!token) throw new Error("Vagaro access token is not configured");
  const zone = timezone || "America/Chicago";
  const startDay = DateTime.fromISO(fromDate || DateTime.now().setZone(zone).toISODate(), { zone }).startOf("day");
  const dayCount = Math.min(7, Math.max(1, Number(days || 3)));
  const bookingItem = { serviceId: service.externalId };
  if (professional?.externalId) bookingItem.serviceProviderIds = [professional.externalId];
  const calls = Array.from({ length: dayCount }, (_, offset) => {
    const appointmentDate = startDay.plus({ days: offset }).toISODate();
    return requestBookingProvider(connection, {
      method: "POST",
      path: "/api/v2/appointments/availability",
      accessToken: token,
      body: {
        businessId: connection.externalBusinessId,
        appointmentDate,
        bookingItems: [bookingItem],
      },
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  });
  const results = await Promise.allSettled(calls);
  const slots = [];
  const errors = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      slots.push(...normalizeAvailabilityResponse(result.value, { service, professional, timezone: zone }));
    } else {
      errors.push(result.reason?.message || "Vagaro availability failed");
    }
  }
  if (!slots.length && errors.length === results.length) throw new Error(errors[0]);
  return { slots, errors };
}

export async function listSlots(args) {
  const { prisma, profile, config } = args;
  const timezone = config.timezone || "America/Chicago";
  const connection = await activeConnection(prisma, profile);
  const appointments = await localAppointments({
    prisma,
    profile,
    fromDate: args.fromDate,
    days: args.days,
    timezone,
  });
  if (!connection || connection.status !== "active") {
    return {
      provider: PROVIDER,
      slots: [],
      appointments,
      timezone,
      durationMinutes: Math.max(5, Number(args.durationMinutes || config.slotDurationMinutes || 30)),
      warning: "Vagaro is not connected.",
    };
  }
  const service = findService(connection, args);
  const professional = findProfessional(connection, args);
  let slots = [];
  let warning = "";
  try {
    const live = await liveAvailability({
      connection,
      service,
      professional,
      fromDate: args.fromDate,
      days: args.days,
      timezone,
      resolveBookingAccessToken: args.resolveBookingAccessToken,
      requestBookingProvider: args.requestBookingProvider,
    });
    slots = live.slots;
    warning = live.errors?.length ? live.errors[0] : "";
    if (!slots.length && professional) {
      const fallback = await liveAvailability({
        connection,
        service,
        professional: null,
        fromDate: args.fromDate,
        days: args.days,
        timezone,
        resolveBookingAccessToken: args.resolveBookingAccessToken,
        requestBookingProvider: args.requestBookingProvider,
      });
      slots = fallback.slots;
      warning = slots.length
        ? `${professional.displayName} is not available in this range. Showing other available professionals.`
        : fallback.errors?.[0] || warning;
    }
  } catch (error) {
    warning = error.message;
  }
  return {
    provider: PROVIDER,
    workflowMode: connection.workflowMode,
    slots: slots.slice(0, 120),
    appointments,
    timezone,
    durationMinutes: Math.max(5, Number(service?.durationMinutes || args.durationMinutes || config.slotDurationMinutes || 30)),
    selectedService: service
      ? { id: service.id, externalId: service.externalId, name: service.name, durationMinutes: service.durationMinutes }
      : null,
    selectedProfessional: professional
      ? { id: professional.id, externalId: professional.externalId, name: professional.displayName }
      : null,
    services: connection.services.map((item) => ({ id: item.id, externalId: item.externalId, name: item.name, durationMinutes: item.durationMinutes })),
    professionals: connection.professionals.map((item) => ({ id: item.id, externalId: item.externalId, name: item.displayName })),
    warning,
  };
}

export async function book() {
  throw new Error("Direct booking is not supported for Vagaro. Send the Vagaro booking link instead.");
}
