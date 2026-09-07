-- One Signatory row per person. Superseding the plain index added in
-- 20260813120000_add_signatories -- unique implies indexed, so the old
-- non-unique one is redundant once this is in place.
--
-- IF EXISTS / IF NOT EXISTS for the same reason as the migration before it:
-- this needs to apply cleanly whether or not it was already run by hand
-- against a database reached only through Railway's public proxy.
DROP INDEX IF EXISTS "Signatory_userId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Signatory_userId_key" ON "Signatory"("userId");
