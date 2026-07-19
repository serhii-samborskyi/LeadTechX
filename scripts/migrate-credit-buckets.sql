ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxPhoneNumbers" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxTransferTargets" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "outboundQualificationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "smartReviewsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "callTransfersEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "leadWebhookEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "messageInboxEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "appointmentRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "prioritySupport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "allowCreditTopups" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "supportLevel" TEXT NOT NULL DEFAULT 'standard';

CREATE TABLE IF NOT EXISTS "CreditBucket" (
  "id" SERIAL PRIMARY KEY,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CreditTransaction" ADD COLUMN IF NOT EXISTS "creditBucketId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "CreditBucket" ADD CONSTRAINT "CreditBucket_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CreditBucket" ADD CONSTRAINT "CreditBucket_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_creditBucketId_fkey" FOREIGN KEY ("creditBucketId") REFERENCES "CreditBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CreditBucket_stripeInvoiceId_key" ON "CreditBucket"("stripeInvoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "CreditBucket_stripeCheckoutSessionId_key" ON "CreditBucket"("stripeCheckoutSessionId");
CREATE INDEX IF NOT EXISTS "CreditBucket_businessProfileId_sourceType_expiresAt_idx" ON "CreditBucket"("businessProfileId", "sourceType", "expiresAt");
CREATE INDEX IF NOT EXISTS "CreditBucket_businessProfileId_remainingCredits_idx" ON "CreditBucket"("businessProfileId", "remainingCredits");
CREATE INDEX IF NOT EXISTS "CreditBucket_subscriptionPlanId_createdAt_idx" ON "CreditBucket"("subscriptionPlanId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditTransaction_creditBucketId_createdAt_idx" ON "CreditTransaction"("creditBucketId", "createdAt");

INSERT INTO "CreditBucket" ("businessProfileId", "sourceType", "totalCredits", "remainingCredits", "metadata")
SELECT bp."id", 'legacy_balance', bp."creditBalance", bp."creditBalance", jsonb_build_object('source', 'manual_backfill')
FROM "BusinessProfile" bp
WHERE bp."creditBalance" > 0
  AND NOT EXISTS (SELECT 1 FROM "CreditBucket" cb WHERE cb."businessProfileId" = bp."id");

INSERT INTO "CreditBucket" ("businessProfileId", "sourceType", "totalCredits", "remainingCredits", "metadata")
SELECT bp."id", 'overage', 0, bp."creditBalance", jsonb_build_object('source', 'manual_negative_balance_backfill')
FROM "BusinessProfile" bp
WHERE bp."creditBalance" < 0
  AND NOT EXISTS (SELECT 1 FROM "CreditBucket" cb WHERE cb."businessProfileId" = bp."id");

INSERT INTO "CreditTransaction" ("businessProfileId", "creditBucketId", "type", "amount", "balanceAfter", "note", "metadata")
SELECT cb."businessProfileId", cb."id", 'legacy_balance', cb."totalCredits", cb."remainingCredits", 'Legacy credit balance', jsonb_build_object('source', 'manual_backfill', 'creditBucketId', cb."id")
FROM "CreditBucket" cb
WHERE cb."sourceType" = 'legacy_balance'
  AND NOT EXISTS (
    SELECT 1 FROM "CreditTransaction" ct WHERE ct."creditBucketId" = cb."id" AND ct."type" = 'legacy_balance'
  );

INSERT INTO "CreditTransaction" ("businessProfileId", "creditBucketId", "type", "amount", "balanceAfter", "note", "metadata")
SELECT cb."businessProfileId", cb."id", 'legacy_overage', cb."remainingCredits", cb."remainingCredits", 'Legacy negative credit balance', jsonb_build_object('source', 'manual_negative_balance_backfill', 'creditBucketId', cb."id")
FROM "CreditBucket" cb
WHERE cb."sourceType" = 'overage'
  AND cb."remainingCredits" < 0
  AND NOT EXISTS (
    SELECT 1 FROM "CreditTransaction" ct WHERE ct."creditBucketId" = cb."id" AND ct."type" = 'legacy_overage'
  );
