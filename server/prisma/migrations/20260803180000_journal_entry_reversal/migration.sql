-- Journal entries carried a "Reversed" status with no way to reach it: nothing
-- in the API or the UI could reverse an entry. Reversing now posts a mirror
-- entry (debits and credits swapped) and links it back to the original, so the
-- Reversed badge resolves to the entry that reversed it.
ALTER TABLE "JournalEntry"
    ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reversalOfId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'JournalEntry_reversalOfId_fkey'
    ) THEN
        ALTER TABLE "JournalEntry"
            ADD CONSTRAINT "JournalEntry_reversalOfId_fkey"
            FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "JournalEntry_reversalOfId_idx" ON "JournalEntry"("reversalOfId");
