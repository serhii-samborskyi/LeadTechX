ALTER TABLE "AppSettings"
  ADD COLUMN IF NOT EXISTS "postbackEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "postbackUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "postbackMethod" TEXT NOT NULL DEFAULT 'POST',
  ADD COLUMN IF NOT EXISTS "postbackEvents" JSONB,
  ADD COLUMN IF NOT EXISTS "postbackParamKeys" TEXT NOT NULL DEFAULT 'utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,fbclid,ttclid,rdt_cid,gclid,gbraid,wbraid,msclkid,click_id,subid,sub_id,external_id,lead_id',
  ADD COLUMN IF NOT EXISTS "postbackIncludeAllParams" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "postbackIncludeEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "postbackIncludePhone" BOOLEAN NOT NULL DEFAULT false;
