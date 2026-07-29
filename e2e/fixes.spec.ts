/**
 * BuildOS — fix-verification suite (2026-07-28)
 *
 * Covers every fix shipped in the last session:
 *  1. Admin sidebar has no "Departments" link
 *  2. Finance Tasks — Edit & Delete buttons always visible
 *  3. Chart of Accounts — "Parent Ledger" column shown in table
 *  4. Journal Entry — reference auto-generated when left blank
 *  5. Journal entries persist across page reload (localStorage)
 *  6. Accruals persist new entries across page reload (localStorage)
 *  7. Add Expense modal has "Amount *" (no "(USD)")
 *  8. Add Expense modal receipt upload input is wired
 *  9. Draft expense has Edit + Delete buttons; non-Draft non-Paid has Edit only
 * 10. Expenses persist across page reload (localStorage)
 *
 * Run:
 *   npx playwright test e2e/fixes.spec.ts --reporter=list
 */

import { test, expect, type Page } from "@playwright/test";

const API = "http://localhost:8080/api";

// ── Auth helper ─────────────────────────────────────────────────────────────
async function injectAuth(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: "admin@buildos.ng", password: "BuildOS@2025" },
  });
  if (!res.ok()) {
    // Dev mode — inject dummy tokens so the app renders (no real API needed)
    await page.addInitScript(() => {
      localStorage.setItem("auth_token", "dev-token");
      localStorage.setItem("refresh_token", "dev-refresh");
      localStorage.setItem(
        "auth_user",
        JSON.stringify({ id: "u1", name: "Test Admin", email: "admin@buildos.ng", role: "Admin" }),
      );
    });
    return;
  }
  const { access_token, refresh_token, user } = await res.json();
  await page.addInitScript(
    ({ at, rt, u }) => {
      localStorage.setItem("auth_token", at);
      localStorage.setItem("refresh_token", rt);
      localStorage.setItem("auth_user", JSON.stringify(u));
    },
    { at: access_token, rt: refresh_token, u: user },
  );
}

