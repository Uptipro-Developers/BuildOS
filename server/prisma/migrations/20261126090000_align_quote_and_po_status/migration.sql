-- Awarding a quote creates a draft PurchaseOrder row so the buyer can complete
-- its terms and signatories. Older code marked the quote and PR as po_created at
-- that point, even though the Purchase Orders page correctly showed Draft.

UPDATE "ReceivedQuote" AS quote
SET "status" = 'awarded'
WHERE LOWER(quote."status") IN ('approved', 'po_created')
  AND EXISTS (
    SELECT 1
    FROM "PurchaseOrder" AS po
    WHERE po."quoteRef" = quote."id"
      AND po."status" = 'draft'
  );

UPDATE "PurchaseRequest" AS request
SET "status" = 'quotes_received'
WHERE LOWER(request."status") = 'po_created'
  AND EXISTS (
    SELECT 1
    FROM "PurchaseOrder" AS po
    WHERE po."prRef" = request."prRef"
      AND po."status" = 'draft'
  );
