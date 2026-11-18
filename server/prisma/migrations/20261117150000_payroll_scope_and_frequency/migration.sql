ALTER TABLE "PayrollPeriod" ADD COLUMN "salaryFrequencyId" TEXT;
ALTER TABLE "PayrollPeriod" ADD COLUMN "salaryFrequencyName" TEXT;

ALTER TABLE "PayrollRun" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'company';
ALTER TABLE "PayrollRun" ADD COLUMN "projectId" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "projectName" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "salaryFrequencyId" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "salaryFrequencyName" TEXT;

CREATE INDEX "PayrollRun_scope_projectId_idx" ON "PayrollRun"("scope", "projectId");
CREATE INDEX "PayrollRun_salaryFrequencyId_idx" ON "PayrollRun"("salaryFrequencyId");
