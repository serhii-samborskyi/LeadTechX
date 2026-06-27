export function appointmentConfirmationCode(id) {
  return `APT-${String(id).padStart(6, "0")}`;
}

export async function verifyCalendarAppointment({ prisma, profile, confirmationCode }) {
  const numericId = Number(String(confirmationCode || "").match(/\d+/)?.[0]);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, verified: false, booked: false, error: "Invalid confirmation code" };
  }
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: numericId,
      businessName: profile.businessName,
      website: profile.website,
    },
  });
  if (!appointment) {
    return {
      ok: false,
      verified: false,
      booked: false,
      confirmationCode: String(confirmationCode),
      error: "No matching appointment exists in the calendar database",
    };
  }
  return {
    ok: true,
    verified: true,
    booked: appointment.status === "confirmed",
    confirmationCode: appointmentConfirmationCode(appointment.id),
    status: appointment.status,
    customerName: appointment.customerName,
    start: appointment.scheduledStart,
    end: appointment.scheduledEnd,
    timezone: appointment.timezone,
  };
}

export async function backfillAppointmentBookingKeys({ prisma }) {
  const appointments = (await prisma.appointment.findMany()).filter(
    (appointment) => !appointment.bookingKey && appointment.scheduledStart,
  );
  let updated = 0;
  for (const appointment of appointments) {
    const profile = await prisma.businessProfile.findFirst({
      where: { businessName: appointment.businessName, website: appointment.website },
    });
    if (!profile) continue;
    const start = new Date(appointment.scheduledStart).toISOString();
    try {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { bookingKey: `${profile.cacheKey}:${start}` },
      });
      updated += 1;
    } catch (error) {
      console.error(`[calendar] Could not backfill booking key for appointment ${appointment.id}: ${error.message}`);
    }
  }
  return { scanned: appointments.length, updated };
}
