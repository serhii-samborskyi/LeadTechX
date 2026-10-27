ALTER TABLE "SubscriptionPlan"
ADD COLUMN "signupWindowEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "signupWindowDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "signupWindowStartsAt" TIMESTAMP(3);

CREATE TABLE "SubscriptionPlanSignupWindowEntry" (
    "id" SERIAL NOT NULL,
    "subscriptionPlanId" INTEGER NOT NULL,
    "businessProfileId" INTEGER,
    "windowStartsAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'plan_selection',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlanSignupWindowEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlanSignupWindowEntry_subscriptionPlanId_businessProfileId_windowStartsAt_key"
ON "SubscriptionPlanSignupWindowEntry"("subscriptionPlanId", "businessProfileId", "windowStartsAt");

CREATE INDEX "SubscriptionPlanSignupWindowEntry_subscriptionPlanId_windowStartsAt_createdAt_idx"
ON "SubscriptionPlanSignupWindowEntry"("subscriptionPlanId", "windowStartsAt", "createdAt");

CREATE INDEX "SubscriptionPlanSignupWindowEntry_businessProfileId_createdAt_idx"
ON "SubscriptionPlanSignupWindowEntry"("businessProfileId", "createdAt");

ALTER TABLE "SubscriptionPlanSignupWindowEntry"
ADD CONSTRAINT "SubscriptionPlanSignupWindowEntry_subscriptionPlanId_fkey"
FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPlanSignupWindowEntry"
ADD CONSTRAINT "SubscriptionPlanSignupWindowEntry_businessProfileId_fkey"
FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
