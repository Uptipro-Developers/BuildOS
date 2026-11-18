import { test, expect, type Page } from '@playwright/test';

const API = process.env.BUILDOS_API || 'http://127.0.0.1:3001/api';

async function authenticate(page: Page) {
  const response = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@buildos.ng', password: 'BuildOS@2025' },
  });
  expect(response.ok(), `admin login failed: ${await response.text()}`).toBeTruthy();
  const session = await response.json();
  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: session.user,
  });
}

async function openApp(page: Page, path: string) {
  await authenticate(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Unexpected Application Error!')).toHaveCount(0);
}

test('project creation includes partner assignment and onboarding controls', async ({ page }) => {
  await openApp(page, '/apps/construction/projects');
  await page.getByRole('button', { name: 'New Project' }).click();
  await expect(page.getByRole('heading', { name: 'Project Partners' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Partner' }).click();
  const taskInput = page.getByPlaceholder('Assigned task');
  await expect(taskInput).toBeVisible();
  await expect(taskInput.locator('..').locator('select').nth(1)).toBeVisible();
});

test('project BoQ and independent PO entry points render', async ({ page }) => {
  await openApp(page, '/apps/construction/boq-bom');
  await expect(page.getByText(/BoQ|Bill of Quantities/i).first()).toBeVisible();

  await page.goto('/apps/procurement/purchase-orders');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: 'Raise PO' })).toBeVisible();
  await page.getByRole('button', { name: 'Raise PO' }).click();
  await expect(page.getByText('Build lines from Project BoQ')).toBeVisible();
});

test('finance release screens expose PO payments and persistent accounts', async ({ page }) => {
  await openApp(page, '/apps/finance/purchase-invoice');
  await expect(page.getByRole('heading', { name: 'PO Payments' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Invoice' })).toHaveCount(0);

  await page.goto('/apps/finance/chart-of-accounts');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Chart of Accounts' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Account' })).toBeVisible();
});
