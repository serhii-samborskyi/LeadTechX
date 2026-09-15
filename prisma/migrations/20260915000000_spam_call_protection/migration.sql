ALTER TABLE "BusinessConfig"
ADD COLUMN "spamProtectionEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "spamBlockUnknownCallers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "spamMaxCallsPerPhonePerHour" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "spamShortCallThresholdSeconds" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "spamMaxShortCallsPerPhonePerDay" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "spamBlockedNumbers" TEXT NOT NULL DEFAULT '';
