-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT,
    "normalized" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "hours" TEXT,
    "services" TEXT,
    "serviceArea" TEXT,
    "contact" TEXT,
    "rawData" JSONB NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "researchModel" TEXT NOT NULL,
    "sourceUrls" JSONB,
    "accountStatus" TEXT NOT NULL DEFAULT 'unclaimed',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
    "subscriptionPlanId" INTEGER,
    "leadWebhookToken" TEXT,
    "leadWebhookEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "maxPhoneNumbers" INTEGER NOT NULL DEFAULT 1,
    "maxTransferTargets" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "outboundQualificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smartReviewsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "callTransfersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leadWebhookEnabled" BOOLEAN NOT NULL DEFAULT true,
    "messageInboxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "appointmentRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "allowCreditTopups" BOOLEAN NOT NULL DEFAULT true,
    "supportLevel" TEXT NOT NULL DEFAULT 'standard',
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "extraInstructions" TEXT NOT NULL DEFAULT '',
    "qualificationInstructions" TEXT NOT NULL DEFAULT 'You are an outbound lead qualification agent. Confirm you are speaking with the lead, ask if now is a good time, confirm what they need, urgency, location or service area, budget or price expectations when relevant, and whether they want an appointment or callback. Keep the call brief, professional, and honest.',
    "qualificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qualificationLaunchMode" TEXT NOT NULL DEFAULT 'approval',
    "qualificationDelayMinSeconds" INTEGER NOT NULL DEFAULT 30,
    "qualificationDelayMaxSeconds" INTEGER NOT NULL DEFAULT 100,
    "qualificationMaxAttempts" INTEGER NOT NULL DEFAULT 3,
    "qualificationRetryDelayMinutes" INTEGER NOT NULL DEFAULT 120,
    "leadWebhookDedupeWindowHours" INTEGER NOT NULL DEFAULT 24,
    "reviewRequestsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewLink" TEXT NOT NULL DEFAULT '',
    "reviewPromptInstructions" TEXT NOT NULL DEFAULT 'After a completed service or appointment, ask whether the customer is happy with the service. If they are happy, offer to text the review link. If they are not happy, apologize, collect the issue, and escalate it to management.',
    "reviewRequestTemplate" TEXT NOT NULL DEFAULT 'Thank you for choosing {{business_name}}. If you were happy with the service, please leave us a review: {{review_link}}',
    "complaintRecoveryInstructions" TEXT NOT NULL DEFAULT 'Apologize, collect what happened, ask what resolution they want, and tell the customer management will be notified.',
    "complaintEscalationTemplate" TEXT NOT NULL DEFAULT 'Complaint for {{business_name}}. Customer: {{customer_name}}. Phone: {{customer_phone}}. Issue: {{complaint}}',
    "managerNotificationPhone" TEXT NOT NULL DEFAULT '',
    "missedCallFollowupTemplate" TEXT NOT NULL DEFAULT 'Sorry we missed your call to {{business_name}}. Reply here and we will help.',
    "appointmentReminderTemplate" TEXT NOT NULL DEFAULT 'Reminder: you have an appointment with {{business_name}} on {{appointment_time}}. Reply if you need to reschedule.',
    "appointmentMode" TEXT NOT NULL DEFAULT 'instant',
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "calendarProvider" TEXT NOT NULL DEFAULT 'internal',
    "providerConfig" JSONB,
    "voiceName" TEXT NOT NULL DEFAULT 'Puck',
    "language" TEXT NOT NULL DEFAULT 'English',
    "agentName" TEXT NOT NULL DEFAULT 'Alex',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTransferTarget" (
    "id" SERIAL NOT NULL,
    "businessConfigId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTransferTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessReviewLink" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "reviewUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessReviewLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeField" (
    "id" SERIAL NOT NULL,
    "businessConfigId" INTEGER NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" SERIAL NOT NULL,
    "businessConfigId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceEntry" (
    "id" SERIAL NOT NULL,
    "businessConfigId" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'fixed',
    "amountMin" DOUBLE PRECISION,
    "amountMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" SERIAL NOT NULL,
    "businessConfigId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '17:00',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "requestedAt" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "timezone" TEXT,
    "intakeData" JSONB,
    "calendarProvider" TEXT NOT NULL DEFAULT 'internal',
    "bookingKey" TEXT,
    "externalId" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT,
    "businessProfileId" INTEGER,
    "voiceCallId" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "need" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'agent',
    "summary" TEXT,
    "transcript" TEXT,
    "notes" TEXT,
    "extractedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferMessage" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "urgency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "researchModel" TEXT NOT NULL DEFAULT 'gemini-3.1-pro-preview',
    "liveModel" TEXT NOT NULL DEFAULT 'models/gemini-3.1-flash-live-preview',
    "voiceName" TEXT NOT NULL DEFAULT 'Puck',
    "language" TEXT NOT NULL DEFAULT 'English',
    "agentName" TEXT NOT NULL DEFAULT 'Alex',
    "platformBusinessRules" TEXT NOT NULL DEFAULT 'Use only the language configured for the business agent. Do not switch languages automatically when the caller speaks another language. If the caller asks for another language, explain briefly in the configured language that the receptionist is set to use only that language unless the business changes settings.',
    "publicBaseUrl" TEXT NOT NULL DEFAULT '',
    "trialDays" INTEGER NOT NULL DEFAULT 7,
    "claimLinkDays" INTEGER NOT NULL DEFAULT 30,
    "trialCredits" INTEGER NOT NULL DEFAULT 900,
    "tokenUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "lowBalanceTokens" INTEGER NOT NULL DEFAULT 100,
    "voiceMinuteCredits" INTEGER NOT NULL DEFAULT 10,
    "geminiMinuteCredits" INTEGER NOT NULL DEFAULT 10,
    "outboundCallCredits" INTEGER NOT NULL DEFAULT 20,
    "messageCredits" INTEGER NOT NULL DEFAULT 5,
    "stripeCreditPackCredits" INTEGER NOT NULL DEFAULT 1000,
    "recordingRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "demoNumberCapacity" INTEGER NOT NULL DEFAULT 10,
    "demoCallerLimit" INTEGER NOT NULL DEFAULT 3,
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpFromEmail" TEXT NOT NULL DEFAULT '',
    "smtpFromName" TEXT NOT NULL DEFAULT 'RingPort',
    "onboardingLookupUrl" TEXT NOT NULL DEFAULT '',
    "onboardingVoiceName" TEXT NOT NULL DEFAULT 'Puck',
    "onboardingInstructions" TEXT NOT NULL DEFAULT 'You are the RingPort platform onboarding specialist. Collect the company name and website, text those details to the caller for confirmation, build the agent only after confirmation, and send the secure setup link when it is ready. Keep the call brief.',
    "onboardingRecordCalls" BOOLEAN NOT NULL DEFAULT false,
    "onboardingTranscription" BOOLEAN NOT NULL DEFAULT true,
    "messagePrimaryProvider" TEXT NOT NULL DEFAULT 'bluebubbles',
    "messageFailoverProvider" TEXT NOT NULL DEFAULT 'sentdm',
    "blueBubblesBaseUrl" TEXT NOT NULL DEFAULT '',
    "blueBubblesSendPath" TEXT NOT NULL DEFAULT '/api/v1/message/text',
    "sentDmTemplateId" TEXT NOT NULL DEFAULT '',
    "sentDmTemplateName" TEXT NOT NULL DEFAULT '',
    "sentDmProfileId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'business',
    "businessProfileId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSecret" (
    "id" SERIAL NOT NULL,
    "secretKey" TEXT NOT NULL,
    "encrypted" TEXT NOT NULL,
    "hint" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceNumber" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'telnyx',
    "providerNumberId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "numberType" TEXT NOT NULL DEFAULT 'regular',
    "label" TEXT,
    "connectionId" TEXT,
    "businessProfileId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FastAgentSession" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FastAgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountClaimToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT,
    "businessProfileId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoNumberAssignment" (
    "id" SERIAL NOT NULL,
    "voiceNumberId" INTEGER NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoNumberAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoCallerBinding" (
    "id" SERIAL NOT NULL,
    "demoNumberAssignmentId" INTEGER NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoCallerBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCall" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'telnyx',
    "callControlId" TEXT NOT NULL,
    "callSessionId" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "hangupCause" TEXT,
    "lastError" TEXT,
    "callMode" TEXT NOT NULL DEFAULT 'business',
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "healthFlags" JSONB,
    "metrics" JSONB,
    "businessProfileId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundQualificationCall" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "voiceCallId" INTEGER,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "resultStatus" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT NOT NULL,
    "summary" TEXT,
    "transcript" TEXT,
    "notes" TEXT,
    "extractedFields" JSONB,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundQualificationCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" SERIAL NOT NULL,
    "voiceCallId" INTEGER NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "campaignLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'started',
    "businessName" TEXT,
    "website" TEXT,
    "email" TEXT,
    "lookupData" JSONB,
    "businessProfileId" INTEGER,
    "personaSwitchedAt" TIMESTAMP(3),
    "claimLinkSentAt" TIMESTAMP(3),
    "messageProvider" TEXT,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "transcript" TEXT,
    "summary" TEXT,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDelivery" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "providerMessageId" TEXT,
    "detail" JSONB,
    "error" TEXT,
    "businessProfileId" INTEGER,
    "leadId" INTEGER,
    "voiceCallId" INTEGER,
    "appointmentId" INTEGER,
    "customerFeedbackId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageInbound" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'new-message',
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "chatGuid" TEXT,
    "providerMessageId" TEXT,
    "text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "purpose" TEXT,
    "raw" JSONB,
    "normalized" JSONB,
    "error" TEXT,
    "businessProfileId" INTEGER,
    "leadId" INTEGER,
    "voiceCallId" INTEGER,
    "appointmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageInbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedback" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "leadId" INTEGER,
    "voiceCallId" INTEGER,
    "appointmentId" INTEGER,
    "customerName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'unknown',
    "rating" INTEGER,
    "feedbackText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'captured',
    "reviewLink" TEXT,
    "reviewRequestedAt" TIMESTAMP(3),
    "complaintEscalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadWebhookEvent" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER,
    "leadId" INTEGER,
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "dedupeKey" TEXT,
    "normalized" JSONB,
    "payload" JSONB,
    "qualification" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "leadId" INTEGER,
    "voiceCallId" INTEGER,
    "messageDeliveryId" INTEGER,
    "category" TEXT NOT NULL,
    "provider" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'event',
    "credits" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "usageEventId" INTEGER,
    "creditBucketId" INTEGER,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditBucket" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "subscriptionPlanId" INTEGER,
    "sourceType" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "remainingCredits" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeCheckoutSession" (
    "id" SERIAL NOT NULL,
    "businessProfileId" INTEGER NOT NULL,
    "subscriptionPlanId" INTEGER,
    "stripeSessionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "creditAmount" INTEGER NOT NULL DEFAULT 0,
    "amountTotal" INTEGER,
    "currency" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "url" TEXT,
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeCheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" SERIAL NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallEvent" (
    "id" SERIAL NOT NULL,
    "voiceCallId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelnyxWebhookEvent" (
    "id" SERIAL NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelnyxWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_cacheKey_key" ON "BusinessProfile"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_leadWebhookToken_key" ON "BusinessProfile"("leadWebhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_active_sortOrder_idx" ON "SubscriptionPlan"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessConfig_businessProfileId_key" ON "BusinessConfig"("businessProfileId");

-- CreateIndex
CREATE INDEX "BusinessTransferTarget_businessConfigId_active_sortOrder_idx" ON "BusinessTransferTarget"("businessConfigId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "BusinessReviewLink_businessProfileId_active_sortOrder_idx" ON "BusinessReviewLink"("businessProfileId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeField_businessConfigId_fieldKey_key" ON "IntakeField"("businessConfigId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityRule_businessConfigId_dayOfWeek_key" ON "AvailabilityRule"("businessConfigId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bookingKey_key" ON "Appointment"("bookingKey");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_voiceCallId_key" ON "Lead"("voiceCallId");

-- CreateIndex
CREATE INDEX "Lead_businessProfileId_createdAt_idx" ON "Lead"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_phone_createdAt_idx" ON "Lead"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSecret_secretKey_key" ON "SystemSecret"("secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNumber_providerNumberId_key" ON "VoiceNumber"("providerNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNumber_phoneNumber_key" ON "VoiceNumber"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FastAgentSession_tokenHash_key" ON "FastAgentSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AccountClaimToken_tokenHash_key" ON "AccountClaimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountClaimToken_email_idx" ON "AccountClaimToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DemoNumberAssignment_businessProfileId_key" ON "DemoNumberAssignment"("businessProfileId");

-- CreateIndex
CREATE INDEX "DemoNumberAssignment_voiceNumberId_status_expiresAt_idx" ON "DemoNumberAssignment"("voiceNumberId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoCallerBinding_callerPhone_key" ON "DemoCallerBinding"("callerPhone");

-- CreateIndex
CREATE UNIQUE INDEX "DemoCallerBinding_demoNumberAssignmentId_callerPhone_key" ON "DemoCallerBinding"("demoNumberAssignmentId", "callerPhone");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCall_callControlId_key" ON "VoiceCall"("callControlId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundQualificationCall_voiceCallId_key" ON "OutboundQualificationCall"("voiceCallId");

-- CreateIndex
CREATE INDEX "OutboundQualificationCall_leadId_createdAt_idx" ON "OutboundQualificationCall"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundQualificationCall_status_createdAt_idx" ON "OutboundQualificationCall"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_voiceCallId_key" ON "OnboardingSession"("voiceCallId");

-- CreateIndex
CREATE INDEX "OnboardingSession_callerPhone_createdAt_idx" ON "OnboardingSession"("callerPhone", "createdAt");

-- CreateIndex
CREATE INDEX "OnboardingSession_campaignLabel_createdAt_idx" ON "OnboardingSession"("campaignLabel", "createdAt");

-- CreateIndex
CREATE INDEX "MessageDelivery_toPhone_createdAt_idx" ON "MessageDelivery"("toPhone", "createdAt");

-- CreateIndex
CREATE INDEX "MessageDelivery_businessProfileId_createdAt_idx" ON "MessageDelivery"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageDelivery_purpose_createdAt_idx" ON "MessageDelivery"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MessageDelivery_appointmentId_createdAt_idx" ON "MessageDelivery"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageInbound_fromPhone_createdAt_idx" ON "MessageInbound"("fromPhone", "createdAt");

-- CreateIndex
CREATE INDEX "MessageInbound_chatGuid_createdAt_idx" ON "MessageInbound"("chatGuid", "createdAt");

-- CreateIndex
CREATE INDEX "MessageInbound_businessProfileId_createdAt_idx" ON "MessageInbound"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageInbound_voiceCallId_createdAt_idx" ON "MessageInbound"("voiceCallId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageInbound_status_createdAt_idx" ON "MessageInbound"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageInbound_provider_providerMessageId_key" ON "MessageInbound"("provider", "providerMessageId");

-- CreateIndex
CREATE INDEX "CustomerFeedback_businessProfileId_createdAt_idx" ON "CustomerFeedback"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerFeedback_leadId_createdAt_idx" ON "CustomerFeedback"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerFeedback_status_createdAt_idx" ON "CustomerFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeadWebhookEvent_businessProfileId_createdAt_idx" ON "LeadWebhookEvent"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadWebhookEvent_dedupeKey_createdAt_idx" ON "LeadWebhookEvent"("dedupeKey", "createdAt");

-- CreateIndex
CREATE INDEX "LeadWebhookEvent_status_createdAt_idx" ON "LeadWebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_businessProfileId_createdAt_idx" ON "UsageEvent"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_category_createdAt_idx" ON "UsageEvent"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_usageEventId_key" ON "CreditTransaction"("usageEventId");

-- CreateIndex
CREATE INDEX "CreditTransaction_businessProfileId_createdAt_idx" ON "CreditTransaction"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_type_createdAt_idx" ON "CreditTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_creditBucketId_createdAt_idx" ON "CreditTransaction"("creditBucketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBucket_stripeInvoiceId_key" ON "CreditBucket"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBucket_stripeCheckoutSessionId_key" ON "CreditBucket"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "CreditBucket_businessProfileId_sourceType_expiresAt_idx" ON "CreditBucket"("businessProfileId", "sourceType", "expiresAt");

-- CreateIndex
CREATE INDEX "CreditBucket_businessProfileId_remainingCredits_idx" ON "CreditBucket"("businessProfileId", "remainingCredits");

-- CreateIndex
CREATE INDEX "CreditBucket_subscriptionPlanId_createdAt_idx" ON "CreditBucket"("subscriptionPlanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeCheckoutSession_stripeSessionId_key" ON "StripeCheckoutSession"("stripeSessionId");

-- CreateIndex
CREATE INDEX "StripeCheckoutSession_businessProfileId_createdAt_idx" ON "StripeCheckoutSession"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "StripeCheckoutSession_subscriptionPlanId_createdAt_idx" ON "StripeCheckoutSession"("subscriptionPlanId", "createdAt");

-- CreateIndex
CREATE INDEX "StripeCheckoutSession_status_createdAt_idx" ON "StripeCheckoutSession"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_eventType_createdAt_idx" ON "StripeWebhookEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelnyxWebhookEvent_webhookId_key" ON "TelnyxWebhookEvent"("webhookId");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConfig" ADD CONSTRAINT "BusinessConfig_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTransferTarget" ADD CONSTRAINT "BusinessTransferTarget_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReviewLink" ADD CONSTRAINT "BusinessReviewLink_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeField" ADD CONSTRAINT "IntakeField_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNumber" ADD CONSTRAINT "VoiceNumber_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FastAgentSession" ADD CONSTRAINT "FastAgentSession_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountClaimToken" ADD CONSTRAINT "AccountClaimToken_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoNumberAssignment" ADD CONSTRAINT "DemoNumberAssignment_voiceNumberId_fkey" FOREIGN KEY ("voiceNumberId") REFERENCES "VoiceNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoNumberAssignment" ADD CONSTRAINT "DemoNumberAssignment_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoCallerBinding" ADD CONSTRAINT "DemoCallerBinding_demoNumberAssignmentId_fkey" FOREIGN KEY ("demoNumberAssignmentId") REFERENCES "DemoNumberAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundQualificationCall" ADD CONSTRAINT "OutboundQualificationCall_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundQualificationCall" ADD CONSTRAINT "OutboundQualificationCall_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_customerFeedbackId_fkey" FOREIGN KEY ("customerFeedbackId") REFERENCES "CustomerFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInbound" ADD CONSTRAINT "MessageInbound_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInbound" ADD CONSTRAINT "MessageInbound_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInbound" ADD CONSTRAINT "MessageInbound_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInbound" ADD CONSTRAINT "MessageInbound_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadWebhookEvent" ADD CONSTRAINT "LeadWebhookEvent_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadWebhookEvent" ADD CONSTRAINT "LeadWebhookEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_messageDeliveryId_fkey" FOREIGN KEY ("messageDeliveryId") REFERENCES "MessageDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_usageEventId_fkey" FOREIGN KEY ("usageEventId") REFERENCES "UsageEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_creditBucketId_fkey" FOREIGN KEY ("creditBucketId") REFERENCES "CreditBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditBucket" ADD CONSTRAINT "CreditBucket_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditBucket" ADD CONSTRAINT "CreditBucket_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeCheckoutSession" ADD CONSTRAINT "StripeCheckoutSession_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeCheckoutSession" ADD CONSTRAINT "StripeCheckoutSession_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallEvent" ADD CONSTRAINT "VoiceCallEvent_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

