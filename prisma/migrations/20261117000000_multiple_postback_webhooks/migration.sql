ALTER TABLE "AppSettings"
  ADD COLUMN IF NOT EXISTS "postbackWebhooks" JSONB;
