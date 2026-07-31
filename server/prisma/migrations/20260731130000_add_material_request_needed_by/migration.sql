-- "Needed by" (shown as Due date) was computed in the browser from the requester's
-- "Needed In (days)" and never stored, so it rendered blank once the list reloaded.
--
-- IF NOT EXISTS keeps this safe to re-run against a database where an earlier
-- partial apply already added the column.
ALTER TABLE "MaterialRequest"
    ADD COLUMN IF NOT EXISTS "neededBy" TIMESTAMP(3);
