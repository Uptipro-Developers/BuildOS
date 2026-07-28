# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fixes.spec.ts >> 2 · Finance Tasks page shows Edit and Delete buttons without requiring hover
- Location: e2e/fixes.spec.ts:68:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[title="Edit task"], [title="Delete task"]').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[title="Edit task"], [title="Delete task"]').first()

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
  - heading "Tasks" [level=1]
  - paragraph: Manage and track team tasks
  - button "New Task":
    - img
    - text: New Task
  - button "Pending 0":
    - img
    - paragraph: Pending
    - paragraph: "0"
  - button "In Progress 1":
    - img
    - paragraph: In Progress
    - paragraph: "1"
  - button "Completed 0":
    - img
    - paragraph: Completed
    - paragraph: "0"
  - img
  - textbox "Search tasks..."
  - button "All"
  - button "Pending"
  - button "In Progress"
  - button "Completed"
  - button "Mark as Completed":
    - img
  - paragraph: Review Q1 expense reports
  - text: In Progress High Process Overdue
  - paragraph: Validate all Q1 submissions before audit.
  - img
  - text: Amara Lawson
  - img
  - text: Due 2026-04-18
  - button:
    - img
  - button:
    - img
- region "Notifications alt+T"
```

# Test source

```ts
  1   | /**
  2   |  * BuildOS — fix-verification suite (2026-07-28)
  3   |  *
  4   |  * Covers every fix shipped in the last session:
  5   |  *  1. Admin sidebar has no "Departments" link
  6   |  *  2. Finance Tasks — Edit & Delete buttons always visible
  7   |  *  3. Chart of Accounts — "Parent Ledger" column shown in table
  8   |  *  4. Journal Entry — reference auto-generated when left blank
  9   |  *  5. Journal entries persist across page reload (localStorage)
  10  |  *  6. Accruals persist new entries across page reload (localStorage)
  11  |  *  7. Add Expense modal has "Amount *" (no "(USD)")
  12  |  *  8. Add Expense modal receipt upload input is wired
  13  |  *  9. Draft expense has Edit + Delete buttons; non-Draft non-Paid has Edit only
  14  |  * 10. Expenses persist across page reload (localStorage)
  15  |  *
  16  |  * Run:
  17  |  *   npx playwright test e2e/fixes.spec.ts --reporter=list
  18  |  */
  19  | 
  20  | import { test, expect, type Page } from "@playwright/test";
  21  | 
  22  | const API = "http://localhost:8090/api";
  23  | 
  24  | // ── Auth helper ─────────────────────────────────────────────────────────────
  25  | async function injectAuth(page: Page) {
  26  |   const res = await page.request.post(`${API}/auth/login`, {
  27  |     data: { email: "admin@buildos.ng", password: "BuildOS@2025" },
  28  |   });
  29  |   if (!res.ok()) {
  30  |     // Dev mode — inject dummy tokens so the app renders (no real API needed)
  31  |     await page.addInitScript(() => {
  32  |       localStorage.setItem("auth_token", "dev-token");
  33  |       localStorage.setItem("refresh_token", "dev-refresh");
  34  |       localStorage.setItem(
  35  |         "auth_user",
  36  |         JSON.stringify({ id: "u1", name: "Test Admin", email: "admin@buildos.ng", role: "Admin" }),
  37  |       );
  38  |     });
  39  |     return;
  40  |   }
  41  |   const { access_token, refresh_token, user } = await res.json();
  42  |   await page.addInitScript(
  43  |     ({ at, rt, u }) => {
  44  |       localStorage.setItem("auth_token", at);
  45  |       localStorage.setItem("refresh_token", rt);
  46  |       localStorage.setItem("auth_user", JSON.stringify(u));
  47  |     },
  48  |     { at: access_token, rt: refresh_token, u: user },
  49  |   );
  50  | }
  51  | 
  52  | async function goto(page: Page, path: string) {
  53  |   await injectAuth(page);
  54  |   await page.goto(path);
  55  |   await page.waitForLoadState("networkidle");
  56  | }
  57  | 
  58  | // ─── Test 1 — Admin has NO Departments link ──────────────────────────────
  59  | test("1 · Admin sidebar has no Departments navigation link", async ({ page }) => {
  60  |   await goto(page, "/apps/admin");
  61  |   // Wait for sidebar to render
  62  |   await page.waitForSelector("nav", { timeout: 10_000 });
  63  |   const sidebar = page.locator("nav");
  64  |   await expect(sidebar).not.toContainText("Departments", { timeout: 5_000 });
  65  | });
  66  | 
  67  | // ─── Test 2 — Finance Tasks Edit/Delete always visible ───────────────────
  68  | test("2 · Finance Tasks page shows Edit and Delete buttons without requiring hover", async ({ page }) => {
  69  |   await goto(page, "/apps/finance/tasks");
  70  |   // Wait for task list to appear
  71  |   const taskRow = page.locator('[title="Edit task"], [title="Delete task"]').first();
  72  |   // They should be immediately visible (no opacity-0)
> 73  |   await expect(taskRow).toBeVisible({ timeout: 10_000 });
      |                         ^ Error: expect(locator).toBeVisible() failed
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
  173 |   await trows.nth(0).locator("select").selectOption({ index: 1 });
```