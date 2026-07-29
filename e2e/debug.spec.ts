import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080/api';

test('debug: capture page state after auth injection', async ({ page }) => {
  // Get a live token
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'admin@buildos.ng', password: 'BuildOS@2025' },
  });

  expect(res.ok()).toBeTruthy();
  const { access_token, refresh_token, user } = await res.json();

  // Inject tokens before navigation
  await page.addInitScript(
    ({ at, rt, u }) => {
      localStorage.setItem('auth_token', at);
      localStorage.setItem('refresh_token', rt);
      localStorage.setItem('auth_user', JSON.stringify(u));
    },
    { at: access_token, rt: refresh_token, u: user },
  );

  // Navigate to the app
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Take screenshot to see what's rendered
  await page.screenshot({ path: '/tmp/debug-root.png' });
  console.log('Root URL:', page.url());
  console.log('Title:', await page.title());

  // Navigate directly to employees
  await page.goto('/apps/hr/employees');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/debug-employees.png' });
  console.log('Employees URL:', page.url());
  const bodyText = await page.locator('body').innerText().catch(() => 'error');
  console.log('Body text (first 500):', bodyText.slice(0, 500));
});
