ALTER TABLE "BusinessProfile"
  ADD COLUMN "planAccessSource" TEXT,
  ADD COLUMN "complimentaryPlanEndsAt" TIMESTAMP(3),
  ADD COLUMN "complimentaryCreditsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "complimentaryCreditsNextAt" TIMESTAMP(3),
  ADD COLUMN "complimentaryGrantKey" TEXT,
  ADD COLUMN "complimentaryGrantedAt" TIMESTAMP(3),
  ADD COLUMN "complimentaryGrantedBy" TEXT,
  ADD COLUMN "complimentaryGrantNote" TEXT,
  ADD COLUMN "complimentaryPreviousStatus" TEXT,
  ADD COLUMN "complimentaryPreviousPlanId" INTEGER;

ALTER TABLE "CreditBucket"
  ADD COLUMN "grantKey" TEXT;

CREATE UNIQUE INDEX "BusinessProfile_complimentaryGrantKey_key"
  ON "BusinessProfile"("complimentaryGrantKey");

CREATE INDEX "BusinessProfile_planAccessSource_complimentaryPlanEndsAt_idx"
  ON "BusinessProfile"("planAccessSource", "complimentaryPlanEndsAt");

CREATE INDEX "BusinessProfile_planAccessSource_complimentaryCreditsNextAt_idx"
  ON "BusinessProfile"("planAccessSource", "complimentaryCreditsNextAt");

CREATE UNIQUE INDEX "CreditBucket_grantKey_key"
  ON "CreditBucket"("grantKey");
