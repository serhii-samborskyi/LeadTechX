ALTER TABLE "FastAgentSession" ADD COLUMN "shortCode" TEXT;

CREATE UNIQUE INDEX "FastAgentSession_shortCode_key" ON "FastAgentSession"("shortCode");
