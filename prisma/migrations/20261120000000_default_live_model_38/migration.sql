ALTER TABLE "AppSettings"
ALTER COLUMN "liveModel" SET DEFAULT 'models/gemini-3.8-live';

UPDATE "AppSettings"
SET "liveModel" = 'models/gemini-3.8-live'
WHERE "liveModel" = 'models/gemini-3.1-flash-live-preview';
