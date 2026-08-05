-- The address an RFQ was sent to.
--
-- The New RFQ form has always had a "Vendor Email" box, but there was nowhere
-- to put what it collected: the notification was addressed from the supplier
-- record via supplierId, so anything typed in the form was discarded, and the
-- email column in the Sent Requests table was rendered from a field that was
-- hardcoded blank. This stores it, so the address shown is the address used and
-- a resend goes to the same place.

ALTER TABLE "SentRFQ"
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
