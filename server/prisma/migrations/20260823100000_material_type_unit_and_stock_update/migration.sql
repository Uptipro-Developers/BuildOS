-- AlterTable: MaterialType needs its own unit again — the All Materials
-- "Add Material" flow (search the catalogue, update a Type's stock) shows
-- and relies on a per-Type unit, not just per-dimension units.
ALTER TABLE "MaterialType" ADD COLUMN "unit" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MaterialType" ALTER COLUMN "unit" DROP DEFAULT;
