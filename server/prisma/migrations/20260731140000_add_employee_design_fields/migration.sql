-- The Add/Edit Employee form in the design captures marital status, nationality
-- and org unit, but the Employee table had no columns for them, so HR entered
-- the values and they were silently dropped on save.
--
-- IF NOT EXISTS keeps this safe to re-run against a database where an earlier
-- partial apply already added a column.
ALTER TABLE "Employee"
    ADD COLUMN IF NOT EXISTS "maritalStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "nationality"   TEXT,
    ADD COLUMN IF NOT EXISTS "orgUnit"       TEXT;
