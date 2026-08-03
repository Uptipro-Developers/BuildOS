-- Align the accrual type catalogue with the design.
--
-- The original seed invented six operational categories (GRNI, Salary & Wages,
-- Utilities, Interest, Retention, Other). The design specifies five accounting
-- classifications instead, which is what the Accruals filter bar is meant to
-- show. `Accrual.type` is a plain string with no foreign key, so existing rows
-- are remapped by value rather than by constraint.

INSERT INTO "AccrualTypeConfig" ("id", "type", "label", "color", "description", "createdAt", "updatedAt") VALUES
('atc_grni',     'goods-received-not-invoiced', 'Goods Received Not Invoiced', 'bg-blue-100 text-blue-700',       'Goods received but invoice not yet processed', now(), now()),
('atc_accr_exp', 'accrued-expense',             'Accrued Expense',             'bg-amber-100 text-amber-700',     'Expenses incurred but not yet paid',           now(), now()),
('atc_prepaid',  'prepaid-expense',             'Prepaid Expense',             'bg-purple-100 text-purple-700',   'Expenses paid in advance',                     now(), now()),
('atc_accr_rev', 'accrued-revenue',             'Accrued Revenue',             'bg-emerald-100 text-emerald-700', 'Revenue earned but not yet billed',            now(), now()),
('atc_def_rev',  'deferred-revenue',            'Deferred Revenue',            'bg-orange-100 text-orange-700',   'Revenue received but not yet earned',          now(), now())
ON CONFLICT ("type") DO UPDATE
  SET "label"       = EXCLUDED."label",
      "color"       = EXCLUDED."color",
      "description" = EXCLUDED."description",
      "updatedAt"   = now();

-- Repoint existing accruals. GRNI maps directly; the remaining operational
-- categories were all expense accruals, so they collapse into Accrued Expense.
UPDATE "Accrual" SET "type" = 'goods-received-not-invoiced' WHERE "type" = 'grni';
UPDATE "Accrual" SET "type" = 'accrued-expense'
  WHERE "type" IN ('salary', 'utility', 'interest', 'retention', 'other');

DELETE FROM "AccrualTypeConfig"
  WHERE "type" IN ('grni', 'salary', 'utility', 'interest', 'retention', 'other');
