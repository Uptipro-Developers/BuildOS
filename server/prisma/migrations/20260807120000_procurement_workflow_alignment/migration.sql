-- Procurement workflow alignment.
--
-- Collapses the purchase order's two parallel state columns (`status` for
-- delivery, `paymentStatus` for money) into the one lifecycle the module
-- actually implements, gives the order its own reference, and adds the goods
-- receipt tables that close the chain into stock.

-- ─────────────── PurchaseOrder.status ───────────────

ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

-- Money wins when the two columns disagree: an order whose payment had already
-- been made is further along than its delivery status claimed.
UPDATE "PurchaseOrder" SET "status" = CASE
    WHEN "status" = 'cancelled'                       THEN 'cancelled'
    WHEN "paymentStatus"::TEXT = 'paid'               THEN 'paid'
    WHEN "paymentStatus"::TEXT = 'confirmation_requested' THEN 'confirmation_requested'
    WHEN "status" = 'completed'                       THEN 'goods_received'
    WHEN "status" IN ('confirmed', 'partially_received') THEN 'confirmed'
    WHEN "sentToFinance" = true                       THEN 'sent_to_finance'
    -- 'sent' meant "sent to supplier", a state no implemented step produced.
    ELSE 'draft'
END;

ALTER TABLE "PurchaseOrder" DROP COLUMN "paymentStatus";
DROP TYPE "POPaymentStatus";

DROP TYPE "POStatus";
CREATE TYPE "POStatus" AS ENUM (
    'draft',
    'sent_to_finance',
    'finance_accepted',
    'finance_declined',
    'paid',
    'confirmation_requested',
    'confirmed',
    'goods_received',
    'cancelled'
);

ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE "POStatus" USING "status"::"POStatus";
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'draft';

-- ─────────────── PurchaseOrder new columns ───────────────

ALTER TABLE "PurchaseOrder" ADD COLUMN "poRef" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "sentToFinanceAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN "financeDecidedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN "declineReason" TEXT;

-- Existing orders have no allocated reference; give them a stable one derived
-- from creation order so nothing displays a cuid.
WITH numbered AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt") AS n FROM "PurchaseOrder"
)
UPDATE "PurchaseOrder" p
SET "poRef" = 'PO-' || LPAD(numbered.n::TEXT, 4, '0')
FROM numbered
WHERE p."id" = numbered."id";

CREATE UNIQUE INDEX "PurchaseOrder_poRef_key" ON "PurchaseOrder"("poRef");

-- ─────────────── Goods receipts ───────────────

CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "poRef" TEXT,
    "mrRef" TEXT,
    "supplierName" TEXT NOT NULL,
    "storeId" TEXT,
    "storeName" TEXT NOT NULL,
    "deliveryNote" TEXT,
    "receivedBy" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "stockPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoodsReceipt_reference_key" ON "GoodsReceipt"("reference");
CREATE INDEX "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");

ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "ordered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "received" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accepted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "goodsReceiptId" TEXT NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_goodsReceiptId_fkey"
    FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────── Text statuses on the rest of the chain ───────────────

-- Purchase requests no longer carry an approval of their own: when one comes
-- from a Material Request the approval already happened there, and a manual one
-- is either a draft or raised.
UPDATE "PurchaseRequest" SET "status" = CASE
    WHEN LOWER("status") IN ('draft')                              THEN 'draft'
    WHEN LOWER("status") IN ('pending_approval', 'pending approval', 'approved') THEN 'not_raised'
    WHEN LOWER("status") IN ('sent_to_suppliers', 'sent to suppliers', 'raised')  THEN 'raised'
    WHEN LOWER("status") IN ('quotes_received', 'quotes received')  THEN 'quotes_received'
    WHEN LOWER("status") IN ('po_created', 'po created')            THEN 'po_created'
    WHEN LOWER("status") = 'cancelled'                              THEN 'cancelled'
    ELSE 'not_raised'
END;

ALTER TABLE "PurchaseRequest" ALTER COLUMN "status" SET DEFAULT 'not_raised';

-- Purchase invoices mirror the order's finance states.
UPDATE "PurchaseInvoice" SET "status" = CASE
    WHEN LOWER("status") IN ('paid')                                     THEN 'paid'
    WHEN LOWER("status") IN ('approved', 'accepted')                     THEN 'accepted'
    WHEN LOWER("status") IN ('declined', 'rejected')                     THEN 'declined'
    WHEN LOWER("status") IN ('cancelled', 'canceled')                    THEN 'cancelled'
    ELSE 'pending_review'
END;

ALTER TABLE "PurchaseInvoice" ALTER COLUMN "status" SET DEFAULT 'pending_review';

-- Received quotes: "Received" is the same state as "awaiting a decision".
UPDATE "ReceivedQuote" SET "status" = CASE
    WHEN LOWER("status") IN ('approved')                   THEN 'approved'
    WHEN LOWER("status") IN ('rejected', 'declined')        THEN 'rejected'
    WHEN LOWER("status") IN ('po_created', 'po created')    THEN 'po_created'
    ELSE 'pending_review'
END;

ALTER TABLE "ReceivedQuote" ALTER COLUMN "status" SET DEFAULT 'pending_review';
