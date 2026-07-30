-- Idempotent throughout (IF NOT EXISTS / guarded constraints) so a partial or
-- repeated apply cannot halt the migration run.
--
-- Accruals had no persistence layer: the UI kept them in localStorage seeded
-- from a hardcoded array, so nothing a user created survived a refresh.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Accrual" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvalStatus" TEXT NOT NULL DEFAULT 'draft',
    "approvalSteps" JSONB,
    "createdBy" TEXT NOT NULL,
    "reversalDate" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversedAmount" DOUBLE PRECISION,
    "sourceModule" TEXT NOT NULL DEFAULT '',
    "sourceRef" TEXT NOT NULL DEFAULT '',
    "fiscalYearId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccrualLine" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accrualId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccrualLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccrualTypeConfig" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-700',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccrualTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Accrual_reference_key" ON "Accrual"("reference");
CREATE INDEX IF NOT EXISTS "Accrual_status_idx" ON "Accrual"("status");
CREATE INDEX IF NOT EXISTS "Accrual_fiscalYearId_idx" ON "Accrual"("fiscalYearId");
CREATE INDEX IF NOT EXISTS "AccrualLine_accrualId_idx" ON "AccrualLine"("accrualId");
CREATE UNIQUE INDEX IF NOT EXISTS "AccrualTypeConfig_type_key" ON "AccrualTypeConfig"("type");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AccrualLine" ADD CONSTRAINT "AccrualLine_accrualId_fkey" FOREIGN KEY ("accrualId") REFERENCES "Accrual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed the accrual type catalogue the UI previously hardcoded, so existing
-- type filters and labels keep working against real data.
INSERT INTO "AccrualTypeConfig" ("id", "type", "label", "color", "description", "createdAt", "updatedAt") VALUES
('act_grni',      'grni',      'GRNI (Goods Received Not Invoiced)', 'bg-blue-100 text-blue-700',       'Goods received but supplier invoice not yet received', now(), now()),
('act_salary',    'salary',    'Salary & Wages Accrual',             'bg-purple-100 text-purple-700',   'Earned but unpaid staff costs at period end',          now(), now()),
('act_utility',   'utility',   'Utilities Accrual',                  'bg-amber-100 text-amber-700',     'Consumed utilities not yet billed',                    now(), now()),
('act_interest',  'interest',  'Interest Accrual',                   'bg-rose-100 text-rose-700',       'Interest incurred but not yet due',                    now(), now()),
('act_retention', 'retention', 'Retention Accrual',                  'bg-teal-100 text-teal-700',       'Contract retention withheld pending completion',       now(), now()),
('act_other',     'other',     'Other Accrual',                      'bg-gray-100 text-gray-700',       'Any other period-end accrual',                         now(), now())
ON CONFLICT ("id") DO NOTHING;