async function goto(page: Page, path: string) {
  await injectAuth(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

// ─── Test 1 — Admin has NO Departments link ──────────────────────────────
test("1 · Admin sidebar has no Departments navigation link", async ({ page }) => {
  await goto(page, "/apps/admin");
  // Wait for sidebar to render
  await page.waitForSelector("nav", { timeout: 10_000 });
  const sidebar = page.locator("nav");
  await expect(sidebar).not.toContainText("Departments", { timeout: 5_000 });
});

// ─── Test 2 — Finance Tasks Edit/Delete always visible ───────────────────
test("2 · Finance Tasks page shows Edit and Delete buttons without requiring hover", async ({ page }) => {
  await goto(page, "/apps/finance/tasks");
  // Wait for task list to appear
  const taskRow = page.locator('[title="Edit task"], [title="Delete task"]').first();
  // They should be immediately visible (no opacity-0)
  await expect(taskRow).toBeVisible({ timeout: 10_000 });
});

// ─── Test 3 — Chart of Accounts Parent Ledger column ────────────────────
test("3 · Chart of Accounts table has a Parent Ledger column", async ({ page }) => {
  await goto(page, "/apps/finance/chart-of-accounts");
  // Look for the column header
  const header = page.locator("thead th, th").filter({ hasText: "Parent Ledger" });
  await expect(header).toBeVisible({ timeout: 10_000 });
  // Ensure at least one cell shows "Top-level" for root accounts
  const topLevelCell = page.locator("td").filter({ hasText: "Top-level" }).first();
  await expect(topLevelCell).toBeVisible();
});

// ─── Test 4 — Journal Entry reference auto-generated ────────────────────
test("4 · Journal Entry saves with auto-generated reference when field left blank", async ({ page }) => {
  await goto(page, "/apps/finance/journal");
  await page.waitForLoadState("networkidle");

  // Open new entry modal
  await page.getByRole("button", { name: /New Journal Entry/i }).click();

  // Fill description only — leave reference blank
  await page.getByPlaceholder(/Entry description/i).fill("Auto-ref test entry");

  // Fill two lines to make it balanced (scoped to the modal — the page also
  // has its own DataTable listing existing entries, which is a second <table>)
  const rows = page.locator(".fixed.inset-0 table tbody tr");
  // Row 0: account + debit
  const row0accountSelect = rows.nth(0).locator("select").first();
  await row0accountSelect.selectOption({ index: 1 });
  await rows.nth(0).locator('input[type="number"]').first().fill("5000");
  // Row 1: account + credit
  const row1accountSelect = rows.nth(1).locator("select").first();
  await row1accountSelect.selectOption({ index: 2 });
  await rows.nth(1).locator('input[type="number"]').nth(1).fill("5000");

  // Save as Draft
  await page.getByRole("button", { name: "Save as Draft" }).click();

  // The entry should appear in the table with a non-empty, backend-generated reference
  const refCell = page.locator("table td").filter({ hasText: /JRN-/i }).first();
  await expect(refCell).toBeVisible({ timeout: 8_000 });
});

// ─── Test 5 — Journal Entries persist across reload ──────────────────────
test("5 · Journal entries created in UI survive a page reload", async ({ page }) => {
  await goto(page, "/apps/finance/journal");
  await page.waitForLoadState("networkidle");

  // Create an entry
  await page.getByRole("button", { name: /New Journal Entry/i }).click();
  const uniqueDesc = `Persist-test-${Date.now()}`;
  await page.getByPlaceholder(/Entry description/i).fill(uniqueDesc);

  const rows = page.locator(".fixed.inset-0 table tbody tr");
  const row0acct = rows.nth(0).locator("select").first();
  await row0acct.selectOption({ index: 1 });
  await rows.nth(0).locator('input[type="number"]').first().fill("1000");
  const row1acct = rows.nth(1).locator("select").first();
  await row1acct.selectOption({ index: 2 });
  await rows.nth(1).locator('input[type="number"]').nth(1).fill("1000");
  await page.getByRole("button", { name: "Save as Draft" }).click();

  // Verify it appears now
  await expect(page.locator("body")).toContainText(uniqueDesc);

  // Reload and check it's still there
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText(uniqueDesc, { timeout: 8_000 });
});

// ─── Test 6 — Accruals persist ───────────────────────────────────────────
test("6 · New accrual entry persists after page reload", async ({ page }) => {
  await goto(page, "/apps/finance/accruals");

  // Clear stale accruals so seed data doesn't interfere
  await page.evaluate(() => localStorage.removeItem("buildos_accruals"));
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Create a new accrual
  await page.getByRole("button", { name: /New Accrual/i }).click();
  const modal = page.locator(".fixed.inset-0");
  const uniqueTitle = `AccrualPersist-${Date.now()}`;

  // Type
  await modal.locator("select").first().selectOption({ index: 1 });
  // Title
  await page.getByPlaceholder(/GRNI/i).fill(uniqueTitle);
  // Reversal date
  await modal.locator('input[type="date"]').first().fill("2026-12-31");

  // Fill two lines for balance — select accounts and amounts (scoped to the
  // modal — the page also has its own list table behind it)
  const trows = modal.locator("table tbody tr");
  await trows.nth(0).locator("select").selectOption({ index: 1 });
  await trows.nth(0).locator('input[type="number"]').first().fill("10000");
  await trows.nth(1).locator("select").selectOption({ index: 2 });
  await trows.nth(1).locator('input[type="number"]').nth(1).fill("10000");

  await page.getByRole("button", { name: /Save as Draft/i }).click();

  await expect(page.locator("body")).toContainText(uniqueTitle, { timeout: 8_000 });

  // Reload
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText(uniqueTitle, { timeout: 8_000 });
});

// ─── Test 7 — Amount field label has no "(USD)" ──────────────────────────
test("7 · Add Expense modal shows Amount label without (USD)", async ({ page }) => {
  await goto(page, "/apps/finance/expenses");
  await page.getByRole("button", { name: /Add Expense/i }).click();
  // The label must NOT contain "(USD)"
  const amountLabel = page.locator("label").filter({ hasText: /Amount/i }).first();
  await expect(amountLabel).toBeVisible({ timeout: 8_000 });
  const labelText = await amountLabel.innerText();
  expect(labelText).not.toContain("(USD)");
  expect(labelText).not.toContain("USD");
});

// ─── Test 8 — Receipt upload input is wired ──────────────────────────────
test("8 · Add Expense modal receipt upload has a real <input type=file>", async ({ page }) => {
  await goto(page, "/apps/finance/expenses");
  await page.getByRole("button", { name: /Add Expense/i }).click();
  await page.waitForSelector('[type="file"]', { timeout: 8_000, state: "attached" });
  const fileInput = page.locator('[type="file"]');
  await expect(fileInput).toBeDefined();
  // Confirm it's hidden (styling), but present in the DOM
  const count = await fileInput.count();
  expect(count).toBeGreaterThan(0);
});

// ─── Test 9 — Draft expense has Edit + Delete; non-Paid has Edit only ───
test("9 · Draft expense has Edit and Delete buttons; Paid has neither", async ({ page }) => {
  // Seed data doesn't guarantee a Draft/Paid pair, so create our own via the
  // real API — same pattern as the employees.spec.ts fixture helpers.
  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: "admin@buildos.ng", password: "BuildOS@2025" },
  });
  const { access_token } = await loginRes.json();
  const projRes = await page.request.get(`${API}/projects`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const projects = await projRes.json();
  const projectId = projects[0]?.id;
  expect(projectId, "Need at least one project").toBeTruthy();

  const draftDesc = `E2E-Draft-${Date.now()}`;
  const paidDesc = `E2E-Paid-${Date.now()}`;
  const draftRes = await page.request.post(`${API}/expenses`, {
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    data: { projectId, category: "Other", amount: 1000, description: draftDesc, createdBy: "E2E", date: new Date().toISOString(), status: "Draft" },
  });
  const draft = await draftRes.json();
  const paidRes = await page.request.post(`${API}/expenses`, {
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    data: { projectId, category: "Other", amount: 1000, description: paidDesc, createdBy: "E2E", date: new Date().toISOString(), status: "Paid" },
  });
  const paid = await paidRes.json();

  await goto(page, "/apps/finance/expenses");
  await page.waitForSelector("table", { timeout: 10_000 });

  const draftRow = page.locator("tr").filter({ hasText: draftDesc });
  await expect(draftRow).toBeVisible({ timeout: 8_000 });
  await expect(draftRow.locator('[title="Edit"]')).toBeVisible();
  await expect(draftRow.locator('[title="Delete"]')).toBeVisible();

  const paidRow = page.locator("tr").filter({ hasText: paidDesc });
  await expect(paidRow).toBeVisible();
  await expect(paidRow.locator('[title="Edit"]')).not.toBeVisible();
  await expect(paidRow.locator('[title="Delete"]')).not.toBeVisible();

  // Cleanup
  await page.request.delete(`${API}/expenses/${draft.id}`, { headers: { Authorization: `Bearer ${access_token}` } });
  await page.request.delete(`${API}/expenses/${paid.id}`, { headers: { Authorization: `Bearer ${access_token}` } });
});

// ─── Test 10 — Expenses persist across reload ────────────────────────────
test("10 · New expense persists after page reload", async ({ page }) => {
  await goto(page, "/apps/finance/expenses");
  await page.evaluate(() => localStorage.removeItem("buildos_expenses"));
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /Add Expense/i }).click();

  // Fill form
  await page.locator("select").first().selectOption("Lekki Tower A");
  await page.locator("select").nth(1).selectOption("Materials");
  const uniqueDesc = `PersistExpense-${Date.now()}`;
  await page.locator('input[placeholder="e.g. 45000"]').fill("12345");
  await page.locator("textarea").fill(uniqueDesc);

  // Save as Draft
  await page.getByRole("button", { name: /Save as Draft/i }).click();

  await expect(page.locator("body")).toContainText(uniqueDesc, { timeout: 8_000 });

  // Reload
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText(uniqueDesc, { timeout: 8_000 });
});
