-- Procurement Settings › Payment Terms. IF NOT EXISTS / ON CONFLICT DO NOTHING
-- throughout for the same reason as the Signatory migrations: this needs to
-- apply cleanly whether or not it was already run by hand against a database
-- reached only through Railway's public proxy.
CREATE TABLE IF NOT EXISTS "PaymentTerm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "deliverySplit" TEXT NOT NULL,
    "tranches" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- Seeded with the same 5 presets the Create-PO wizard used to hardcode, so
-- switching the wizard over to read from this table doesn't lose them.
INSERT INTO "PaymentTerm" ("id", "name", "description", "deliverySplit", "tranches", "isDefault", "updatedAt")
VALUES
    ('full-delivery', 'Full payment on delivery', '100% after goods received — Finance pays after GRN / invoice.', 'post_delivery',
        '[{"title":"On delivery","percent":100,"timing":"on_delivery"}]'::jsonb, false, CURRENT_TIMESTAMP),
    ('50-50', '50% deposit + 50% on delivery', 'Half at PO approval, half after delivery.', 'pre_delivery',
        '[{"title":"Deposit","percent":50,"timing":"on_po_approval"},{"title":"Balance on delivery","percent":50,"timing":"on_delivery"}]'::jsonb, true, CURRENT_TIMESTAMP),
    ('30-70', '30% deposit + 70% on delivery', '30% at PO approval, balance after delivery.', 'pre_delivery',
        '[{"title":"Deposit","percent":30,"timing":"on_po_approval"},{"title":"Balance on delivery","percent":70,"timing":"on_delivery"}]'::jsonb, false, CURRENT_TIMESTAMP),
    ('net-30', 'Net 30', 'Full amount payable 30 days after delivery.', 'post_delivery',
        '[{"title":"Net 30 days","percent":100,"timing":"net_30"}]'::jsonb, false, CURRENT_TIMESTAMP),
    ('net-30-50', '50% on delivery + 50% Net 30', 'Half at delivery, the remainder within 30 days.', 'post_delivery',
        '[{"title":"On delivery","percent":50,"timing":"on_delivery"},{"title":"Balance Net 30","percent":50,"timing":"net_30"}]'::jsonb, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
