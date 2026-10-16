ALTER TABLE "BusinessConfig"
  ADD COLUMN "appointmentNotificationTextEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appointmentNotificationEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appointmentNotificationPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "appointmentNotificationEmail" TEXT NOT NULL DEFAULT '';
