ALTER TABLE "AppSettings"
  ADD COLUMN IF NOT EXISTS "openAiAdsPixelId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "AppSettings"
  ALTER COLUMN "postbackParamKeys" SET DEFAULT 'utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,fbclid,ttclid,rdt_cid,oppref,obref,gclid,gbraid,wbraid,msclkid,click_id,subid,sub_id,external_id,lead_id';
