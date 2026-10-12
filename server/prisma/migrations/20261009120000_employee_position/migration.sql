-- Keep the HR job title independent from the system/ITT access role.
ALTER TABLE "Employee" ADD COLUMN "position" TEXT;

-- Before this migration the single role column was shown as "Role / Position".
-- Preserve that value as the initial position while retaining role for access.
UPDATE "Employee"
SET "position" = "role"
WHERE "position" IS NULL;
