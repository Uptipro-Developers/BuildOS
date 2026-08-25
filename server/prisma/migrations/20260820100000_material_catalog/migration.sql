-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'teal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCatalogItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'Consumable',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCatalogType" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCatalogType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCatalogDimension" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialCatalogDimension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialCatalogItem_categoryId_idx" ON "MaterialCatalogItem"("categoryId");

-- CreateIndex
CREATE INDEX "MaterialCatalogType_itemId_idx" ON "MaterialCatalogType"("itemId");

-- CreateIndex
CREATE INDEX "MaterialCatalogDimension_typeId_idx" ON "MaterialCatalogDimension"("typeId");

-- AddForeignKey
ALTER TABLE "MaterialCatalogItem" ADD CONSTRAINT "MaterialCatalogItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCatalogType" ADD CONSTRAINT "MaterialCatalogType_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCatalogDimension" ADD CONSTRAINT "MaterialCatalogDimension_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "MaterialCatalogType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: carry over categories that were previously stored as JSON
-- under SystemSetting('admin-settings').value->'materialCategories' (name,
-- description, color only — materials/types/dimensions did not exist yet)
-- so nothing an admin already configured is lost.
INSERT INTO "MaterialCategory" ("id", "name", "description", "color", "createdAt", "updatedAt")
SELECT
    elem->>'id',
    elem->>'name',
    NULLIF(elem->>'description', ''),
    COALESCE(NULLIF(elem->>'color', ''), 'teal'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "SystemSetting", jsonb_array_elements(
    CASE WHEN jsonb_typeof("SystemSetting".value->'materialCategories') = 'array'
        THEN "SystemSetting".value->'materialCategories'
        ELSE '[]'::jsonb
    END
) AS elem
WHERE "SystemSetting"."key" = 'admin-settings'
    AND COALESCE(elem->>'id', '') <> ''
    AND COALESCE(elem->>'name', '') <> ''
ON CONFLICT ("id") DO NOTHING;
