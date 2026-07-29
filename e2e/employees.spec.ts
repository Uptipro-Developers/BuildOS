import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api';

/** Get a live JWT and inject it into localStorage before the page loads */
async function setupAuth(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@buildos.ng', password: 'BuildOS@2025' },
  });
  const { access_token, refresh_token, user } = await res.json();
  await page.addInitScript(
    ({ at, rt, u }) => {
      localStorage.setItem('auth_token', at);
      localStorage.setItem('refresh_token', rt);
      localStorage.setItem('auth_user', JSON.stringify(u));
    },
    { at: access_token, rt: refresh_token, u: user },
  );
}

/** Navigate to employees page and wait until the table is visible */
async function goToEmployees(page: Page) {
  await setupAuth(page);
  await page.goto('/apps/hr/employees');
  await page.waitForSelector('h1:has-text("All Employees")', { timeout: 20_000 });
  // Wait for employees to load (table rows appear)
  await page.waitForSelector('tbody tr', { timeout: 15_000 });
}

// ══════════════════════════════════════════════════════════════════════════
// FIX 1 — Role is persisted on Create (verified via direct API call)
// ══════════════════════════════════════════════════════════════════════════
test('Fix 1: backend saves the role field when creating an employee', async ({ page }) => {
  // Get a real auth token
  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@buildos.ng', password: 'BuildOS@2025' },
  });
  const { access_token } = await loginRes.json();

  // Get departments for a valid departmentId
  const deptRes = await page.request.get(`${API}/departments`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const depts = await deptRes.json();
  const departmentId = depts[0]?.id;
  expect(departmentId, 'Need at least one department').toBeTruthy();

  // Create an employee including a role
  const createRes = await page.request.post(`${API}/employees`, {
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    data: {
      firstName: 'Playwright',
      lastName: 'RoleTest',
      email: `roletest.e2e.${Date.now()}@test.buildos.ng`,
      phone: '+2341234567890',
      role: 'Senior E2E Engineer',
      departmentId,
      employmentType: 'FullTime',
      status: 'active',
      dateHired: new Date().toISOString(),
    },
  });

  expect(createRes.ok(), `Employee creation failed: ${await createRes.text()}`).toBeTruthy();
  const created = await createRes.json();

  // The role must be persisted in the returned record
  expect(created.role, 'role must be saved').toBe('Senior E2E Engineer');

  // Clean up
  await page.request.delete(`${API}/employees/${created.id}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FIX 2 — CSV Export produces a presentable file
// ══════════════════════════════════════════════════════════════════════════
test('Fix 2: CSV export has correct headers and ISO-format dates', async ({ page }) => {
  await goToEmployees(page);

  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Export CSV")');
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.csv$/);

  const path = await download.path();
  const { readFileSync } = await import('fs');
  const content = readFileSync(path!, 'utf-8');
  const lines = content.split('\r\n').filter(Boolean);

  // Header row must contain key columns
  expect(lines[0]).toContain('Employee ID');
  expect(lines[0]).toContain('First Name');
  expect(lines[0]).toContain('Date Hired');

  // Data rows must NOT contain locale-style dates or "undefined"
  if (lines.length > 1) {
    const row = lines[1];
    expect(row).not.toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
    expect(row).not.toContain('undefined');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// FIX 3 — Filter panel is single-column (all filters visible at once)
// ══════════════════════════════════════════════════════════════════════════
test('Fix 3: filter panel shows all filter fields simultaneously', async ({ page }) => {
  await goToEmployees(page);

  await page.click('button:has-text("Filters")');

  // All four field labels must be visible at the same time
  await expect(page.locator('p.uppercase:has-text("Role / Position")').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('p.uppercase:has-text("Department")').first()).toBeVisible();
  await expect(page.locator('p.uppercase:has-text("Status")').first()).toBeVisible();
  await expect(page.locator('p.uppercase:has-text("Employment Type")').first()).toBeVisible();

  // Old two-column sidebar element must NOT exist
  await expect(page.locator('.w-44.border-r')).toHaveCount(0);

  // Status options appear as pill buttons (not checkboxes)
  const activePill = page.locator('button:has-text("active")').first();
  await expect(activePill).toBeVisible();
  await activePill.click();
  await expect(activePill).toHaveClass(/bg-indigo-700/);
});

// ══════════════════════════════════════════════════════════════════════════
// FIX 4 — Edit employee saves without error
// ══════════════════════════════════════════════════════════════════════════
test('Fix 4: editing an employee saves successfully without an error toast', async ({ page }) => {
  await goToEmployees(page);

  // Go to first employee's profile
  await page.locator('tbody tr').first().click();
  await page.waitForURL('**/employees/**', { timeout: 10_000 });

  await page.click('button:has-text("Edit Employee")');
  await expect(page.locator('h2:has-text("Edit Employee")')).toBeVisible({ timeout: 8_000 });

  // Change the role field (Job Title / Role input inside the modal)
  // 5th input in the modal (0-indexed: First, Last, Email, Phone, Role)
  const modalInputs = page.locator('div.fixed input:not([type="date"]):not([type="number"])').all();
  const inputs = await modalInputs;
  if (inputs.length >= 5) await inputs[4].fill('Playwright Updated Role');
  else await page.locator('div.fixed input').nth(4).fill('Playwright Updated Role');

  // Save
  await page.click('button:has-text("Save Changes")');
  await page.waitForTimeout(3000);

  // Must NOT show an error toast
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(errorToast).toHaveCount(0);

  // Modal must close on success
  await expect(page.locator('h2:has-text("Edit Employee")')).not.toBeVisible({ timeout: 8000 });
});

// ══════════════════════════════════════════════════════════════════════════
// FIX 5 — Edit modal validates email and phone before saving
// ══════════════════════════════════════════════════════════════════════════
test('Fix 5: edit modal blocks save and shows validation errors', async ({ page }) => {
  await goToEmployees(page);
  await page.locator('tbody tr').first().click();
  await page.waitForURL('**/employees/**', { timeout: 10_000 });

  await page.click('button:has-text("Edit Employee")');
  await expect(page.locator('h2:has-text("Edit Employee")')).toBeVisible({ timeout: 8_000 });

  // Enter an invalid email
  await page.locator('div.fixed input[type="email"]').first().fill('not-an-email');
  // Enter an invalid phone
  await page.locator('div.fixed').locator('label:has-text("Phone") + input').first().fill('abc!!');

  // Attempt to save
  await page.click('button:has-text("Save Changes")');

  // Validation error messages must appear
  await expect(page.locator('text=Enter a valid email address')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Enter a valid phone number')).toBeVisible({ timeout: 3000 });

  // Modal stays open — save was prevented
  await expect(page.locator('h2:has-text("Edit Employee")')).toBeVisible();
});

// ══════════════════════════════════════════════════════════════════════════
// FIX 6 — Employee ID is consistent between list and profile
// ══════════════════════════════════════════════════════════════════════════
test('Fix 6: employee ID on the list matches the ID on the profile page', async ({ page }) => {
  await goToEmployees(page);

  // Capture the display ID shown in the first row of the table
  const listId = (await page.locator('tbody tr').first().locator('td').first().innerText()).trim();
  // Must be a formatted ID like EMP-001, not a raw UUID
  expect(listId).toMatch(/^[A-Z]+-\d+$/);

  // Click to go to the profile
  await page.locator('tbody tr').first().click();
  await page.waitForURL('**/employees/**', { timeout: 10_000 });

  // The profile header must show the same formatted ID
  const profileId = (await page.locator('p.font-mono').first().innerText()).trim();
  expect(profileId, `Profile ID "${profileId}" must equal list ID "${listId}"`).toBe(listId);

  // Employment tab must also show the same ID
  await page.click('button:has-text("Employment")');
  await expect(page.locator(`text=${listId}`).first()).toBeVisible({ timeout: 5000 });
});

// ══════════════════════════════════════════════════════════════════════════
// FIX 7 — Activity Log tab shows real content, not a placeholder
// ══════════════════════════════════════════════════════════════════════════
test('Fix 7: Activity Log tab renders dynamic content, not the old placeholder', async ({ page }) => {
  await goToEmployees(page);
  await page.locator('tbody tr').first().click();
  await page.waitForURL('**/employees/**', { timeout: 10_000 });

  // Click the Activity Log tab
  await page.click('button:has-text("Activity Log")');
  await page.waitForTimeout(2000);

  // Old static "not yet available" placeholder must NOT appear
  await expect(page.locator('text=Activity history not yet available')).toHaveCount(0);
  await expect(page.locator('text=audit trail module is integrated')).toHaveCount(0);

  // Must show either real items or the "no records yet" empty state
  const hasItems = (await page.locator('ul li').count()) > 0;
  const hasEmptyState = await page.locator('text=No activity recorded yet.').isVisible().catch(() => false);
  expect(
    hasItems || hasEmptyState,
    'Activity Log tab must show a real component, not the old static placeholder'
  ).toBeTruthy();
});
