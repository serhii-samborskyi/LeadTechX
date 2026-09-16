ALTER TABLE "BookingLink"
ADD COLUMN "shortCode" TEXT;

ALTER TABLE "BookingLinkSend"
ADD COLUMN "shortCode" TEXT;

CREATE UNIQUE INDEX "BookingLink_shortCode_key" ON "BookingLink"("shortCode");
CREATE UNIQUE INDEX "BookingLinkSend_shortCode_key" ON "BookingLinkSend"("shortCode");
