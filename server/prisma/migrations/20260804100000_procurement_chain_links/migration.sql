-- Makes the Material Request → Purchase Request → RFQ → Quote → Purchase Order
-- chain traceable.
--
-- Each stage previously stood alone. A purchase request raised from a material
-- request recorded the link only inside its `notes` prose; an RFQ had nowhere to
-- record which request it was competing; a quote had nowhere to record what it
-- was quoting for, so quote comparison — which groups on exactly that — was
-- empty for every stored row; and a purchase order had nowhere to record the
-- quote it was awarded from.

ALTER TABLE "MaterialRequest"
  ADD COLUMN IF NOT EXISTS "prRef" TEXT;

ALTER TABLE "PurchaseRequest"
  ADD COLUMN IF NOT EXISTS "mrRef" TEXT,
  ADD COLUMN IF NOT EXISTS "procurementType" TEXT NOT NULL DEFAULT 'rfq',
  ADD COLUMN IF NOT EXISTS "suppliers" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "SentRFQ"
  ADD COLUMN IF NOT EXISTS "prRef" TEXT;

ALTER TABLE "ReceivedQuote"
  ADD COLUMN IF NOT EXISTS "prRef" TEXT,
  ADD COLUMN IF NOT EXISTS "projectName" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationStore" TEXT,
  ADD COLUMN IF NOT EXISTS "storeLevel" TEXT;

ALTER TABLE "PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "quoteRef" TEXT;

-- Both are looked up by prRef to assemble a sourcing event.
CREATE INDEX IF NOT EXISTS "SentRFQ_prRef_idx" ON "SentRFQ" ("prRef");
CREATE INDEX IF NOT EXISTS "ReceivedQuote_prRef_idx" ON "ReceivedQuote" ("prRef");

-- Recover the links that existing rows carry in prose, so history is not lost.
-- createPR wrote exactly "Raised from Material Request MR-0007 (...)".
UPDATE "PurchaseRequest"
   SET "mrRef" = substring("notes" from 'Raised from Material Request ([A-Za-z0-9_-]+)')
 WHERE "mrRef" IS NULL
   AND "notes" ~ 'Raised from Material Request ';

UPDATE "PurchaseRequest"
   SET "procurementType" = 'direct'
 WHERE "notes" LIKE '%Direct Procurement%';
