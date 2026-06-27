import { PrismaClient } from "@prisma/client";

import { bookCalendarAppointment, listCalendarSlots } from "../calendar/index.js";
import { appointmentConfirmationCode, verifyCalendarAppointment } from "../calendar/verification.js";

const prisma = new PrismaClient();
let testAppointmentId = null;

try {
  const profile = await prisma.businessProfile.findFirst({
    where: {
      businessName: process.env.TEST_BUSINESS || "Chicago Locksmiths",
      config: { isNot: null },
    },
  });
  if (!profile) throw new Error("Test business profile not found");

  const config = await prisma.businessConfig.findUnique({
    where: { businessProfileId: profile.id },
    include: {
      intakeFields: { orderBy: { sortOrder: "asc" } },
      availabilityRules: { orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!config) throw new Error("Test business configuration not found");

  const availability = await listCalendarSlots({ prisma, profile, config, days: 30 });
  const slot = availability.slots[0];
  if (!slot) throw new Error("No free appointment slot found for the test");

  const appointment = await bookCalendarAppointment({
    prisma,
    profile,
    config,
    start: slot.start,
    customer: { name: "Booking Stack Test", phone: "555-0100", email: "booking-test@example.com" },
    intakeData: { name: "Booking Stack Test", phone: "555-0100", reason: "Automated verification" },
    reason: "Automated verification",
  });
  testAppointmentId = appointment.id;
  const confirmationCode = appointmentConfirmationCode(appointment.id);
  const verification = await verifyCalendarAppointment({ prisma, profile, confirmationCode });
  if (!verification.verified) throw new Error("Persisted appointment did not verify");

  let duplicateRejected = false;
  try {
    await bookCalendarAppointment({
      prisma,
      profile,
      config,
      start: slot.start,
      customer: { name: "Duplicate Test" },
      intakeData: {},
      reason: "Duplicate test",
    });
  } catch {
    duplicateRejected = true;
  }
  if (!duplicateRejected) throw new Error("Duplicate booking was not rejected");

  console.log(
    JSON.stringify({
      ok: true,
      confirmationCode,
      status: verification.status,
      verified: verification.verified,
      booked: verification.booked,
      duplicateRejected,
    }),
  );
} finally {
  if (testAppointmentId) {
    await prisma.appointment.delete({ where: { id: testAppointmentId } }).catch(() => {});
  }
  await prisma.$disconnect();
}
