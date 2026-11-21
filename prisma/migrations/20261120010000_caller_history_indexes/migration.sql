CREATE INDEX IF NOT EXISTS "Appointment_caller_history_idx"
ON "Appointment"("businessName", "website", "phone", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_caller_history_idx"
ON "Lead"("businessProfileId", "phone", "updatedAt");

CREATE INDEX IF NOT EXISTS "VoiceCall_caller_history_idx"
ON "VoiceCall"("businessProfileId", "fromNumber", "callMode", "startedAt");

CREATE INDEX IF NOT EXISTS "CustomerFeedback_caller_history_idx"
ON "CustomerFeedback"("businessProfileId", "phone", "updatedAt");
