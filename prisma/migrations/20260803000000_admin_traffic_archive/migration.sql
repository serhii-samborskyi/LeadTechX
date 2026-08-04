-- AlterTable
ALTER TABLE "BusinessProfile"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrafficEvent" (
  "id" SERIAL NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'browser',
  "sourceUrl" TEXT,
  "referrer" TEXT,
  "platform" TEXT,
  "landingPath" TEXT,
  "queryParams" JSONB,
  "trackingTags" JSONB,
  "customData" JSONB,
  "businessProfileId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrafficEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrafficEvent_eventId_key" ON "TrafficEvent"("eventId");

-- CreateIndex
CREATE INDEX "TrafficEvent_eventKey_createdAt_idx" ON "TrafficEvent"("eventKey", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficEvent_businessProfileId_createdAt_idx" ON "TrafficEvent"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficEvent_platform_createdAt_idx" ON "TrafficEvent"("platform", "createdAt");

-- AddForeignKey
ALTER TABLE "TrafficEvent" ADD CONSTRAINT "TrafficEvent_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
