-- Per-user permission extensions, granted on Admin → Users → Edit User on top of
-- whatever the assigned role grants.
--
-- Encoded exactly like AppRole."inheritedRoles" ("proc:<processId>:<action>" and
-- "nav:<navId>") so the role layer and the user layer decode through one shared
-- helper instead of two divergent formats.
--
-- IF NOT EXISTS keeps this safe to re-run against a database where an earlier
-- partial apply already added the column.
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "permissionOverrides" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Existing rows predate the column; make the empty-array default explicit rather
-- than leaving NULLs that decode differently from "no overrides".
UPDATE "User" SET "permissionOverrides" = ARRAY[]::TEXT[] WHERE "permissionOverrides" IS NULL;
