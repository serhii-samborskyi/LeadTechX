PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "BusinessProfile" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProfile_cacheKey_key" ON "BusinessProfile"("cacheKey");

CREATE TABLE IF NOT EXISTS "BusinessConfig" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessProfileId" INTEGER NOT NULL,
  "extraInstructions" TEXT NOT NULL DEFAULT '',
  "appointmentMode" TEXT NOT NULL DEFAULT 'instant',
  "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "calendarProvider" TEXT NOT NULL DEFAULT 'internal',
  "providerConfig" JSONB,
  "voiceName" TEXT NOT NULL DEFAULT 'Puck',
  "language" TEXT NOT NULL DEFAULT 'English',
  "agentName" TEXT NOT NULL DEFAULT 'Alex',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "BusinessConfig_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessConfig_businessProfileId_key" ON "BusinessConfig"("businessProfileId");

CREATE TABLE IF NOT EXISTS "IntakeField" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessConfigId" INTEGER NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" TEXT NOT NULL DEFAULT 'text',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "IntakeField_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeField_businessConfigId_fieldKey_key" ON "IntakeField"("businessConfigId", "fieldKey");

CREATE TABLE IF NOT EXISTS "KnowledgeEntry" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessConfigId" INTEGER NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "category" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "KnowledgeEntry_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PriceEntry" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessConfigId" INTEGER NOT NULL,
  "item" TEXT NOT NULL,
  "description" TEXT,
  "priceType" TEXT NOT NULL DEFAULT 'fixed',
  "amountMin" REAL,
  "amountMax" REAL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "category" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PriceEntry_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AvailabilityRule" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessConfigId" INTEGER NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL DEFAULT '09:00',
  "endTime" TEXT NOT NULL DEFAULT '17:00',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "AvailabilityRule_businessConfigId_fkey" FOREIGN KEY ("businessConfigId") REFERENCES "BusinessConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityRule_businessConfigId_dayOfWeek_key" ON "AvailabilityRule"("businessConfigId", "dayOfWeek");

CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessName" TEXT NOT NULL,
  "website" TEXT,
  "customerName" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "requestedAt" TEXT NOT NULL,
  "scheduledStart" DATETIME,
  "scheduledEnd" DATETIME,
  "durationMinutes" INTEGER,
  "timezone" TEXT,
  "intakeData" JSONB,
  "calendarProvider" TEXT NOT NULL DEFAULT 'internal',
  "bookingKey" TEXT,
  "externalId" TEXT,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_bookingKey_key" ON "Appointment"("bookingKey");

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessName" TEXT NOT NULL,
  "website" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "need" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TransferMessage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "businessName" TEXT NOT NULL,
  "website" TEXT,
  "name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "message" TEXT NOT NULL,
  "urgency" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AppSettings" (
  "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  "researchModel" TEXT NOT NULL DEFAULT 'gemini-3.1-pro-preview',
  "liveModel" TEXT NOT NULL DEFAULT 'models/gemini-3.1-flash-live-preview',
  "voiceName" TEXT NOT NULL DEFAULT 'Puck',
  "language" TEXT NOT NULL DEFAULT 'English',
  "agentName" TEXT NOT NULL DEFAULT 'Alex',
  "publicBaseUrl" TEXT NOT NULL DEFAULT '',
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'business',
  "businessProfileId" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "User_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tokenHash" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");

CREATE TABLE IF NOT EXISTS "SystemSecret" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "secretKey" TEXT NOT NULL,
  "encrypted" TEXT NOT NULL,
  "hint" TEXT,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSecret_secretKey_key" ON "SystemSecret"("secretKey");

CREATE TABLE IF NOT EXISTS "VoiceNumber" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "provider" TEXT NOT NULL DEFAULT 'telnyx',
  "providerNumberId" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "connectionId" TEXT,
  "businessProfileId" INTEGER,
  "metadata" JSONB,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VoiceNumber_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceNumber_providerNumberId_key" ON "VoiceNumber"("providerNumberId");
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceNumber_phoneNumber_key" ON "VoiceNumber"("phoneNumber");

CREATE TABLE IF NOT EXISTS "VoiceCall" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "provider" TEXT NOT NULL DEFAULT 'telnyx',
  "callControlId" TEXT NOT NULL,
  "callSessionId" TEXT,
  "fromNumber" TEXT,
  "toNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'initiated',
  "hangupCause" TEXT,
  "lastError" TEXT,
  "businessProfileId" INTEGER,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answeredAt" DATETIME,
  "endedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VoiceCall_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceCall_callControlId_key" ON "VoiceCall"("callControlId");

CREATE TABLE IF NOT EXISTS "VoiceCallEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "voiceCallId" INTEGER NOT NULL,
  "eventType" TEXT NOT NULL,
  "detail" JSONB,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceCallEvent_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TelnyxWebhookEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "webhookId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "TelnyxWebhookEvent_webhookId_key" ON "TelnyxWebhookEvent"("webhookId");
