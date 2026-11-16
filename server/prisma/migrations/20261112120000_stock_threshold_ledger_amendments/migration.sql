ALTER TABLE "StoreItem"
  ADD COLUMN "openingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "lowStockThreshold" DOUBLE PRECISION,
  ADD COLUMN "outOfStockThreshold" DOUBLE PRECISION,
  ADD COLUMN "alertState" TEXT NOT NULL DEFAULT 'in_stock';

-- Preserve existing thresholds as explicit per-store-item overrides.
UPDATE "StoreItem"
SET "openingQty" = "qty",
    "lowStockThreshold" = "reorderLevel",
    "outOfStockThreshold" = 0;

ALTER TABLE "StockMovement"
  ADD COLUMN "qtyBefore" DOUBLE PRECISION,
  ADD COLUMN "qtyAfter" DOUBLE PRECISION,
  ADD COLUMN "direction" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'posted',
  ADD COLUMN "relatedType" TEXT,
  ADD COLUMN "relatedId" TEXT;

CREATE TABLE "MaterialAmendment" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "materialName" TEXT NOT NULL,
  "storeId" TEXT,
  "storeName" TEXT,
  "oldValue" JSONB NOT NULL,
  "proposedValue" JSONB NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requestedBy" TEXT NOT NULL,
  "requestedById" TEXT,
  "reviewedBy" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialAmendment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaterialAmendment_status_createdAt_idx" ON "MaterialAmendment"("status", "createdAt");
CREATE INDEX "MaterialAmendment_entityType_entityId_idx" ON "MaterialAmendment"("entityType", "entityId");
