-- Material types created from the catalogue can inherit their unit from their
-- dimensions, so a standalone unit is optional. The table is removed by a
-- later migration, but this conditional form keeps fresh and upgraded
-- databases on the same historical path.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'MaterialType'
      AND column_name = 'unit'
  ) THEN
    ALTER TABLE "MaterialType" ALTER COLUMN "unit" DROP NOT NULL;
  END IF;
END $$;
