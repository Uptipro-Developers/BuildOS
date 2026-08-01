-- Module numbering was modelled as prefix + separator + padLength + nextNumber.
-- The prototype's Settings page configures a reference *template* ("PO-{N:4}")
-- with a start, an optional end, an increment, and last-used tracking. These
-- columns add that model and backfill it from the existing one, so a deployment
-- keeps the sequence positions it already had.
--
-- IF NOT EXISTS keeps this safe to re-run.
ALTER TABLE "NumberingConfig"
    ADD COLUMN IF NOT EXISTS "template"       TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "startingNumber" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "endingNumber"   INTEGER,
    ADD COLUMN IF NOT EXISTS "incrementBy"    INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "lastUsedNumber" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lastUsedDate"   TIMESTAMP(3);

-- Backfill: derive the template from the parts, and treat the number before
-- `nextNumber` as the last one issued.
UPDATE "NumberingConfig"
SET "template" = "prefix" || "separator" || '{N:' || "padLength"::text || '}'
WHERE "template" = '';

UPDATE "NumberingConfig"
SET "lastUsedNumber" = GREATEST("nextNumber" - 1, 0)
WHERE "lastUsedNumber" = 0 AND "nextNumber" > 1;
