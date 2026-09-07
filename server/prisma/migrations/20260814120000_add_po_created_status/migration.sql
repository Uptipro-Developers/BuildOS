-- AlterEnum
ALTER TYPE "POStatus" ADD VALUE IF NOT EXISTS 'po_created' AFTER 'draft';

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "signatories" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paymentTermSnapshot" JSONB NOT NULL DEFAULT '{}';
