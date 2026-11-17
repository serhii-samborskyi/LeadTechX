ALTER TABLE "OnboardingSession"
  ADD COLUMN "intakeData" JSONB,
  ADD COLUMN "textConsentAt" TIMESTAMP(3),
  ADD COLUMN "textConsentSource" TEXT,
  ADD COLUMN "deliveryPreference" TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN "buildAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "buildQueuedAt" TIMESTAMP(3),
  ADD COLUMN "buildStartedAt" TIMESTAMP(3),
  ADD COLUMN "buildCompletedAt" TIMESTAMP(3),
  ADD COLUMN "buildNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "claimLinkTokenHash" TEXT,
  ADD COLUMN "claimLinkShortCode" TEXT,
  ADD COLUMN "claimLinkExpiresAt" TIMESTAMP(3),
  ADD COLUMN "claimLinkTextSentAt" TIMESTAMP(3),
  ADD COLUMN "claimLinkEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "claimLinkFirstClickedAt" TIMESTAMP(3),
  ADD COLUMN "claimLinkLastClickedAt" TIMESTAMP(3),
  ADD COLUMN "claimLinkClickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "claimLinkReminderCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "claimLinkNextReminderAt" TIMESTAMP(3),
  ADD COLUMN "claimedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "OnboardingSession_claimLinkTokenHash_key"
  ON "OnboardingSession"("claimLinkTokenHash");

CREATE UNIQUE INDEX "OnboardingSession_claimLinkShortCode_key"
  ON "OnboardingSession"("claimLinkShortCode");

CREATE INDEX "OnboardingSession_status_buildNextAttemptAt_idx"
  ON "OnboardingSession"("status", "buildNextAttemptAt");

CREATE INDEX "OnboardingSession_claimLinkNextReminderAt_idx"
  ON "OnboardingSession"("claimLinkNextReminderAt");

CREATE TABLE "OnboardingLinkClick" (
  "id" SERIAL NOT NULL,
  "onboardingSessionId" INTEGER NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'unknown',
  "referrer" TEXT,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OnboardingLinkClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnboardingLinkClick_onboardingSessionId_createdAt_idx"
  ON "OnboardingLinkClick"("onboardingSessionId", "createdAt");

ALTER TABLE "OnboardingLinkClick"
  ADD CONSTRAINT "OnboardingLinkClick_onboardingSessionId_fkey"
  FOREIGN KEY ("onboardingSessionId") REFERENCES "OnboardingSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppSettings"
  ALTER COLUMN "onboardingInstructions" SET DEFAULT 'You are the RingPort phone onboarding specialist. Collect the minimum business details needed for a useful receptionist draft. A website is optional. Ask permission before texting; use email when the caller cannot receive texts. Confirm the captured details, queue the background build, explain that the secure setup link will arrive when ready, and end the call promptly.';

UPDATE "AppSettings"
SET "onboardingInstructions" = 'You are the RingPort phone onboarding specialist. Collect the minimum business details needed for a useful receptionist draft. A website is optional. Ask permission before texting; use email when the caller cannot receive texts. Confirm the captured details, queue the background build, explain that the secure setup link will arrive when ready, and end the call promptly.'
WHERE "onboardingInstructions" = 'You are the RingPort platform onboarding specialist. Collect the company name and website, text those details to the caller for confirmation, build the agent only after confirmation, and send the secure setup link when it is ready. Keep the call brief.';
