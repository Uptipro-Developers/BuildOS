ALTER TABLE "PurchaseOrder"
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

-- Existing orders have already passed the operational point at which the new
-- approval gate now sits. Only orders submitted after this release begin as
-- not submitted.
ALTER TABLE "PurchaseOrder" ALTER COLUMN "approvalStatus" SET DEFAULT 'not_submitted';
