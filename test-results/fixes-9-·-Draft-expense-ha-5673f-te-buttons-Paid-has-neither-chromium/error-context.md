# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fixes.spec.ts >> 9 · Draft expense has Edit and Delete buttons; Paid has neither
- Location: e2e/fixes.spec.ts:213:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('tr').filter({ hasText: 'EXP-0046' })
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('tr').filter({ hasText: 'EXP-0046' })

```

```yaml
- banner:
  - link "Build OS":
    - /url: /apps
  - button "Finance":
    - img
    - text: Finance
    - img
  - button:
    - img
  - button "AU Admin User admin":
    - text: AU
    - paragraph: Admin User
    - paragraph: admin
    - img
- complementary:
  - navigation:
    - link "Dashboard":
      - /url: /apps/finance/dashboard
      - img
      - text: Dashboard
    - button "Tasks":
      - text: Tasks
      - img
    - link "Tasks":
      - /url: /apps/finance/tasks
      - img
      - text: Tasks
    - link "My Tasks":
      - /url: /apps/finance/my-tasks
      - img
      - text: My Tasks
    - button "Accounting":
      - text: Accounting
      - img
    - link "Chart of Accounts":
      - /url: /apps/finance/chart-of-accounts
      - img
      - text: Chart of Accounts
    - link "Journal Entries":
      - /url: /apps/finance/journal
      - img
      - text: Journal Entries
    - link "Accruals":
      - /url: /apps/finance/accruals
      - img
      - text: Accruals
    - button "Expenses & Income":
      - text: Expenses & Income
      - img
    - link "Expense Management":
      - /url: /apps/finance/expenses
      - img
      - text: Expense Management
    - link "Income Management":
      - /url: /apps/finance/income
      - img
      - text: Income Management
    - button "Financial Management":
      - text: Financial Management
      - img
    - link "Budget Management":
      - /url: /apps/finance/budget
      - img
      - text: Budget Management
    - link "Payment Management":
      - /url: /apps/finance/payments
      - img
      - text: Payment Management
    - link "Purchase Invoice":
      - /url: /apps/finance/purchase-invoice
      - img
      - text: Purchase Invoice
    - button "Payroll & Claims":
      - text: Payroll & Claims
      - img
    - link "Payroll Integration":
      - /url: /apps/finance/payroll
      - img
      - text: Payroll Integration
    - link "Claims Management":
      - /url: /apps/finance/claims
      - img
      - text: Claims Management
    - button "Period End":
      - text: Period End
      - img
    - link "Year-End Close":
      - /url: /apps/finance/year-end-close
      - img
      - text: Year-End Close
    - link "Fiscal Years":
      - /url: /apps/finance/fiscal-years
      - img
      - text: Fiscal Years
    - button "Approvals":
      - text: Approvals
      - img
    - link "Approvals":
      - /url: /apps/finance/approvals
      - img
      - text: Approvals
    - button "Ledger & Reports":
      - text: Ledger & Reports
      - img
    - link "Transactions Ledger":
      - /url: /apps/finance/ledger
      - img
      - text: Transactions Ledger
    - link "Posting Engine":
      - /url: /apps/finance/posting-engine
      - img
      - text: Posting Engine
    - link "Reports":
      - /url: /apps/finance/reports
      - img
      - text: Reports
    - button "Configuration":
      - text: Configuration
      - img
    - link "Finance Configuration":
      - /url: /apps/finance/config
      - img
      - text: Finance Configuration
    - link "Process Mapping":
      - /url: /apps/finance/process-mapping
      - img
      - text: Process Mapping
- main:
  - heading "Expense Management" [level=1]
  - paragraph: Track, submit, and approve all project expenses
  - button "Add Expense":
    - img
    - text: Add Expense
  - paragraph: Total Expenses
  - paragraph: "1"
  - paragraph: $245,000 total value
  - paragraph: Awaiting Approval
  - paragraph: "1"
  - paragraph: Submitted expenses
  - paragraph: Approved & Paid
  - paragraph: "0"
  - paragraph: Completed this month
  - paragraph: Rejected
  - paragraph: "0"
  - paragraph: Require resubmission
  - button "All"
  - button "Draft"
  - button "Submitted"
  - button "Approved"
  - button "Rejected"
  - button "Sent to Finance"
  - button "Paid"
  - img
  - textbox "Search expenses..."
  - button "Export":
    - img
    - text: Export
  - text: 1 records
  - table:
    - rowgroup:
      - row "Expense ID Project Category Description Amount ($) Status Created By Date Actions":
        - columnheader "Expense ID":
          - text: Expense ID
          - button:
            - img
        - columnheader "Project":
          - text: Project
          - button:
            - img
        - columnheader "Category":
          - text: Category
          - button:
            - img
        - columnheader "Description":
          - text: Description
          - button:
            - img
        - columnheader "Amount ($)":
          - text: Amount ($)
          - button:
            - img
        - columnheader "Status":
          - text: Status
          - button:
            - img
        - columnheader "Created By":
          - text: Created By
          - button:
            - img
        - columnheader "Date":
          - text: Date
          - button:
            - img
        - columnheader "Actions"
    - rowgroup:
      - row "EXP-0051 Lekki Tower A Materials Cement and steel $245,000 Submitted Chukwudi Eze Apr 12, 2026 View":
        - cell "EXP-0051"
        - cell "Lekki Tower A"
        - cell "Materials"
        - cell "Cement and steel"
        - cell "$245,000"
        - cell "Submitted":
          - img
          - text: Submitted
        - cell "Chukwudi Eze"
        - cell "Apr 12, 2026"
        - cell "View":
          - button "View":
            - img
            - text: View
- region "Notifications alt+T"
```

# Test source

```ts
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
> 220 |   await expect(draftRow).toBeVisible({ timeout: 8_000 });
      |                          ^ Error: expect(locator).toBeVisible() failed
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