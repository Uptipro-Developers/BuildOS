-- Posting engine: journal entries carry where they came from, so a General
-- Ledger line can be traced back to the invoice, payment or payroll run behind it.
ALTER TABLE "JournalEntry" ADD COLUMN "sourceModule" TEXT NOT NULL DEFAULT 'Journal';
ALTER TABLE "JournalEntry" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN "process" TEXT;

CREATE INDEX "JournalEntry_sourceModule_sourceId_idx" ON "JournalEntry"("sourceModule", "sourceId");
CREATE INDEX "JournalEntry_status_date_idx" ON "JournalEntry"("status", "date");

-- Payroll carries its own posting-approval trail through Finance.
ALTER TABLE "PayrollRun" ADD COLUMN "code" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "postingRequestedBy" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "postingRequestedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN "postingApprovedBy" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "postingApprovedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN "postedBy" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN "postedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN "journalEntryId" TEXT;

CREATE UNIQUE INDEX "PayrollRun_code_key" ON "PayrollRun"("code");
