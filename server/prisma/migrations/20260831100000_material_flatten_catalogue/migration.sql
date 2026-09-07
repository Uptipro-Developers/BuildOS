-- Material Category creation no longer nests a Type table underneath each
-- Material: a material item's every dimension becomes its own Material row
-- directly, named as "<Material Name> — <item name> (<value+unit>)". These
-- columns carry what a MaterialType row used to (sku, dimension kind/value —
-- unit already exists on Material), plus the pre-concatenation names so the
-- Storefront Config builder can regroup flat rows back into its
-- Material -> item -> dimension tree when a category is reopened for edit.
ALTER TABLE "Material"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "kind" TEXT,
  ADD COLUMN "value" DOUBLE PRECISION,
  ADD COLUMN "materialGroupName" TEXT,
  ADD COLUMN "itemName" TEXT;
