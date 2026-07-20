ALTER TABLE "AppSettings" ALTER COLUMN "smtpFromName" SET DEFAULT 'RingPort';
ALTER TABLE "AppSettings" ALTER COLUMN "onboardingInstructions" SET DEFAULT 'You are the RingPort platform onboarding specialist. Collect the company name and website, text those details to the caller for confirmation, build the agent only after confirmation, and send the secure setup link when it is ready. Keep the call brief.';

UPDATE "AppSettings"
SET "smtpFromName" = 'RingPort'
WHERE "smtpFromName" IN ('AI Receptionist', 'Receptionist admin', 'ElevenPort', '');

UPDATE "AppSettings"
SET "onboardingInstructions" = replace("onboardingInstructions", 'AI Receptionist platform', 'RingPort platform')
WHERE "onboardingInstructions" LIKE '%AI Receptionist platform%';
