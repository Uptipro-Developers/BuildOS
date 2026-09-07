-- Procurement Settings › Signatories: people authorised to sign a Purchase
-- Order. Department and role are captured at add-time rather than joined
-- live off the user, so the list doesn't shift if someone's own profile
-- changes later.
--
-- IF NOT EXISTS / the DO block below so this is safe to re-run against a
-- database where the table was already created by hand ahead of a proper
-- deploy (Railway's DATABASE_URL only resolves inside its private network,
-- so `prisma migrate deploy` from a laptop can't reach it — the table gets
-- created manually via the public connection string instead, and this file
-- must still apply cleanly once the real deploy runs it for real).
CREATE TABLE IF NOT EXISTS "Signatory" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signatory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Signatory_userId_idx" ON "Signatory"("userId");

DO $$ BEGIN
    ALTER TABLE "Signatory" ADD CONSTRAINT "Signatory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
