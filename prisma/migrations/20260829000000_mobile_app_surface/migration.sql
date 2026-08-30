CREATE TABLE "EmailVerificationCode" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'mobile_claim',
  "businessProfileId" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailVerificationCode_email_purpose_createdAt_idx" ON "EmailVerificationCode"("email", "purpose", "createdAt");
CREATE INDEX "EmailVerificationCode_businessProfileId_purpose_idx" ON "EmailVerificationCode"("businessProfileId", "purpose");

CREATE TABLE "MobileDeviceVoiceQuota" (
  "id" SERIAL NOT NULL,
  "deviceHash" TEXT NOT NULL,
  "anonymousVoiceSeconds" INTEGER NOT NULL DEFAULT 0,
  "lastSessionStartedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobileDeviceVoiceQuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileDeviceVoiceQuota_deviceHash_key" ON "MobileDeviceVoiceQuota"("deviceHash");

CREATE TABLE "MobilePushSubscription" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER,
  "businessProfileId" INTEGER,
  "deviceHash" TEXT,
  "oneSignalId" TEXT,
  "subscriptionId" TEXT,
  "externalId" TEXT,
  "platform" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "tags" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobilePushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobilePushSubscription_oneSignalId_key" ON "MobilePushSubscription"("oneSignalId");
CREATE INDEX "MobilePushSubscription_userId_enabled_idx" ON "MobilePushSubscription"("userId", "enabled");
CREATE INDEX "MobilePushSubscription_businessProfileId_enabled_idx" ON "MobilePushSubscription"("businessProfileId", "enabled");
CREATE INDEX "MobilePushSubscription_deviceHash_idx" ON "MobilePushSubscription"("deviceHash");
