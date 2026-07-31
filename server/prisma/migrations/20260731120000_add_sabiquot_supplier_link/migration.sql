-- Identity bridge between BuildOS Supplier records and SabiQuot portal profiles.
--
-- Nothing previously mapped a BuildOS Supplier (cuid) to a SabiQuot profile
-- (uuid), so inbound RFQ webhooks had no way to resolve a recipient and portal
-- self-registrations could only ever create duplicates.

ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "sabiquotProfileId" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'buildos';

-- One BuildOS supplier per portal profile.
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_sabiquotProfileId_key"
  ON "Supplier" ("sabiquotProfileId");
