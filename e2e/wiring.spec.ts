/**
 * BuildOS — cross-module wiring smoke suite (BDD-style)
 *
 * Given an authenticated admin session, when the user navigates to each
 * module's primary routes, then the page should render its real content
 * (not a 404/error boundary, not a blank screen) with no uncaught JS errors.
 *
 * This is a breadth check across all 7 apps, complementing the deeper,
 * feature-specific assertions in employees.spec.ts and fixes.spec.ts.
 *
 * Run:
 *   npx playwright test e2e/wiring.spec.ts --reporter=list
 */

import { test, expect, type Page } from "@playwright/test";

const API = process.env.BUILDOS_API || "http://localhost:8080/api";

async function givenLoggedInAsAdmin(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: "admin@buildos.ng", password: "BuildOS@2025" },
  });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
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

interface RouteCheck {
  app: string;
  path: string;
  expectText: RegExp | string;
}

// One representative slice of routes per app — enough to prove each
// module's router wiring, data fetching, and layout shell all work.
const ROUTES: RouteCheck[] = [
  { app: "Construction", path: "/apps/construction/dashboard", expectText: /Portfolio|Dashboard/i },
  { app: "Construction", path: "/apps/construction/projects", expectText: /Projects/i },
  { app: "Finance", path: "/apps/finance/dashboard", expectText: /Finance/i },
  { app: "Finance", path: "/apps/finance/journal", expectText: /Journal Entries/i },
  { app: "Finance", path: "/apps/finance/expenses", expectText: /Expense Management/i },
  { app: "Finance", path: "/apps/finance/accruals", expectText: /Accrual/i },
  { app: "Procurement", path: "/apps/procurement/dashboard", expectText: /Procurement/i },
  { app: "Procurement", path: "/apps/procurement/suppliers", expectText: /Suppliers/i },
  { app: "HR", path: "/apps/hr/dashboard", expectText: /HR Dashboard/i },
  { app: "HR", path: "/apps/hr/employees", expectText: /All Employees|Employees/i },
  { app: "HR", path: "/apps/hr/departments", expectText: /Departments/i },
  { app: "HR", path: "/apps/hr/org-structure", expectText: /Organizational Structure/i },
  { app: "HR", path: "/apps/hr/attendance", expectText: /Attendance/i },
  { app: "ESS", path: "/apps/ess/dashboard", expectText: /ESS|Dashboard/i },
  { app: "ESS", path: "/apps/ess/requests", expectText: /Requests/i },
  { app: "Admin", path: "/apps/admin/dashboard", expectText: /Admin/i },
  { app: "Admin", path: "/apps/admin/users", expectText: /Users/i },
  { app: "Admin", path: "/apps/admin/company-profile", expectText: /Company Profile/i },
  { app: "Admin", path: "/apps/admin/email-config", expectText: /Email Configuration/i },
  { app: "Storefront", path: "/apps/storefront/dashboard", expectText: /Storefront/i },
  { app: "Storefront", path: "/apps/storefront/all-materials", expectText: /Materials/i },
];

for (const { app, path, expectText } of ROUTES) {
  test(`${app} · ${path} renders its real content`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await givenLoggedInAsAdmin(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").innerText();
    expect(body, `route ${path} shows a 404/error boundary instead of content`).not.toMatch(
      /Unexpected Application Error|404 Not Found/i,
    );
    expect(body).toMatch(expectText);
    expect(pageErrors, `uncaught JS errors on ${path}: ${pageErrors.join(" | ")}`).toEqual([]);
  });
}

// ─── Cross-module integration: HR ⇄ Admin ────────────────────────────────
test("Given an employee is onboarded, when Admin looks at Users, then a matching account eventually exists", async ({ page }) => {
  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: "admin@buildos.ng", password: "BuildOS@2025" },
  });
  const { access_token } = await loginRes.json();
  const deptRes = await page.request.get(`${API}/departments`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const departmentId = (await deptRes.json())[0]?.id;
  expect(departmentId).toBeTruthy();

  const email = `wiring.onboard.${Date.now()}@buildos-e2e.ng`;
  const createRes = await page.request.post(`${API}/employees`, {
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    data: {
      firstName: "Wiring", lastName: "Onboard", email, role: "QA", departmentId,
      phone: "1234567", employmentType: "FullTime", status: "active",
      dateHired: new Date().toISOString(),
    },
  });
  expect(createRes.ok(), `employee create failed: ${await createRes.text()}`).toBeTruthy();
  const employee = await createRes.json();

  // Re-fetch — creation kicks off user-account linking as a side effect.
  const refetched = await (
    await page.request.get(`${API}/employees/${employee.id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
  ).json();
  expect(refetched.userId, "Employee.userId should be linked to a User account").toBeTruthy();

  const userRes = await page.request.get(`${API}/admin/users/${refetched.userId}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  expect(userRes.ok(), "linked user should be visible via the Admin Users API").toBeTruthy();
  const user = await userRes.json();
  expect(user.email).toBe(email);
});
