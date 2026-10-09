-- Employment types are configured by HR, so the employee column can no longer
-- be constrained to the original FullTime/Contract PostgreSQL enum.
ALTER TABLE "Employee" ALTER COLUMN "employmentType" DROP DEFAULT;
ALTER TABLE "Employee"
  ALTER COLUMN "employmentType" TYPE TEXT
  USING "employmentType"::TEXT;
ALTER TABLE "Employee" ALTER COLUMN "employmentType" SET DEFAULT 'FullTime';
DROP TYPE "EmploymentType";

-- Salary frequency belongs to both the configured salary band and the
-- employee snapshot selected from it.
ALTER TABLE "Employee"
  ADD COLUMN "salaryType" TEXT NOT NULL DEFAULT 'Monthly';

ALTER TABLE "SalaryBand"
  ADD COLUMN "salaryType" TEXT NOT NULL DEFAULT 'Monthly';
