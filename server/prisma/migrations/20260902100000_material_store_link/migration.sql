-- A Material can now be attached to a Store, set from the Edit Material
-- modal on the All Materials page. storeName is denormalised the same way
-- category/categoryId already are, so it displays without a join.
ALTER TABLE "Material"
  ADD COLUMN "storeId" TEXT,
  ADD COLUMN "storeName" TEXT;

CREATE INDEX "Material_storeId_idx" ON "Material"("storeId");

ALTER TABLE "Material"
  ADD CONSTRAINT "Material_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
