CREATE TABLE "PayrollInput" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payrollRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollInput_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollInput_employeeId_effectiveDate_status_idx" ON "PayrollInput"("employeeId", "effectiveDate", "status");
CREATE INDEX "PayrollInput_payrollRunId_idx" ON "PayrollInput"("payrollRunId");
