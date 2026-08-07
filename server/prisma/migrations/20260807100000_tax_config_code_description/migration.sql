-- Finance › Configuration's tax rules carry a GL code and an "applies to"
-- description: both are in the create/edit form, both are table columns, and
-- both are in the CSV export. TaxConfig had neither column, so the create
-- request carried fields Prisma rejected outright and the two values could
-- never be stored or read back.
ALTER TABLE "TaxConfig"
    ADD COLUMN IF NOT EXISTS "code" TEXT,
    ADD COLUMN IF NOT EXISTS "description" TEXT;
