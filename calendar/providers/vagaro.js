import { DateTime } from "luxon";

const PROVIDER = "vagaro";
const DEFAULT_REGION = "us02";
const DEFAULT_TIMEOUT_MS = 4500;
const MAX_BROAD_SERVICE_SEARCH = 8;
const GENERIC_SERVICE_WORDS = new Set([
  "appointment",
  "availability",
  "available",
  "booking",
  "consult",
  "consultation",
  "earliest",
  "general",
  "open",
  "opening",
  "service",
  "spot",
  "time",
]);

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

function isPublicNumericVagaroId(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function apiBusinessId(connection) {
  const settings = connection?.settings && typeof connection.settings === "object" ? connection.settings : {};
  const publicProfile = settings.vagaroPublicProfile && typeof settings.vagaroPublicProfile === "object" ? settings.vagaroPublicProfile : {};
  const value = externalId(connection?.externalBusinessId);
  if (!value || isPublicNumericVagaroId(value)) return "";
  const publicIds = new Set(
    [
      publicProfile.businessId,
      publicProfile.encryptedBusinessId,
      publicProfile.publicEncryptedBusinessId,
      publicProfile.numericBusinessId,
      publicProfile.publicNumericBusinessId,
    ]
      .map((item) => externalId(item))
      .filter(Boolean),
  );
  if (publicIds.has(value)) return "";
  if (settings.apiBusinessIdSource === "locations" || settings.apiBusinessIdSource === "manual") return value;
  if (settings.selectedLocation?.source === "vagaro_public_page") return "";
  const apiLocation = Array.isArray(settings.locations) ? settings.locations.find((location) => externalId(location?.businessId) === value) : null;
  return apiLocation ? value : "";
}

function includesText(haystack, needle) {
  const left = String(haystack || "").toLowerCase();
  const right = String(needle || "").toLowerCase().trim();
  return right && left.includes(right);
}

function compactWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isGenericServiceRequest(value) {
  const words = compactWords(value);
  if (!words.length) return true;
  const genericCount = words.filter((word) => GENERIC_SERVICE_WORDS.has(word)).length;
  return genericCount > 0 && genericCount === words.length;
}

function serviceMatchesName(serviceName, requestName) {
  if (includesText(serviceName, requestName) || includesText(requestName, serviceName)) return true;
  const serviceWords = compactWords(serviceName);
  const requestWords = compactWords(requestName).filter(
    (word) => !["appointment", "availability", "available", "booking", "earliest", "general", "open", "opening", "service", "spot", "time"].includes(word),
  );
  return requestWords.some((requestWord) =>
    serviceWords.some((serviceWord) => serviceWord.includes(requestWord) || requestWord.includes(serviceWord)),
  );
}

function safeTimezone(value) {
  const zone = String(value || "").trim() || "America/Chicago";
  return DateTime.now().setZone(zone).isValid ? zone : "America/Chicago";
}

function requestedStartDay(fromDate, timezone) {
  const zone = safeTimezone(timezone);
  const today = DateTime.now().setZone(zone).startOf("day");
  if (!fromDate) return today;
  const parsed = DateTime.fromISO(String(fromDate), { zone });
  return parsed.isValid ? parsed.setZone(zone).startOf("day") : today;
}

function futureStartDay(fromDate, timezone) {
  const zone = safeTimezone(timezone);
  const today = DateTime.now().setZone(zone).startOf("day");
  const requested = requestedStartDay(fromDate, zone);
  return requested.toMillis() < today.toMillis() ? today : requested;
}

function isPastDateAvailabilityError(message) {
  return /appointment date can(?:\s*not|'t)\s+be\s+past date/i.test(String(message || ""));
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

function findServiceByRequest(connection, args = {}) {
  const requested = externalId(args.serviceId || args.serviceExternalId);
  if (requested) {
    return connection.services.find((service) => String(service.id) === requested || service.externalId === requested) || null;
  }
  const name = String(args.serviceName || args.service || args.reason || "").trim();
  if (name) {
    return connection.services.find((service) => serviceMatchesName(service.name, name)) || null;
  }
  return connection.services[0] || null;
}

function serviceCandidates(connection, args = {}) {
  const services = Array.isArray(connection?.services) ? connection.services.filter((service) => service.active !== false && service.externalId) : [];
  const requested = externalId(args.serviceId || args.serviceExternalId);
  if (requested) {
    const service = findServiceByRequest(connection, args);
    return {
      services: service ? [service] : [],
      selectedService: service,
      warning: service ? "" : "The requested Vagaro service was not found.",
      broadSearch: false,
    };
  }

  const name = String(args.serviceName || args.service || args.reason || "").trim();
  if (name) {
    const matches = services.filter((service) => serviceMatchesName(service.name, name));
    if (matches.length) {
      return {
        services: matches.slice(0, MAX_BROAD_SERVICE_SEARCH),
        selectedService: matches[0],
        warning: matches.length > 1 ? `Found multiple services matching "${name}". Showing earliest available options.` : "",
        broadSearch: matches.length > 1,
      };
    }
  }

  const broadServices = services.slice(0, MAX_BROAD_SERVICE_SEARCH);
  return {
    services: broadServices,
    selectedService: broadServices.length === 1 ? broadServices[0] : null,
    warning: name && !isGenericServiceRequest(name)
      ? `I could not find an exact Vagaro service named "${name}". Showing earliest availability across available services.`
      : "Showing earliest availability across available services.",
    broadSearch: true,
  };
}

function isServiceSelectionWarning(message) {
  return /^(found multiple services|i could not find an exact vagaro service|showing earliest availability)/i.test(String(message || ""));
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
  const zone = safeTimezone(timezone);
  const firstDay = requestedStartDay(fromDate, zone);
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
  const zone = safeTimezone(timezone);
  const now = DateTime.now().setZone(zone);
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
      if (start.toMillis() < now.toMillis()) continue;
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
  const businessId = apiBusinessId(connection);
  if (!businessId) throw new Error("Vagaro API business location ID is not configured");
  if (!service?.externalId) throw new Error("Choose a Vagaro service before searching availability");
  if (typeof resolveBookingAccessToken !== "function" || typeof requestBookingProvider !== "function") {
    throw new Error("Vagaro API helpers are not configured");
  }
  const token = await resolveBookingAccessToken(connection);
  if (!token) throw new Error("Vagaro access token is not configured");
  const zone = safeTimezone(timezone);
  const startDay = futureStartDay(fromDate, zone);
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
        businessId,
        appointmentDate,
        bookingItems: [bookingItem],
      },
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  });
  const results = await Promise.allSettled(calls);
  const slots = [];
  const errors = [];
  const pastDateErrors = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      slots.push(...normalizeAvailabilityResponse(result.value, { service, professional, timezone: zone }));
    } else {
      const message = result.reason?.message || "Vagaro availability failed";
      if (isPastDateAvailabilityError(message)) pastDateErrors.push(message);
      else errors.push(message);
    }
  }
  if (!slots.length && errors.length + pastDateErrors.length === results.length) {
    throw new Error(errors[0] || "Vagaro rejected the selected date as past. Search a future date.");
  }
  return { slots, errors };
}

