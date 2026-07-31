-- AlterTable
ALTER TABLE "AppSettings"
  ADD COLUMN "metaPixelId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "metaTestEventCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tiktokPixelId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "adEventConfig" JSONB;

-- CreateTable
CREATE TABLE "AdPlatformEvent" (
  "id" SERIAL NOT NULL,
  "platform" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'server',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "httpStatus" INTEGER,
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdPlatformEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdPlatformEvent_platform_eventId_key" ON "AdPlatformEvent"("platform", "eventId");

-- CreateIndex
CREATE INDEX "AdPlatformEvent_eventKey_platform_createdAt_idx" ON "AdPlatformEvent"("eventKey", "platform", "createdAt");
