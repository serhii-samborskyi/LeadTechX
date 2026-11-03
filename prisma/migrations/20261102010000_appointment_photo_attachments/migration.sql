CREATE TABLE "AppointmentAttachment" (
  "id" SERIAL NOT NULL,
  "appointmentId" INTEGER NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentAttachment_appointmentId_createdAt_idx" ON "AppointmentAttachment"("appointmentId", "createdAt");

ALTER TABLE "AppointmentAttachment"
  ADD CONSTRAINT "AppointmentAttachment_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