export async function listSlots(args) {
  const { prisma, profile, config } = args;
  const timezone = safeTimezone(config.timezone);
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
  const serviceSelection = serviceCandidates(connection, args);
  const professional = findProfessional(connection, args);
  let slots = [];
  const warnings = [serviceSelection.warning].filter(Boolean);
  if (!serviceSelection.services.length) {
    warnings.push("No active Vagaro services are imported.");
  } else {
    const searches = serviceSelection.services.map(async (service) => {
      let serviceSlots = [];
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
        serviceSlots = live.slots;
        warning = live.errors?.length ? live.errors[0] : "";
        if (!serviceSlots.length && professional) {
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
          serviceSlots = fallback.slots;
          warning = serviceSlots.length
            ? `${professional.displayName} is not available for ${service.name} in this range. Showing other available professionals.`
            : fallback.errors?.[0] || warning;
        }
      } catch (error) {
        warning = error.message;
      }
      return { service, slots: serviceSlots, warning };
    });
    const results = await Promise.allSettled(searches);
    for (const result of results) {
      if (result.status === "fulfilled") {
        slots.push(...result.value.slots);
        if (result.value.warning) warnings.push(result.value.warning);
      } else {
        warnings.push(result.reason?.message || "Vagaro availability failed");
      }
    }
  }
  slots.sort((left, right) => new Date(left.start) - new Date(right.start));
  const firstUsefulWarning =
    (slots.length
      ? warnings.find((message) => message && isServiceSelectionWarning(message))
      : warnings.find((message) => message && !isServiceSelectionWarning(message))) ||
    warnings.find(Boolean) ||
    "";
  return {
    provider: PROVIDER,
    workflowMode: connection.workflowMode,
    slots: slots.slice(0, 120),
    appointments,
    timezone,
    durationMinutes: Math.max(
      5,
      Number(serviceSelection.selectedService?.durationMinutes || args.durationMinutes || config.slotDurationMinutes || 30),
    ),
    selectedService: serviceSelection.selectedService
      ? {
          id: serviceSelection.selectedService.id,
          externalId: serviceSelection.selectedService.externalId,
          name: serviceSelection.selectedService.name,
          durationMinutes: serviceSelection.selectedService.durationMinutes,
        }
      : null,
    selectedServices: serviceSelection.services.map((item) => ({
      id: item.id,
      externalId: item.externalId,
      name: item.name,
      durationMinutes: item.durationMinutes,
    })),
    selectedProfessional: professional
      ? { id: professional.id, externalId: professional.externalId, name: professional.displayName }
      : null,
    services: connection.services.map((item) => ({ id: item.id, externalId: item.externalId, name: item.name, durationMinutes: item.durationMinutes })),
    professionals: connection.professionals.map((item) => ({ id: item.id, externalId: item.externalId, name: item.displayName })),
    warning: firstUsefulWarning,
  };
}

export async function book() {
  throw new Error("Direct booking is not supported for Vagaro. Send the Vagaro booking link instead.");
}
