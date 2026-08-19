-- CreateTable
CREATE TABLE "BookingConnection" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "workflowMode" TEXT NOT NULL DEFAULT 'booking_link',
  "displayName" TEXT,
  "externalBusinessId" TEXT,
  "externalGroupId" TEXT,
  "externalLocationId" TEXT,
  "region" TEXT NOT NULL DEFAULT 'us02',
  "bookingUrl" TEXT,
  "cancelRescheduleUrl" TEXT,
  "settings" JSONB,
  "apiClientId" TEXT,
  "apiClientSecretEncrypted" TEXT,
  "apiClientSecretHint" TEXT,
  "accessTokenEncrypted" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "webhookSecretEncrypted" TEXT,
  "webhookSecretHint" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "durationMinutes" INTEGER,
  "price" DOUBLE PRECISION,
  "currency" TEXT,
  "type" TEXT NOT NULL DEFAULT 'service',
  "bookingUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingProfessional" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "onlineBookingActive" BOOLEAN NOT NULL DEFAULT true,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingProfessional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingProfessionalService" (
  "id" SERIAL NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "serviceId" INTEGER NOT NULL,
  "durationMinutes" INTEGER,
  "price" DOUBLE PRECISION,
  "currency" TEXT,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingProfessionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAppointment" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT,
  "calendarEventId" TEXT,
  "customerExternalId" TEXT,
  "customerName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "serviceId" INTEGER,
  "serviceExternalId" TEXT,
  "serviceTitle" TEXT,
  "serviceCategory" TEXT,
  "professionalId" INTEGER,
  "professionalExternalId" TEXT,
  "professionalName" TEXT,
  "bookingStatus" TEXT,
  "status" TEXT NOT NULL DEFAULT 'external',
  "source" TEXT,
  "amount" DOUBLE PRECISION,
  "currency" TEXT,
  "scheduledStart" TIMESTAMP(3),
  "scheduledEnd" TIMESTAMP(3),
  "timezone" TEXT,
  "bookingUrl" TEXT,
  "manageUrl" TEXT,
  "notes" TEXT,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingLink" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "serviceId" INTEGER,
  "serviceExternalId" TEXT,
  "professionalId" INTEGER,
  "professionalExternalId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "clickToken" TEXT NOT NULL,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "lastClickedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingWebhookEvent" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER,
  "connectionId" INTEGER,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT,
  "action" TEXT,
  "externalBusinessId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'received',
  "payload" JSONB,
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "BookingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingConnection_businessProfileId_provider_key" ON "BookingConnection"("businessProfileId", "provider");

-- CreateIndex
CREATE INDEX "BookingConnection_provider_status_idx" ON "BookingConnection"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingService_connectionId_externalId_key" ON "BookingService"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "BookingService_businessProfileId_active_sortOrder_idx" ON "BookingService"("businessProfileId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "BookingService_provider_externalId_idx" ON "BookingService"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingProfessional_connectionId_externalId_key" ON "BookingProfessional"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "BookingProfessional_businessProfileId_active_displayName_idx" ON "BookingProfessional"("businessProfileId", "active", "displayName");

-- CreateIndex
CREATE INDEX "BookingProfessional_provider_externalId_idx" ON "BookingProfessional"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingProfessionalService_professionalId_serviceId_key" ON "BookingProfessionalService"("professionalId", "serviceId");

-- CreateIndex
CREATE INDEX "BookingProfessionalService_serviceId_idx" ON "BookingProfessionalService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAppointment_connectionId_externalId_key" ON "BookingAppointment"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "BookingAppointment_businessProfileId_scheduledStart_idx" ON "BookingAppointment"("businessProfileId", "scheduledStart");

-- CreateIndex
CREATE INDEX "BookingAppointment_businessProfileId_status_scheduledStart_idx" ON "BookingAppointment"("businessProfileId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "BookingAppointment_provider_externalId_idx" ON "BookingAppointment"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLink_clickToken_key" ON "BookingLink"("clickToken");

-- CreateIndex
CREATE INDEX "BookingLink_businessProfileId_active_sortOrder_idx" ON "BookingLink"("businessProfileId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "BookingLink_connectionId_active_idx" ON "BookingLink"("connectionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BookingWebhookEvent_provider_eventId_key" ON "BookingWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "BookingWebhookEvent_businessProfileId_receivedAt_idx" ON "BookingWebhookEvent"("businessProfileId", "receivedAt");

-- CreateIndex
CREATE INDEX "BookingWebhookEvent_provider_status_receivedAt_idx" ON "BookingWebhookEvent"("provider", "status", "receivedAt");

-- AddForeignKey
ALTER TABLE "BookingConnection" ADD CONSTRAINT "BookingConnection_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BookingConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProfessional" ADD CONSTRAINT "BookingProfessional_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProfessional" ADD CONSTRAINT "BookingProfessional_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BookingConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProfessionalService" ADD CONSTRAINT "BookingProfessionalService_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "BookingProfessional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProfessionalService" ADD CONSTRAINT "BookingProfessionalService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "BookingService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAppointment" ADD CONSTRAINT "BookingAppointment_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAppointment" ADD CONSTRAINT "BookingAppointment_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BookingConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAppointment" ADD CONSTRAINT "BookingAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "BookingService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAppointment" ADD CONSTRAINT "BookingAppointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "BookingProfessional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BookingConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "BookingService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "BookingProfessional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWebhookEvent" ADD CONSTRAINT "BookingWebhookEvent_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWebhookEvent" ADD CONSTRAINT "BookingWebhookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BookingConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
