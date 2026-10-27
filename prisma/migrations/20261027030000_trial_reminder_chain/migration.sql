ALTER TABLE "AppSettings"
ADD COLUMN "trialReminderSteps" JSONB;

CREATE TABLE "TrialReminderDelivery" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "stepKey" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "emailStatus" TEXT NOT NULL DEFAULT 'skipped',
    "textStatus" TEXT NOT NULL DEFAULT 'skipped',
    "emailDeliveryId" INTEGER,
    "textDeliveryId" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrialReminderDelivery_businessProfileId_trialEndsAt_stepKey_key"
ON "TrialReminderDelivery"("businessProfileId", "trialEndsAt", "stepKey");

CREATE INDEX "TrialReminderDelivery_status_scheduledAt_idx"
ON "TrialReminderDelivery"("status", "scheduledAt");

CREATE INDEX "TrialReminderDelivery_businessProfileId_createdAt_idx"
ON "TrialReminderDelivery"("businessProfileId", "createdAt");

ALTER TABLE "TrialReminderDelivery"
ADD CONSTRAINT "TrialReminderDelivery_businessProfileId_fkey"
FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
