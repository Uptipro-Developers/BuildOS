-- ChartAccount had no parentId, so every account was treated as a root by the
-- frontend and getDepth() always returned 0 — making hierarchy invisible.
ALTER TABLE "ChartAccount"
    ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES "ChartAccount"("id") ON DELETE SET NULL;
