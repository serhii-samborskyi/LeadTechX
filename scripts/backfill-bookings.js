import { PrismaClient } from "@prisma/client";

import { backfillAppointmentBookingKeys } from "../calendar/verification.js";

const prisma = new PrismaClient();
try {
  const result = await backfillAppointmentBookingKeys({ prisma });
  console.log(`Booking key backfill complete: ${result.updated}/${result.scanned} updated.`);
} finally {
  await prisma.$disconnect();
}
