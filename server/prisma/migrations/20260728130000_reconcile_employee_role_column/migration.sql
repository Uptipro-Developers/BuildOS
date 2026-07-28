-- Reconciliation: migration 20260626000000_reconcile_drifted_schema dropped
-- Employee.role and never re-added it, but schema.prisma has declared
-- `role String?` ever since (and EmployeesService/seed.ts read/write it).
-- Production almost certainly already has this column from an out-of-band
-- fix, so this is written as a no-op there and a real fix on any database
-- built from migration history alone (fresh/local/CI).
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" TEXT;
