DO $$
BEGIN
  IF to_regclass('"AppSettings"') IS NOT NULL THEN
    ALTER TABLE "AppSettings" DROP COLUMN IF EXISTS "stripeSubscriptionCredits";
    ALTER TABLE "AppSettings" DROP COLUMN IF EXISTS "stripeSubscriptionPriceId";
  END IF;
END $$;
