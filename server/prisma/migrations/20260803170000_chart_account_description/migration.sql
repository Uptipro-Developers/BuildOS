-- ChartAccount had no description column, but the Chart of Accounts page has a
-- Description field in its create/edit form, a Description table column, a
-- Description CSV export column, and searches on it. The value was accepted by
-- the form, dropped by the server's column whitelist, and read back as blank.
ALTER TABLE "ChartAccount"
    ADD COLUMN IF NOT EXISTS "description" TEXT;
