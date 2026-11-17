import { DateTime } from "luxon";

const PROVIDER = "custom";

function safeZone(value) {
  const zone = String(value || "America/Chicago");
  return DateTime.now().setZone(zone).isValid ? zone : "America/Chicago";
}

function mapBookingRequest(appointment) {
  return {
    id: `external-${appointment.id}`,
    externalRecordId: appointment.id,
    businessProfileId: appointment.businessProfileId,
    calendarProvider: PROVIDER,
    customerName: appointment.customerName || "Customer",
    phone: appointment.phone,
    email: appointment.email,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    timezone: appointment.timezone,
    reason: appointment.serviceTitle || appointment.notes || "Custom booking link sent",
    status: appointment.status || "booking_link_sent",
    bookingUrl: appointment.bookingUrl,
    manageUrl: appointment.manageUrl,
    intakeData: {
      provider: PROVIDER,
      source: appointment.source,
      bookingLinkSent: true,
    },
  };
}

export async function listSlots({ prisma, profile, config, fromDate, days = 14 }) {
  const zone = safeZone(config.timezone);
  const firstDay = DateTime.fromISO(String(fromDate || DateTime.now().setZone(zone).toISODate()), { zone }).startOf("day");
  if (!firstDay.isValid) throw new Error("Invalid start date");
  const rangeEnd = firstDay.plus({ days: Math.min(60, Math.max(1, Number(days || 14))) });
  const appointments = await prisma.bookingAppointment.findMany({
    where: {
      businessProfileId: profile.id,
      provider: PROVIDER,
      createdAt: { gte: firstDay.toUTC().toJSDate(), lt: rangeEnd.toUTC().toJSDate() },
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    slots: [],
    appointments: appointments.map(mapBookingRequest),
    timezone: zone,
    provider: PROVIDER,
    workflowMode: "booking_link",
    warning: "Live availability stays on the business booking website. RingPort sends the tracked booking link instead.",
  };
}

export async function book() {
  throw new Error("This business uses a custom booking website. Send the tracked booking link instead.");
}
