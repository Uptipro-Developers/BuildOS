-- AlterTable: MaterialType no longer collects a stocking unit — not needed.
ALTER TABLE "MaterialType" DROP COLUMN IF EXISTS "unit";
