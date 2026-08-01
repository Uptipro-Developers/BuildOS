-- "Active Sessions" on the Admin dashboard counted users whose `lastLogin` fell
-- in the last 24 hours, floored at 1. That is a daily-logins figure, not a count
-- of who is signed in now: somebody who logged in at 9am and left kept counting
-- until the next day.
--
-- `lastSeenAt` is refreshed as a user actually uses the app, so presence can be
-- measured over a short window instead.
--
-- IF NOT EXISTS keeps this safe to re-run.
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- Seed from lastLogin so the metric is not empty for already-signed-in users
-- until their next request refreshes it.
UPDATE "User" SET "lastSeenAt" = "lastLogin" WHERE "lastSeenAt" IS NULL;

CREATE INDEX IF NOT EXISTS "User_lastSeenAt_idx" ON "User" ("lastSeenAt");
