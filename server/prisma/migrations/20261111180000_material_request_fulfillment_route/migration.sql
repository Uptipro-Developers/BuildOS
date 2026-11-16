ALTER TABLE "MaterialRequest"
  ADD COLUMN "fulfillmentMethod" TEXT,
  ADD COLUMN "fulfillmentStatus" TEXT,
  ADD COLUMN "sourceStoreId" TEXT,
  ADD COLUMN "sourceStoreName" TEXT,
  ADD COLUMN "stockTransferRef" TEXT;
