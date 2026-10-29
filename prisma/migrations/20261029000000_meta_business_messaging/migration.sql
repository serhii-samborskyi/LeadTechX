ALTER TABLE "AppSettings"
  ADD COLUMN "metaAppId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "metaLoginConfigurationId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "metaGraphApiVersion" TEXT NOT NULL DEFAULT 'v24.0',
  ADD COLUMN "metaMessagingEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MetaConnection" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "pageId" TEXT NOT NULL,
  "pageName" TEXT NOT NULL,
  "instagramBusinessId" TEXT,
  "instagramUsername" TEXT,
  "pageAccessTokenEncrypted" TEXT NOT NULL,
  "pageAccessTokenHint" TEXT,
  "permissions" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active',
  "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
  "connectedByUserId" INTEGER,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastWebhookAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaOAuthSession" (
  "id" SERIAL NOT NULL,
  "stateHash" TEXT NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "userAccessTokenEncrypted" TEXT,
  "availablePages" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaOAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaMessage" (
  "id" SERIAL NOT NULL,
  "businessProfileId" INTEGER NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "channel" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "eventType" TEXT NOT NULL DEFAULT 'message',
  "externalUserId" TEXT,
  "externalMessageId" TEXT,
  "text" TEXT,
  "status" TEXT NOT NULL DEFAULT 'received',
  "raw" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaConnection_pageId_key" ON "MetaConnection"("pageId");
CREATE UNIQUE INDEX "MetaConnection_instagramBusinessId_key" ON "MetaConnection"("instagramBusinessId");
CREATE INDEX "MetaConnection_businessProfileId_status_idx" ON "MetaConnection"("businessProfileId", "status");
CREATE INDEX "MetaConnection_instagramBusinessId_idx" ON "MetaConnection"("instagramBusinessId");
CREATE UNIQUE INDEX "MetaOAuthSession_stateHash_key" ON "MetaOAuthSession"("stateHash");
CREATE INDEX "MetaOAuthSession_businessProfileId_expiresAt_idx" ON "MetaOAuthSession"("businessProfileId", "expiresAt");
CREATE INDEX "MetaOAuthSession_userId_expiresAt_idx" ON "MetaOAuthSession"("userId", "expiresAt");
CREATE UNIQUE INDEX "MetaMessage_channel_externalMessageId_key" ON "MetaMessage"("channel", "externalMessageId");
CREATE INDEX "MetaMessage_businessProfileId_createdAt_idx" ON "MetaMessage"("businessProfileId", "createdAt");
CREATE INDEX "MetaMessage_connectionId_externalUserId_createdAt_idx" ON "MetaMessage"("connectionId", "externalUserId", "createdAt");
CREATE INDEX "MetaMessage_status_createdAt_idx" ON "MetaMessage"("status", "createdAt");

ALTER TABLE "MetaConnection" ADD CONSTRAINT "MetaConnection_businessProfileId_fkey"
  FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaOAuthSession" ADD CONSTRAINT "MetaOAuthSession_businessProfileId_fkey"
  FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaMessage" ADD CONSTRAINT "MetaMessage_businessProfileId_fkey"
  FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaMessage" ADD CONSTRAINT "MetaMessage_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "MetaConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
