-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN IF NOT EXISTS "postingDraft" JSONB;