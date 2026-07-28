# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fixes.spec.ts >> 6 · New accrual entry persists after page reload
- Location: e2e/fixes.spec.ts:152:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('table tbody tr').first().locator('select')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - banner [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - link "Build OS" [ref=e9] [cursor=pointer]:
            - /url: /apps
            - generic [ref=e10]:
              - generic [ref=e11]: Build
              - generic [ref=e12]: OS
          - button "Finance" [ref=e15]:
            - img [ref=e16]
            - generic [ref=e18]: Finance
            - img [ref=e19]
        - generic [ref=e21]:
          - button [ref=e22]:
            - img [ref=e23]
          - button "AU Admin User admin" [ref=e28]:
            - generic [ref=e30]: AU
            - generic [ref=e31]:
              - paragraph [ref=e32]: Admin User
              - paragraph [ref=e33]: admin
            - img [ref=e34]
    - generic [ref=e36]:
      - complementary [ref=e37]:
        - navigation [ref=e38]:
          - link "Dashboard" [ref=e40] [cursor=pointer]:
            - /url: /apps/finance/dashboard
            - img [ref=e41]
            - text: Dashboard
          - generic [ref=e46]:
            - button "Tasks" [ref=e47]:
              - generic [ref=e48]: Tasks
              - img [ref=e49]
            - generic [ref=e51]:
              - link "Tasks" [ref=e52] [cursor=pointer]:
                - /url: /apps/finance/tasks
                - img [ref=e53]
                - text: Tasks
              - link "My Tasks" [ref=e56] [cursor=pointer]:
                - /url: /apps/finance/my-tasks
                - img [ref=e57]
                - text: My Tasks
          - generic [ref=e60]:
            - button "Accounting" [ref=e61]:
              - generic [ref=e62]: Accounting
              - img [ref=e63]
            - generic [ref=e65]:
              - link "Chart of Accounts" [ref=e66] [cursor=pointer]:
                - /url: /apps/finance/chart-of-accounts
                - img [ref=e67]
                - text: Chart of Accounts
              - link "Journal Entries" [ref=e69] [cursor=pointer]:
                - /url: /apps/finance/journal
                - img [ref=e70]
                - text: Journal Entries
              - link "Accruals" [ref=e72] [cursor=pointer]:
                - /url: /apps/finance/accruals
                - img [ref=e73]
                - text: Accruals
          - generic [ref=e76]:
            - button "Expenses & Income" [ref=e77]:
              - generic [ref=e78]: Expenses & Income
              - img [ref=e79]
            - generic [ref=e81]:
              - link "Expense Management" [ref=e82] [cursor=pointer]:
                - /url: /apps/finance/expenses
                - img [ref=e83]
                - text: Expense Management
              - link "Income Management" [ref=e86] [cursor=pointer]:
                - /url: /apps/finance/income
                - img [ref=e87]
                - text: Income Management
          - generic [ref=e90]:
            - button "Financial Management" [ref=e91]:
              - generic [ref=e92]: Financial Management
              - img [ref=e93]
            - generic [ref=e95]:
              - link "Budget Management" [ref=e96] [cursor=pointer]:
                - /url: /apps/finance/budget
                - img [ref=e97]
                - text: Budget Management
              - link "Payment Management" [ref=e100] [cursor=pointer]:
                - /url: /apps/finance/payments
                - img [ref=e101]
                - text: Payment Management
              - link "Purchase Invoice" [ref=e103] [cursor=pointer]:
                - /url: /apps/finance/purchase-invoice
                - img [ref=e104]
                - text: Purchase Invoice
          - generic [ref=e107]:
            - button "Payroll & Claims" [ref=e108]:
              - generic [ref=e109]: Payroll & Claims
              - img [ref=e110]
            - generic [ref=e112]:
              - link "Payroll Integration" [ref=e113] [cursor=pointer]:
                - /url: /apps/finance/payroll
                - img [ref=e114]
                - text: Payroll Integration
              - link "Claims Management" [ref=e118] [cursor=pointer]:
                - /url: /apps/finance/claims
                - img [ref=e119]
                - text: Claims Management
          - generic [ref=e122]:
            - button "Period End" [ref=e123]:
              - generic [ref=e124]: Period End
              - img [ref=e125]
            - generic [ref=e127]:
              - link "Year-End Close" [ref=e128] [cursor=pointer]:
                - /url: /apps/finance/year-end-close
                - img [ref=e129]
                - text: Year-End Close
              - link "Fiscal Years" [ref=e132] [cursor=pointer]:
                - /url: /apps/finance/fiscal-years
                - img [ref=e133]
                - text: Fiscal Years
          - generic [ref=e138]:
            - button "Approvals" [ref=e139]:
              - generic [ref=e140]: Approvals
              - img [ref=e141]
            - link "Approvals" [ref=e144] [cursor=pointer]:
              - /url: /apps/finance/approvals
              - img [ref=e145]
              - text: Approvals
          - generic [ref=e148]:
            - button "Ledger & Reports" [ref=e149]:
              - generic [ref=e150]: Ledger & Reports
              - img [ref=e151]
            - generic [ref=e153]:
              - link "Transactions Ledger" [ref=e154] [cursor=pointer]:
                - /url: /apps/finance/ledger
                - img [ref=e155]
                - text: Transactions Ledger
              - link "Posting Engine" [ref=e156] [cursor=pointer]:
                - /url: /apps/finance/posting-engine
                - img [ref=e157]
                - text: Posting Engine
              - link "Reports" [ref=e159] [cursor=pointer]:
                - /url: /apps/finance/reports
                - img [ref=e160]
                - text: Reports
          - generic [ref=e162]:
            - button "Configuration" [ref=e163]:
              - generic [ref=e164]: Configuration
              - img [ref=e165]
            - generic [ref=e167]:
              - link "Finance Configuration" [ref=e168] [cursor=pointer]:
                - /url: /apps/finance/config
                - img [ref=e169]
                - text: Finance Configuration
              - link "Process Mapping" [ref=e172] [cursor=pointer]:
                - /url: /apps/finance/process-mapping
                - img [ref=e173]
                - text: Process Mapping
      - main [ref=e177]:
        - generic [ref=e178]:
          - generic [ref=e179]:
            - generic [ref=e180]:
              - heading "Accruals" [level=1] [ref=e181]
              - paragraph [ref=e182]: Manage accrual entries across all modules — with multi-line journal entries and approval workflow
            - generic [ref=e183]:
              - button "Export CSV" [ref=e184]
              - button "New Accrual" [ref=e185]:
                - img [ref=e186]
                - text: New Accrual
          - generic [ref=e187]:
            - generic [ref=e188]:
              - paragraph [ref=e189]: Total Accruals
              - paragraph [ref=e190]: "4"
            - generic [ref=e191]:
              - paragraph [ref=e192]: Active (Pending Reversal)
              - paragraph [ref=e193]: ₦9,650,000
            - generic [ref=e194]:
              - paragraph [ref=e195]: Reversed This Period
              - paragraph [ref=e196]: ₦0
            - generic [ref=e197]:
              - paragraph [ref=e198]: Net Accrual Exposure
              - paragraph [ref=e199]: ₦9,650,000
          - generic [ref=e200]:
            - generic [ref=e201]:
              - button "All Types" [ref=e202]
              - button "Goods Received Not Invoiced" [ref=e203]
              - button "Accrued Expense" [ref=e204]
              - button "Prepaid Expense" [ref=e205]
              - button "Accrued Revenue" [ref=e206]
              - button "Deferred Revenue" [ref=e207]
            - generic [ref=e208]:
              - button "All Status" [ref=e209]
              - button "Draft" [ref=e210]
              - button "Pending Approval" [ref=e211]
              - button "Active" [ref=e212]
              - button "Partially Reversed" [ref=e213]
              - button "Fully Reversed" [ref=e214]
              - button "Cancelled" [ref=e215]
          - generic [ref=e216]:
            - generic [ref=e217]:
              - generic [ref=e219]:
                - img [ref=e220]
                - textbox "Search accruals..." [ref=e223]
              - generic [ref=e225]: 4 records
            - table [ref=e227]:
              - rowgroup [ref=e228]:
                - row "Type Title Lines Amount (₦) Status Approval Source Reversal Date Actions" [ref=e229]:
                  - columnheader "Type" [ref=e230]:
                    - generic [ref=e231]:
                      - generic [ref=e232]: Type
                      - button [ref=e234]:
                        - img [ref=e235]
                  - columnheader "Title" [ref=e238]:
                    - generic [ref=e239]:
                      - generic [ref=e240]: Title
                      - button [ref=e242]:
                        - img [ref=e243]
                  - columnheader "Lines" [ref=e246]:
                    - generic [ref=e248]: Lines
                  - columnheader "Amount (₦)" [ref=e249]:
                    - generic [ref=e250]:
                      - generic [ref=e251]: Amount (₦)
                      - button [ref=e253]:
                        - img [ref=e254]
                  - columnheader "Status" [ref=e257]:
                    - generic [ref=e258]:
                      - generic [ref=e259]: Status
                      - button [ref=e261]:
                        - img [ref=e262]
                  - columnheader "Approval" [ref=e265]:
                    - generic [ref=e266]:
                      - generic [ref=e267]: Approval
                      - button [ref=e269]:
                        - img [ref=e270]
                  - columnheader "Source" [ref=e273]:
                    - generic [ref=e274]:
                      - generic [ref=e275]: Source
                      - button [ref=e277]:
                        - img [ref=e278]
                  - columnheader "Reversal Date" [ref=e281]:
                    - generic [ref=e282]:
                      - generic [ref=e283]: Reversal Date
                      - button [ref=e285]:
                        - img [ref=e286]
                  - columnheader "Actions" [ref=e289]:
                    - generic [ref=e291]: Actions
              - rowgroup [ref=e292]:
                - row "Goods Received Not Invoiced GRNI — CemCo Cement Delivery 400 bags cement received, invoice pending from CemCo Nigeria Ltd 5200 Material Costs ₦3,400,000 DR 2120 Accrued Expenses ₦3,400,000 CR ₦3,400,000 Active Approved Procurement PO-0031 2026-05-10" [ref=e293]:
                  - cell "Goods Received Not Invoiced" [ref=e294]
                  - cell "GRNI — CemCo Cement Delivery 400 bags cement received, invoice pending from CemCo Nigeria Ltd" [ref=e295]:
                    - generic [ref=e296]:
                      - paragraph [ref=e297]: GRNI — CemCo Cement Delivery
                      - paragraph [ref=e298]: 400 bags cement received, invoice pending from CemCo Nigeria Ltd
                  - cell "5200 Material Costs ₦3,400,000 DR 2120 Accrued Expenses ₦3,400,000 CR" [ref=e299]:
                    - generic [ref=e300]:
                      - paragraph [ref=e301]:
                        - text: 5200 Material Costs
                        - generic [ref=e302]: ₦3,400,000 DR
                      - paragraph [ref=e303]:
                        - text: 2120 Accrued Expenses
                        - generic [ref=e304]: ₦3,400,000 CR
                  - cell "₦3,400,000" [ref=e305]
                  - cell "Active" [ref=e306]
                  - cell "Approved" [ref=e307]
                  - cell "Procurement PO-0031" [ref=e308]:
                    - generic [ref=e309]:
                      - text: Procurement
                      - paragraph [ref=e310]: PO-0031
                  - cell "2026-05-10" [ref=e311]
                  - cell [ref=e312]:
                    - generic [ref=e313]:
                      - button "Reverse" [ref=e314]:
                        - img [ref=e315]
                      - button "Cancel" [ref=e320]:
                        - img [ref=e321]
                - row "Accrued Expense April Payroll Accrual Unpaid salaries for last week of April 5100 Labour Costs ₦1,250,000 DR 2120 Accrued Expenses ₦1,250,000 CR ₦1,250,000 Active Approved HR PRLL-APR26-ACCRUAL 2026-05-07" [ref=e325]:
                  - cell "Accrued Expense" [ref=e326]
                  - cell "April Payroll Accrual Unpaid salaries for last week of April" [ref=e327]:
                    - generic [ref=e328]:
                      - paragraph [ref=e329]: April Payroll Accrual
                      - paragraph [ref=e330]: Unpaid salaries for last week of April
                  - cell "5100 Labour Costs ₦1,250,000 DR 2120 Accrued Expenses ₦1,250,000 CR" [ref=e331]:
                    - generic [ref=e332]:
                      - paragraph [ref=e333]:
                        - text: 5100 Labour Costs
                        - generic [ref=e334]: ₦1,250,000 DR
                      - paragraph [ref=e335]:
                        - text: 2120 Accrued Expenses
                        - generic [ref=e336]: ₦1,250,000 CR
                  - cell "₦1,250,000" [ref=e337]
                  - cell "Active" [ref=e338]
                  - cell "Approved" [ref=e339]
                  - cell "HR PRLL-APR26-ACCRUAL" [ref=e340]:
                    - generic [ref=e341]:
                      - text: HR
                      - paragraph [ref=e342]: PRLL-APR26-ACCRUAL
                  - cell "2026-05-07" [ref=e343]
                  - cell [ref=e344]:
                    - generic [ref=e345]:
                      - button "Reverse" [ref=e346]:
                        - img [ref=e347]
                      - button "Cancel" [ref=e352]:
                        - img [ref=e353]
                - row "Prepaid Expense Q2 Insurance Premium Prepaid insurance for April–June 2026 1100 Current Assets ₦240,000 DR 1110 Cash & Bank ₦240,000 CR ₦240,000 Partially Reversed Approved Finance INS-Q2-2026 2026-07-01" [ref=e357]:
                  - cell "Prepaid Expense" [ref=e358]
                  - cell "Q2 Insurance Premium Prepaid insurance for April–June 2026" [ref=e359]:
                    - generic [ref=e360]:
                      - paragraph [ref=e361]: Q2 Insurance Premium
                      - paragraph [ref=e362]: Prepaid insurance for April–June 2026
                  - cell "1100 Current Assets ₦240,000 DR 1110 Cash & Bank ₦240,000 CR" [ref=e363]:
                    - generic [ref=e364]:
                      - paragraph [ref=e365]:
                        - text: 1100 Current Assets
                        - generic [ref=e366]: ₦240,000 DR
                      - paragraph [ref=e367]:
                        - text: 1110 Cash & Bank
                        - generic [ref=e368]: ₦240,000 CR
                  - cell "₦240,000" [ref=e369]
                  - cell "Partially Reversed" [ref=e370]
                  - cell "Approved" [ref=e371]
                  - cell "Finance INS-Q2-2026" [ref=e372]:
                    - generic [ref=e373]:
                      - text: Finance
                      - paragraph [ref=e374]: INS-Q2-2026
                  - cell "2026-07-01" [ref=e375]
                  - cell [ref=e376]
                - row "Deferred Revenue Mobilisation Fee — Riverside Phase 2 Client advance payment for project mobilisation 1110 Cash & Bank ₦5,000,000 DR 2100 Current Liabilities ₦5,000,000 CR ₦5,000,000 Active Approved Projects INC-0016 2026-09-15" [ref=e377]:
                  - cell "Deferred Revenue" [ref=e378]
                  - cell "Mobilisation Fee — Riverside Phase 2 Client advance payment for project mobilisation" [ref=e379]:
                    - generic [ref=e380]:
                      - paragraph [ref=e381]: Mobilisation Fee — Riverside Phase 2
                      - paragraph [ref=e382]: Client advance payment for project mobilisation
                  - cell "1110 Cash & Bank ₦5,000,000 DR 2100 Current Liabilities ₦5,000,000 CR" [ref=e383]:
                    - generic [ref=e384]:
                      - paragraph [ref=e385]:
                        - text: 1110 Cash & Bank
                        - generic [ref=e386]: ₦5,000,000 DR
                      - paragraph [ref=e387]:
                        - text: 2100 Current Liabilities
                        - generic [ref=e388]: ₦5,000,000 CR
                  - cell "₦5,000,000" [ref=e389]
                  - cell "Active" [ref=e390]
                  - cell "Approved" [ref=e391]
                  - cell "Projects INC-0016" [ref=e392]:
                    - generic [ref=e393]:
                      - text: Projects
                      - paragraph [ref=e394]: INC-0016
                  - cell "2026-09-15" [ref=e395]
                  - cell [ref=e396]:
                    - generic [ref=e397]:
                      - button "Reverse" [ref=e398]:
                        - img [ref=e399]
                      - button "Cancel" [ref=e404]:
                        - img [ref=e405]
          - generic [ref=e410]:
            - generic [ref=e411]:
              - generic [ref=e412]:
                - img [ref=e413]
                - heading "New Accrual Entry" [level=2] [ref=e416]
              - button [ref=e417]:
                - img [ref=e418]
            - generic [ref=e421]:
              - generic [ref=e422]:
                - paragraph [ref=e423]: Basic Information
                - generic [ref=e424]:
                  - generic [ref=e425]:
                    - generic [ref=e426]: Accrual Type *
                    - combobox [ref=e427]:
                      - option "Select accrual type..."
                      - option "Goods Received Not Invoiced" [selected]
                      - option "Accrued Expense"
                      - option "Prepaid Expense"
                      - option "Accrued Revenue"
                      - option "Deferred Revenue"
                  - generic [ref=e428]:
                    - generic [ref=e429]: Reference
                    - textbox "e.g. PO-0031" [ref=e430]
                - generic [ref=e431]:
                  - generic [ref=e432]: Title *
                  - textbox "e.g. GRNI — Supplier Name" [ref=e433]: AccrualPersist-1785273717313
                - generic [ref=e434]:
                  - generic [ref=e435]: Description
                  - textbox "Describe the accrual reason" [ref=e436]
                - generic [ref=e437]:
                  - generic [ref=e438]:
                    - generic [ref=e439]: Reversal Date *
                    - textbox [active] [ref=e440]: 2026-12-31
                  - generic [ref=e441]:
                    - generic [ref=e442]: Source Module
                    - combobox [ref=e443]:
                      - option "Procurement" [selected]
                      - option "HR"
                      - option "Finance"
                      - option "Projects"
                      - option "ESS"
                      - option "Storefront"
              - generic [ref=e444]:
                - generic [ref=e445]:
                  - paragraph [ref=e446]: Accrual Lines
                  - button "Add Line" [ref=e447]:
                    - img [ref=e448]
                    - text: Add Line
                - table [ref=e450]:
                  - rowgroup [ref=e451]:
                    - row "Account Description Debit (₦) Credit (₦)" [ref=e452]:
                      - columnheader "Account" [ref=e453]
                      - columnheader "Description" [ref=e454]
                      - columnheader "Debit (₦)" [ref=e455]
                      - columnheader "Credit (₦)" [ref=e456]
                      - columnheader [ref=e457]
                  - rowgroup [ref=e458]:
                    - row "Select account..." [ref=e459]:
                      - cell "Select account..." [ref=e460]:
                        - combobox [ref=e461]:
                          - option "Select account..." [selected]
                          - option "1100 — Current Assets (Assets)"
                          - option "1110 — Cash & Bank (Assets)"
                          - option "1120 — Accounts Receivable (Assets)"
                          - option "1200 — Fixed Assets (Assets)"
                          - option "1210 — Plant & Equipment (Assets)"
                          - option "2100 — Current Liabilities (Liabilities)"
                          - option "2110 — Accounts Payable (Liabilities)"
                          - option "2120 — Accrued Expenses (Liabilities)"
                          - option "3100 — Retained Earnings (Equity)"
                          - option "4100 — Contract Revenue (Income)"
                          - option "4200 — Service Income (Income)"
                          - option "5100 — Labour Costs (Expenses)"
                          - option "5200 — Material Costs (Expenses)"
                          - option "5300 — Equipment Costs (Expenses)"
                          - option "5400 — Overhead (Expenses)"
                      - cell [ref=e462]:
                        - textbox "Line description" [ref=e463]
                      - cell [ref=e464]:
                        - spinbutton [ref=e465]
                      - cell [ref=e466]:
                        - spinbutton [ref=e467]
                      - cell [ref=e468]
                    - row "Select account..." [ref=e469]:
                      - cell "Select account..." [ref=e470]:
                        - combobox [ref=e471]:
                          - option "Select account..." [selected]
                          - option "1100 — Current Assets (Assets)"
                          - option "1110 — Cash & Bank (Assets)"
                          - option "1120 — Accounts Receivable (Assets)"
                          - option "1200 — Fixed Assets (Assets)"
                          - option "1210 — Plant & Equipment (Assets)"
                          - option "2100 — Current Liabilities (Liabilities)"
                          - option "2110 — Accounts Payable (Liabilities)"
                          - option "2120 — Accrued Expenses (Liabilities)"
                          - option "3100 — Retained Earnings (Equity)"
                          - option "4100 — Contract Revenue (Income)"
                          - option "4200 — Service Income (Income)"
                          - option "5100 — Labour Costs (Expenses)"
                          - option "5200 — Material Costs (Expenses)"
                          - option "5300 — Equipment Costs (Expenses)"
                          - option "5400 — Overhead (Expenses)"
                      - cell [ref=e472]:
                        - textbox "Line description" [ref=e473]
                      - cell [ref=e474]:
                        - spinbutton [ref=e475]
                      - cell [ref=e476]:
                        - spinbutton [ref=e477]
                      - cell [ref=e478]
                  - rowgroup [ref=e479]:
                    - row "Total 0 0" [ref=e480]:
                      - cell "Total" [ref=e481]
                      - cell "0" [ref=e482]
                      - cell "0" [ref=e483]
                      - cell [ref=e484]
              - generic [ref=e485]:
                - text: This accrual will be recorded under
                - strong [ref=e486]: FY 2026
            - generic [ref=e487]:
              - button "Cancel" [ref=e488]
              - button "Save as Draft" [ref=e489]:
                - img [ref=e490]
                - text: Save as Draft
  - region "Notifications alt+T"
```

# Test source

```ts
  73  |   await expect(taskRow).toBeVisible({ timeout: 10_000 });
  74  | });
  75  | 
  76  | // ─── Test 3 — Chart of Accounts Parent Ledger column ────────────────────
  77  | test("3 · Chart of Accounts table has a Parent Ledger column", async ({ page }) => {
  78  |   await goto(page, "/apps/finance/chart-of-accounts");
  79  |   // Look for the column header
  80  |   const header = page.locator("thead th, th").filter({ hasText: "Parent Ledger" });
  81  |   await expect(header).toBeVisible({ timeout: 10_000 });
  82  |   // Ensure at least one cell shows "Top-level" for root accounts
  83  |   const topLevelCell = page.locator("td").filter({ hasText: "Top-level" }).first();
  84  |   await expect(topLevelCell).toBeVisible();
  85  | });
  86  | 
  87  | // ─── Test 4 — Journal Entry reference auto-generated ────────────────────
  88  | test("4 · Journal Entry saves with auto-generated reference when field left blank", async ({ page }) => {
  89  |   await goto(page, "/apps/finance/journal-entries");
  90  | 
  91  |   // Clear any stale localStorage first so we start fresh
  92  |   await page.evaluate(() => localStorage.removeItem("buildos_journal_entries"));
  93  |   await page.reload();
  94  |   await page.waitForLoadState("networkidle");
  95  | 
  96  |   // Open new entry modal
  97  |   await page.getByRole("button", { name: /New Journal Entry/i }).click();
  98  | 
  99  |   // Fill description only — leave reference blank
  100 |   await page.getByPlaceholder(/Entry description/i).fill("Auto-ref test entry");
  101 | 
  102 |   // Fill two lines to make it balanced
  103 |   const rows = page.locator("table tbody tr");
  104 |   // Row 0: account + debit
  105 |   const row0accountSelect = rows.nth(0).locator("select").first();
  106 |   await row0accountSelect.selectOption({ label: "Cash & Bank" });
  107 |   await rows.nth(0).locator('input[type="number"]').first().fill("5000");
  108 |   // Row 1: account + credit
  109 |   const row1accountSelect = rows.nth(1).locator("select").first();
  110 |   await row1accountSelect.selectOption({ label: "Revenue" });
  111 |   await rows.nth(1).locator('input[type="number"]').nth(1).fill("5000");
  112 | 
  113 |   // Save as Draft
  114 |   await page.getByRole("button", { name: "Save as Draft" }).click();
  115 | 
  116 |   // The entry should appear in the table with a non-empty reference
  117 |   const refCell = page.locator("table td").filter({ hasText: /JE-REF-/i }).first();
  118 |   await expect(refCell).toBeVisible({ timeout: 8_000 });
  119 | });
  120 | 
  121 | // ─── Test 5 — Journal Entries persist across reload ──────────────────────
  122 | test("5 · Journal entries created in UI survive a page reload", async ({ page }) => {
  123 |   await goto(page, "/apps/finance/journal-entries");
  124 |   await page.evaluate(() => localStorage.removeItem("buildos_journal_entries"));
  125 |   await page.reload();
  126 |   await page.waitForLoadState("networkidle");
  127 | 
  128 |   // Create an entry
  129 |   await page.getByRole("button", { name: /New Journal Entry/i }).click();
  130 |   const uniqueDesc = `Persist-test-${Date.now()}`;
  131 |   await page.getByPlaceholder(/Entry description/i).fill(uniqueDesc);
  132 | 
  133 |   const rows = page.locator("table tbody tr");
  134 |   const row0acct = rows.nth(0).locator("select").first();
  135 |   await row0acct.selectOption({ label: "Cash & Bank" });
  136 |   await rows.nth(0).locator('input[type="number"]').first().fill("1000");
  137 |   const row1acct = rows.nth(1).locator("select").first();
  138 |   await row1acct.selectOption({ label: "Revenue" });
  139 |   await rows.nth(1).locator('input[type="number"]').nth(1).fill("1000");
  140 |   await page.getByRole("button", { name: "Save as Draft" }).click();
  141 | 
  142 |   // Verify it appears now
  143 |   await expect(page.locator("body")).toContainText(uniqueDesc);
  144 | 
  145 |   // Reload and check it's still there
  146 |   await page.reload();
  147 |   await page.waitForLoadState("networkidle");
  148 |   await expect(page.locator("body")).toContainText(uniqueDesc, { timeout: 8_000 });
  149 | });
  150 | 
  151 | // ─── Test 6 — Accruals persist ───────────────────────────────────────────
  152 | test("6 · New accrual entry persists after page reload", async ({ page }) => {
  153 |   await goto(page, "/apps/finance/accruals");
  154 | 
  155 |   // Clear stale accruals so seed data doesn't interfere
  156 |   await page.evaluate(() => localStorage.removeItem("buildos_accruals"));
  157 |   await page.reload();
  158 |   await page.waitForLoadState("networkidle");
  159 | 
  160 |   // Create a new accrual
  161 |   await page.getByRole("button", { name: /New Accrual/i }).click();
  162 |   const uniqueTitle = `AccrualPersist-${Date.now()}`;
  163 | 
  164 |   // Type
  165 |   await page.locator("select").first().selectOption({ index: 1 });
  166 |   // Title
  167 |   await page.getByPlaceholder(/GRNI/i).fill(uniqueTitle);
  168 |   // Reversal date
  169 |   await page.locator('input[type="date"]').first().fill("2026-12-31");
  170 | 
  171 |   // Fill two lines for balance — select accounts and amounts
  172 |   const trows = page.locator("table tbody tr");
> 173 |   await trows.nth(0).locator("select").selectOption({ index: 1 });
      |                                        ^ Error: locator.selectOption: Test timeout of 45000ms exceeded.
  174 |   await trows.nth(0).locator('input[type="number"]').first().fill("10000");
  175 |   await trows.nth(1).locator("select").selectOption({ index: 2 });
  176 |   await trows.nth(1).locator('input[type="number"]').nth(1).fill("10000");
  177 | 
  178 |   await page.getByRole("button", { name: /Save as Draft/i }).click();
  179 | 
  180 |   await expect(page.locator("body")).toContainText(uniqueTitle, { timeout: 8_000 });
  181 | 
  182 |   // Reload
  183 |   await page.reload();
  184 |   await page.waitForLoadState("networkidle");
  185 |   await expect(page.locator("body")).toContainText(uniqueTitle, { timeout: 8_000 });
  186 | });
  187 | 
  188 | // ─── Test 7 — Amount field label has no "(USD)" ──────────────────────────
  189 | test("7 · Add Expense modal shows Amount label without (USD)", async ({ page }) => {
  190 |   await goto(page, "/apps/finance/expenses");
  191 |   await page.getByRole("button", { name: /Add Expense/i }).click();
  192 |   // The label must NOT contain "(USD)"
  193 |   const amountLabel = page.locator("label").filter({ hasText: /Amount/i }).first();
  194 |   await expect(amountLabel).toBeVisible({ timeout: 8_000 });
  195 |   const labelText = await amountLabel.innerText();
  196 |   expect(labelText).not.toContain("(USD)");
  197 |   expect(labelText).not.toContain("USD");
  198 | });
  199 | 
  200 | // ─── Test 8 — Receipt upload input is wired ──────────────────────────────
  201 | test("8 · Add Expense modal receipt upload has a real <input type=file>", async ({ page }) => {
  202 |   await goto(page, "/apps/finance/expenses");
  203 |   await page.getByRole("button", { name: /Add Expense/i }).click();
  204 |   await page.waitForSelector('[type="file"]', { timeout: 8_000 });
  205 |   const fileInput = page.locator('[type="file"]');
  206 |   await expect(fileInput).toBeDefined();
  207 |   // Confirm it's hidden (styling), but present in the DOM
  208 |   const count = await fileInput.count();
  209 |   expect(count).toBeGreaterThan(0);
  210 | });
  211 | 
  212 | // ─── Test 9 — Draft expense has Edit + Delete; non-Paid has Edit only ───
  213 | test("9 · Draft expense has Edit and Delete buttons; Paid has neither", async ({ page }) => {
  214 |   await goto(page, "/apps/finance/expenses");
  215 |   // Ensure we can see the table
  216 |   await page.waitForSelector("table", { timeout: 10_000 });
  217 | 
  218 |   // Find draft row — EXP-0046 is "Draft" in seed data
  219 |   const draftRow = page.locator("tr").filter({ hasText: "EXP-0046" });
  220 |   await expect(draftRow).toBeVisible({ timeout: 8_000 });
  221 | 
  222 |   // Edit button (title="Edit")
  223 |   const editBtn = draftRow.locator('[title="Edit"]');
  224 |   await expect(editBtn).toBeVisible();
  225 | 
  226 |   // Delete button (title="Delete")
  227 |   const deleteBtn = draftRow.locator('[title="Delete"]');
  228 |   await expect(deleteBtn).toBeVisible();
  229 | 
  230 |   // Paid row (EXP-0048) — no Edit or Delete
  231 |   const paidRow = page.locator("tr").filter({ hasText: "EXP-0048" });
  232 |   await expect(paidRow).toBeVisible();
  233 |   await expect(paidRow.locator('[title="Edit"]')).not.toBeVisible();
  234 |   await expect(paidRow.locator('[title="Delete"]')).not.toBeVisible();
  235 | });
  236 | 
  237 | // ─── Test 10 — Expenses persist across reload ────────────────────────────
  238 | test("10 · New expense persists after page reload", async ({ page }) => {
  239 |   await goto(page, "/apps/finance/expenses");
  240 |   await page.evaluate(() => localStorage.removeItem("buildos_expenses"));
  241 |   await page.reload();
  242 |   await page.waitForLoadState("networkidle");
  243 | 
  244 |   await page.getByRole("button", { name: /Add Expense/i }).click();
  245 | 
  246 |   // Fill form
  247 |   await page.locator("select").first().selectOption("Lekki Tower A");
  248 |   await page.locator("select").nth(1).selectOption("Materials");
  249 |   const uniqueDesc = `PersistExpense-${Date.now()}`;
  250 |   await page.locator('input[placeholder="e.g. 45000"]').fill("12345");
  251 |   await page.locator("textarea").fill(uniqueDesc);
  252 | 
  253 |   // Save as Draft
  254 |   await page.getByRole("button", { name: /Save as Draft/i }).click();
  255 | 
  256 |   await expect(page.locator("body")).toContainText(uniqueDesc, { timeout: 8_000 });
  257 | 
  258 |   // Reload
  259 |   await page.reload();
  260 |   await page.waitForLoadState("networkidle");
  261 |   await expect(page.locator("body")).toContainText(uniqueDesc, { timeout: 8_000 });
  262 | });
  263 | 
```