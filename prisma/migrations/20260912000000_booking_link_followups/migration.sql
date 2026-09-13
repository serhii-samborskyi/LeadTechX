-- AlterTable
ALTER TABLE "BusinessConfig"
ADD COLUMN "bookingFollowupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "bookingFollowupMatchWindowHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN "bookingFollowupNotClickedDelayMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "bookingFollowupClickedDelayMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "bookingFollowupFinalDelayMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN "bookingFollowupNotClickedTemplate" TEXT NOT NULL DEFAULT 'Hi {{customer_name}}, here is the booking link for {{business_name}}: {{booking_link}}',
ADD COLUMN "bookingFollowupClickedTemplate" TEXT NOT NULL DEFAULT 'Hi {{customer_name}}, were you able to find a time that works? You can book here: {{booking_link}}',
ADD COLUMN "bookingFollowupFinalTemplate" TEXT NOT NULL DEFAULT 'Just checking in from {{business_name}}. You can still book here: {{booking_link}}';

-- AlterTable
ALTER TABLE "BookingAppointment"
ADD COLUMN "leadId" INTEGER;

-- CreateTable
CREATE TABLE "BookingLinkSend" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "leadId" INTEGER,
  "voiceCallId" INTEGER,
  "bookingLinkId" INTEGER NOT NULL,
  "bookingAppointmentId" INTEGER,
  "matchedAppointmentId" INTEGER,
  "clickToken" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "customerName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "serviceText" TEXT,
  "professionalText" TEXT,
  "requestedTime" TEXT,
  "destinationUrl" TEXT,
  "trackedUrl" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstClickedAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "bookedAt" TIMESTAMP(3),
  "followupState" TEXT NOT NULL DEFAULT 'active',
  "nextFollowupAt" TIMESTAMP(3),
  "lastFollowupStep" TEXT,
  "followupAttempts" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingLinkSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingLinkClick" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "bookingLinkId" INTEGER NOT NULL,
  "bookingLinkSendId" INTEGER,
  "leadId" INTEGER,
  "phone" TEXT,
  "clickToken" TEXT,
  "sourceUrl" TEXT,
  "referrer" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "queryParams" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingLinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingLinkSend_bookingAppointmentId_key" ON "BookingLinkSend"("bookingAppointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLinkSend_clickToken_key" ON "BookingLinkSend"("clickToken");

-- CreateIndex
CREATE INDEX "BookingLinkSend_businessProfileId_status_sentAt_idx" ON "BookingLinkSend"("businessProfileId", "status", "sentAt");

-- CreateIndex
CREATE INDEX "BookingLinkSend_leadId_sentAt_idx" ON "BookingLinkSend"("leadId", "sentAt");

-- CreateIndex
CREATE INDEX "BookingLinkSend_phone_sentAt_idx" ON "BookingLinkSend"("phone", "sentAt");

-- CreateIndex
CREATE INDEX "BookingLinkSend_nextFollowupAt_followupState_idx" ON "BookingLinkSend"("nextFollowupAt", "followupState");

-- CreateIndex
CREATE INDEX "BookingLinkSend_matchedAppointmentId_idx" ON "BookingLinkSend"("matchedAppointmentId");

-- CreateIndex
CREATE INDEX "BookingLinkClick_businessProfileId_createdAt_idx" ON "BookingLinkClick"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingLinkClick_leadId_createdAt_idx" ON "BookingLinkClick"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingLinkClick_bookingLinkSendId_createdAt_idx" ON "BookingLinkClick"("bookingLinkSendId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingLinkClick_phone_createdAt_idx" ON "BookingLinkClick"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "BookingAppointment_leadId_createdAt_idx" ON "BookingAppointment"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "BookingAppointment" ADD CONSTRAINT "BookingAppointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkSend" ADD CONSTRAINT "BookingLinkSend_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkSend" ADD CONSTRAINT "BookingLinkSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkSend" ADD CONSTRAINT "BookingLinkSend_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkSend" ADD CONSTRAINT "BookingLinkSend_bookingLinkId_fkey" FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkSend" ADD CONSTRAINT "BookingLinkSend_bookingAppointmentId_fkey" FOREIGN KEY ("bookingAppointmentId") REFERENCES "BookingAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkSend" ADD CONSTRAINT "BookingLinkSend_matchedAppointmentId_fkey" FOREIGN KEY ("matchedAppointmentId") REFERENCES "BookingAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkClick" ADD CONSTRAINT "BookingLinkClick_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkClick" ADD CONSTRAINT "BookingLinkClick_bookingLinkId_fkey" FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkClick" ADD CONSTRAINT "BookingLinkClick_bookingLinkSendId_fkey" FOREIGN KEY ("bookingLinkSendId") REFERENCES "BookingLinkSend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkClick" ADD CONSTRAINT "BookingLinkClick_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
