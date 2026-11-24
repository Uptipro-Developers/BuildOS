-- Extend salary configuration beyond the previous Monthly/Annual enum-like values.
ALTER TABLE "SalaryBand" ADD COLUMN "salaryFrequencyId" TEXT;

-- Capture the effective employment payroll settings on each employee so payroll
-- remains auditable even when the employment-type defaults change later.
ALTER TABLE "Employee" ADD COLUMN "salaryFrequencyId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "paysSalary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "paymentSource" TEXT NOT NULL DEFAULT 'company';
ALTER TABLE "Employee" ADD COLUMN "payrollProjectId" TEXT;

UPDATE "SalaryBand"
SET "salaryFrequencyId" = CASE
  WHEN LOWER("salaryType") = 'annual' THEN 'salary-frequency-annual'
  ELSE 'salary-frequency-monthly'
END
WHERE "salaryFrequencyId" IS NULL;

UPDATE "Employee"
SET "salaryFrequencyId" = CASE
  WHEN LOWER("salaryType") = 'annual' THEN 'salary-frequency-annual'
  ELSE 'salary-frequency-monthly'
END
WHERE "salaryFrequencyId" IS NULL;

CREATE INDEX "Employee_payrollProjectId_idx" ON "Employee"("payrollProjectId");
