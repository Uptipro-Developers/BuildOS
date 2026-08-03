-- The Salary Structure page manages grade bands with a per-band basic salary
-- and a list of salary components (allowances/deductions), but SalaryBand only
-- stored name/gradeLevel/min/max/mid/description, so those edits were dropped on
-- save. These additive nullable columns let the band persist the design fields.
--
-- IF NOT EXISTS keeps this safe to re-run against a database where an earlier
-- partial apply already added a column.
ALTER TABLE "SalaryBand"
    ADD COLUMN IF NOT EXISTS "gradeName"   TEXT,
    ADD COLUMN IF NOT EXISTS "department"  TEXT,
    ADD COLUMN IF NOT EXISTS "basicSalary" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "components"  JSONB;
