-- HR › General Setup collects a standard working day and an overtime
-- multiplier. Nothing read either, and there was nowhere to record the result:
-- hours worked beyond the standard day earned nothing on any payslip.
ALTER TABLE "PayrollEntry"
    ADD COLUMN IF NOT EXISTS "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Payslip"
    ADD COLUMN IF NOT EXISTS "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
