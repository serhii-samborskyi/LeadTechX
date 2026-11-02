ALTER TABLE "BookingConnection" ADD COLUMN "refreshTokenEncrypted" TEXT;

ALTER TABLE "AppSettings"
  ADD COLUMN "googleCalendarClientId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "calendlyClientId" TEXT NOT NULL DEFAULT '';

CREATE TABLE "BookingOAuthSession" (
  "id" SERIAL NOT NULL,
  "stateHash" TEXT NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "codeVerifierEncrypted" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingOAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingOAuthSession_stateHash_key" ON "BookingOAuthSession"("stateHash");
CREATE INDEX "BookingOAuthSession_businessProfileId_provider_expiresAt_idx" ON "BookingOAuthSession"("businessProfileId", "provider", "expiresAt");
CREATE INDEX "BookingOAuthSession_userId_expiresAt_idx" ON "BookingOAuthSession"("userId", "expiresAt");

CREATE TABLE "ReceptionistGoal" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "actionType" TEXT NOT NULL DEFAULT 'send_link',
  "description" TEXT NOT NULL DEFAULT '',
  "triggerInstructions" TEXT NOT NULL DEFAULT '',
  "qualificationInstructions" TEXT NOT NULL DEFAULT '',
  "destinationUrl" TEXT,
  "deliveryMethod" TEXT NOT NULL DEFAULT 'sms',
  "messageTemplate" TEXT NOT NULL DEFAULT 'Here is the {{goal_name}} link from {{business_name}}: {{goal_link}}',
  "confirmationMessage" TEXT NOT NULL DEFAULT 'I sent the link. Please open it to continue.',
  "primaryGoal" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "clickToken" TEXT NOT NULL,
  "shortCode" TEXT,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "conversionCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "lastConvertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceptionistGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceptionistGoal_clickToken_key" ON "ReceptionistGoal"("clickToken");
CREATE UNIQUE INDEX "ReceptionistGoal_shortCode_key" ON "ReceptionistGoal"("shortCode");
CREATE INDEX "ReceptionistGoal_businessProfileId_active_primaryGoal_sortOrder_idx" ON "ReceptionistGoal"("businessProfileId", "active", "primaryGoal", "sortOrder");

CREATE TABLE "GoalLinkSend" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "goalId" INTEGER NOT NULL,
  "leadId" INTEGER,
  "voiceCallId" INTEGER,
  "clickToken" TEXT NOT NULL,
  "shortCode" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'sms',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "customerName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "destinationUrl" TEXT NOT NULL,
  "trackedUrl" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "firstClickedAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "convertedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoalLinkSend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoalLinkSend_clickToken_key" ON "GoalLinkSend"("clickToken");
CREATE UNIQUE INDEX "GoalLinkSend_shortCode_key" ON "GoalLinkSend"("shortCode");
CREATE INDEX "GoalLinkSend_businessProfileId_status_sentAt_idx" ON "GoalLinkSend"("businessProfileId", "status", "sentAt");
CREATE INDEX "GoalLinkSend_goalId_sentAt_idx" ON "GoalLinkSend"("goalId", "sentAt");
CREATE INDEX "GoalLinkSend_leadId_sentAt_idx" ON "GoalLinkSend"("leadId", "sentAt");
CREATE INDEX "GoalLinkSend_voiceCallId_sentAt_idx" ON "GoalLinkSend"("voiceCallId", "sentAt");

CREATE TABLE "GoalLinkClick" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "goalId" INTEGER NOT NULL,
  "goalLinkSendId" INTEGER,
  "leadId" INTEGER,
  "clickToken" TEXT,
  "sourceUrl" TEXT,
  "referrer" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "queryParams" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoalLinkClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoalLinkClick_businessProfileId_createdAt_idx" ON "GoalLinkClick"("businessProfileId", "createdAt");
CREATE INDEX "GoalLinkClick_goalId_createdAt_idx" ON "GoalLinkClick"("goalId", "createdAt");
CREATE INDEX "GoalLinkClick_goalLinkSendId_createdAt_idx" ON "GoalLinkClick"("goalLinkSendId", "createdAt");
CREATE INDEX "GoalLinkClick_leadId_createdAt_idx" ON "GoalLinkClick"("leadId", "createdAt");

ALTER TABLE "BookingOAuthSession" ADD CONSTRAINT "BookingOAuthSession_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceptionistGoal" ADD CONSTRAINT "ReceptionistGoal_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalLinkSend" ADD CONSTRAINT "GoalLinkSend_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalLinkSend" ADD CONSTRAINT "GoalLinkSend_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "ReceptionistGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalLinkSend" ADD CONSTRAINT "GoalLinkSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalLinkSend" ADD CONSTRAINT "GoalLinkSend_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalLinkClick" ADD CONSTRAINT "GoalLinkClick_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalLinkClick" ADD CONSTRAINT "GoalLinkClick_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "ReceptionistGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalLinkClick" ADD CONSTRAINT "GoalLinkClick_goalLinkSendId_fkey" FOREIGN KEY ("goalLinkSendId") REFERENCES "GoalLinkSend"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalLinkClick" ADD CONSTRAINT "GoalLinkClick_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
