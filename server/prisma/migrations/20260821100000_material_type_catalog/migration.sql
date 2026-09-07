-- Undo the previous Category → MaterialCatalogItem → MaterialCatalogType →
-- MaterialCatalogDimension design: it was disconnected from actual stock.
-- Category → Material → Type now lives on the existing Material table
-- (the one Goods Receipt/Stock Movement already use), with Type getting its
-- own table since it's the thing that actually carries stock quantities.
-- These tables were never populated with real data, so nothing to migrate out.

-- DropForeignKey
ALTER TABLE "MaterialCatalogItem" DROP CONSTRAINT IF EXISTS "MaterialCatalogItem_categoryId_fkey";
ALTER TABLE "MaterialCatalogType" DROP CONSTRAINT IF EXISTS "MaterialCatalogType_itemId_fkey";
ALTER TABLE "MaterialCatalogDimension" DROP CONSTRAINT IF EXISTS "MaterialCatalogDimension_typeId_fkey";

-- DropTable
DROP TABLE IF EXISTS "MaterialCatalogDimension";
DROP TABLE IF EXISTS "MaterialCatalogType";
DROP TABLE IF EXISTS "MaterialCatalogItem";

-- AlterTable: Material — unit is no longer required (only Type requires one
-- now), and gains a categoryId link into MaterialCategory.
ALTER TABLE "Material" ALTER COLUMN "unit" DROP NOT NULL;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Material_categoryId_idx" ON "Material"("categoryId");

-- AddForeignKey: deleting a category orphans its materials (they may carry
-- real stock) rather than deleting them.
ALTER TABLE "Material" ADD CONSTRAINT "Material_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MaterialType" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT NOT NULL,
    "totalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimensions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialType_materialId_idx" ON "MaterialType"("materialId");

-- AddForeignKey
ALTER TABLE "MaterialType" ADD CONSTRAINT "MaterialType_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
