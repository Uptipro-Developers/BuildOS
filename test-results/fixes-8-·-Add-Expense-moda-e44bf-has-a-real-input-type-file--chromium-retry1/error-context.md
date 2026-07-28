# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fixes.spec.ts >> 8 · Add Expense modal receipt upload has a real <input type=file>
- Location: e2e/fixes.spec.ts:201:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('[type="file"]') to be visible

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
              - heading "Expense Management" [level=1] [ref=e181]
              - paragraph [ref=e182]: Track, submit, and approve all project expenses
            - button "Add Expense" [active] [ref=e184]:
              - img [ref=e185]
              - text: Add Expense
          - generic [ref=e186]:
            - generic [ref=e187]:
              - paragraph [ref=e188]: Total Expenses
              - paragraph [ref=e189]: "1"
              - paragraph [ref=e190]: $245,000 total value
            - generic [ref=e191]:
              - paragraph [ref=e192]: Awaiting Approval
              - paragraph [ref=e193]: "1"
              - paragraph [ref=e194]: Submitted expenses
            - generic [ref=e195]:
              - paragraph [ref=e196]: Approved & Paid
              - paragraph [ref=e197]: "0"
              - paragraph [ref=e198]: Completed this month
            - generic [ref=e199]:
              - paragraph [ref=e200]: Rejected
              - paragraph [ref=e201]: "0"
              - paragraph [ref=e202]: Require resubmission
          - generic [ref=e204]:
            - button "All" [ref=e205]
            - button "Draft" [ref=e206]
            - button "Submitted" [ref=e207]
            - button "Approved" [ref=e208]
            - button "Rejected" [ref=e209]
            - button "Sent to Finance" [ref=e210]
            - button "Paid" [ref=e211]
          - generic [ref=e212]:
            - generic [ref=e213]:
              - generic [ref=e215]:
                - img [ref=e216]
                - textbox "Search expenses..." [ref=e219]
              - generic [ref=e220]:
                - button "Export" [ref=e221]:
                  - img [ref=e222]
                  - text: Export
                - generic [ref=e225]: 1 records
            - table [ref=e227]:
              - rowgroup [ref=e228]:
                - row "Expense ID Project Category Description Amount ($) Status Created By Date Actions" [ref=e229]:
                  - columnheader "Expense ID" [ref=e230]:
                    - generic [ref=e231]:
                      - generic [ref=e232]: Expense ID
                      - button [ref=e234]:
                        - img [ref=e235]
                  - columnheader "Project" [ref=e238]:
                    - generic [ref=e239]:
                      - generic [ref=e240]: Project
                      - button [ref=e242]:
                        - img [ref=e243]
                  - columnheader "Category" [ref=e246]:
                    - generic [ref=e247]:
                      - generic [ref=e248]: Category
                      - button [ref=e250]:
                        - img [ref=e251]
                  - columnheader "Description" [ref=e254]:
                    - generic [ref=e255]:
                      - generic [ref=e256]: Description
                      - button [ref=e258]:
                        - img [ref=e259]
                  - columnheader "Amount ($)" [ref=e262]:
                    - generic [ref=e263]:
                      - generic [ref=e264]: Amount ($)
                      - button [ref=e266]:
                        - img [ref=e267]
                  - columnheader "Status" [ref=e270]:
                    - generic [ref=e271]:
                      - generic [ref=e272]: Status
                      - button [ref=e274]:
                        - img [ref=e275]
                  - columnheader "Created By" [ref=e278]:
                    - generic [ref=e279]:
                      - generic [ref=e280]: Created By
                      - button [ref=e282]:
                        - img [ref=e283]
                  - columnheader "Date" [ref=e286]:
                    - generic [ref=e287]:
                      - generic [ref=e288]: Date
                      - button [ref=e290]:
                        - img [ref=e291]
                  - columnheader "Actions" [ref=e294]:
                    - generic [ref=e296]: Actions
              - rowgroup [ref=e297]:
                - row "EXP-0051 Lekki Tower A Materials Cement and steel $245,000 Submitted Chukwudi Eze Apr 12, 2026 View" [ref=e298]:
                  - cell "EXP-0051" [ref=e299]
                  - cell "Lekki Tower A" [ref=e300]
                  - cell "Materials" [ref=e301]
                  - cell "Cement and steel" [ref=e302]:
                    - generic [ref=e303]: Cement and steel
                  - cell "$245,000" [ref=e304]
                  - cell "Submitted" [ref=e305]:
                    - generic [ref=e306]:
                      - img [ref=e307]
                      - text: Submitted
                  - cell "Chukwudi Eze" [ref=e310]
                  - cell "Apr 12, 2026" [ref=e311]
                  - cell "View" [ref=e312]:
                    - button "View" [ref=e313]:
                      - img [ref=e314]
                      - text: View
          - generic [ref=e318]:
            - generic [ref=e319]:
              - generic [ref=e320]:
                - img [ref=e321]
                - heading "Add Expense" [level=2] [ref=e324]
              - button [ref=e325]:
                - img [ref=e326]
            - generic [ref=e329]:
              - generic [ref=e330]:
                - generic [ref=e331]:
                  - generic [ref=e332]: Project *
                  - combobox [ref=e333]:
                    - option "Select project" [selected]
                    - option "Industrial Warehouse"
                    - option "Riverside Residential"
                    - option "Lekki Tower A"
                - generic [ref=e334]:
                  - generic [ref=e335]: Expense Category *
                  - combobox [ref=e336]:
                    - option "Select category" [selected]
                    - option "Materials"
              - generic [ref=e337]:
                - generic [ref=e338]: Amount (USD) *
                - textbox "e.g. 45000" [ref=e339]
              - generic [ref=e340]:
                - generic [ref=e341]: Description *
                - textbox "Describe the expense in detail..." [ref=e342]
              - generic [ref=e343]:
                - generic [ref=e344]: Receipt Upload
                - generic [ref=e345] [cursor=pointer]:
                  - img [ref=e346]
                  - paragraph [ref=e349]: Click to upload or drag and drop
                  - paragraph [ref=e350]: PDF, PNG, JPG up to 10MB
            - generic [ref=e351]:
              - button "Cancel" [ref=e352]
              - button "Save as Draft" [ref=e353]:
                - img [ref=e354]
                - text: Save as Draft
              - button "Submit" [ref=e358]:
                - img [ref=e359]
                - text: Submit
  - region "Notifications alt+T"
```

# Test source

```ts
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
  173 |   await trows.nth(0).locator("select").selectOption({ index: 1 });
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
> 204 |   await page.waitForSelector('[type="file"]', { timeout: 8_000 });
      |              ^ TimeoutError: page.waitForSelector: Timeout 8000ms exceeded.
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