ALTER TABLE "MaterialCategory"
  ADD COLUMN "skuPrefix" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "skuStart" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "skuNext" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Material"
  ADD COLUMN "dimensions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "requestedBy" TEXT,
  ADD COLUMN "approvedBy" TEXT;

-- Preserve the legacy dimension columns in the new collection. Existing
-- flattened records remain valid and can be regrouped without losing stock.
UPDATE "Material"
SET "dimensions" = jsonb_build_array(
  jsonb_build_object('kind', "kind", 'value', "value", 'unit', "unit")
)
WHERE "kind" IS NOT NULL OR "value" IS NOT NULL OR "unit" IS NOT NULL;

-- Give existing categories a useful three-character prefix. Administrators
-- can change it in Storefront configuration before issuing new catalogue SKUs.
UPDATE "MaterialCategory"
SET "skuPrefix" = upper(substr(regexp_replace("name", '[^A-Za-z0-9]', '', 'g'), 1, 3)) || '-';

-- Continue after the number of catalogue items already attached to a category.
UPDATE "MaterialCategory" c
SET "skuNext" = GREATEST(c."skuStart", c."skuStart" + (
  SELECT count(DISTINCT coalesce(m."itemName", m.id))::integer
  FROM "Material" m
  WHERE m."categoryId" = c.id
));
