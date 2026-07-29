/**
 * BuildOS — employee onboarding → pending sync → user account
 *
 * Covers the flow the design specifies:
 *   1. HR creates an employee  → welcome email sent, NO login account yet
 *   2. The employee appears in Admin › Users as "Pending Sync from HR"
 *   3. An admin syncs them     → user account created + activation email
 *
 * Plus the supporting fixes: real AppRole rows (so 'employee' is no longer an
 * invented role string), Add-Employee required-field validation, and the
 * employee personal-info fields that previously rendered as "—".
 *
 * Run (against a disposable local stack):
 *   BUILDOS_API=http://localhost:8090/api BUILDOS_URL=http://localhost:5180 \
 *     npx playwright test e2e/onboarding-sync.spec.ts --reporter=list
 */

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const API = process.env.BUILDOS_API || "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.BUILDOS_ADMIN_EMAIL || "admin@buildos.ng";
const ADMIN_PASSWORD = process.env.BUILDOS_ADMIN_PASSWORD || "BuildOS@2025";

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).access_token;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Creates an employee straight through the API and returns its record. */
async function createEmployee(request: APIRequestContext, token: string, tag: string) {
  const depts = await (await request.get(`${API}/departments`, { headers: auth(token) })).json();
  const res = await request.post(`${API}/employees`, {
    headers: auth(token),
    data: {
      firstName: "E2E",
      lastName: tag,
      email: `e2e.${tag.toLowerCase()}@buildos.ng`,
      phone: "+2348000000000",
      role: "Site Engineer",
      departmentId: depts[0]?.id,
      employmentType: "FullTime",
      status: "active",
      dateHired: new Date().toISOString(),
      dateOfBirth: "1992-03-11",
      gender: "Female",
      address: "4 Marina Road",
      city: "Lagos",
      state: "Lagos",
      zipCode: "101001",
      emergencyContact: "Next Of Kin",
      emergencyPhone: "+2348011112222",
      gradeLevel: "GL-07",
      baseSalary: 380000,
    },
  });
  expect(res.ok(), `create employee failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function injectAuth(page: Page, token: string, request: APIRequestContext) {
  const me = await (await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })).json();
  await page.addInitScript(
    ({ at, rt, u }) => {
      localStorage.setItem("auth_token", at);
      localStorage.setItem("refresh_token", rt);
      localStorage.setItem("auth_user", JSON.stringify(u));
    },
    { at: me.access_token, rt: me.refresh_token, u: me.user },
  );
}

// ── Roles foundation ────────────────────────────────────────────────────────
test("every role the backend guards reference exists as a real AppRole", async ({ request }) => {
  const token = await login(request);
  const roles: { name: string }[] = await (
    await request.get(`${API}/admin/roles`, { headers: auth(token) })
  ).json();
  const names = roles.map((r) => r.name.toLowerCase());

  // 'Employee' is the one the onboarding flow depends on; previously the only
  // AppRole row in the system was 'Admin', so role: 'employee' was unbacked.
  expect(names).toContain("employee");
  for (const guarded of ["hr manager", "finance manager", "project manager", "team lead"]) {
    expect(names).toContain(guarded);
  }
});

test("syncing with a role that does not exist is rejected, not silently accepted", async ({ request }) => {
  const token = await login(request);
  const emp = await createEmployee(request, token, `BadRole${Date.now()}`);

  const res = await request.post(`${API}/admin/employees/${emp.id}/sync`, {
    headers: auth(token),
    data: { role: "not-a-real-role", assignedApps: ["ess"] },
  });
  expect(res.status()).toBe(400);
  expect(await res.text()).toContain("Unknown role");
});

// ── The onboarding → pending sync → user flow ───────────────────────────────
test("creating an employee does NOT create a login account, but queues them for sync", async ({ request }) => {
  const token = await login(request);
  const emp = await createEmployee(request, token, `Queue${Date.now()}`);

  // No user account yet — that is the admin's decision to make.
  expect(emp.userId ?? null).toBeNull();

  const users = await (
    await request.get(`${API}/admin/users?search=${encodeURIComponent(emp.email)}`, {
      headers: auth(token),
    })
  ).json();
  expect(Array.isArray(users) ? users.length : 0).toBe(0);

  // ...but they are waiting in the Admin pending-sync queue.
  const pending: { id: string }[] = await (
    await request.get(`${API}/admin/users/pending-sync`, { headers: auth(token) })
  ).json();
  expect(pending.some((p) => p.id === emp.id)).toBeTruthy();
});

test("syncing an employee creates the user, links it, and clears the queue entry", async ({ request }) => {
  const token = await login(request);
  const emp = await createEmployee(request, token, `Sync${Date.now()}`);

  const syncRes = await request.post(`${API}/admin/employees/${emp.id}/sync`, {
    headers: auth(token),
    data: { role: "Employee", assignedApps: ["ess"] },
  });
  expect(syncRes.ok(), `sync failed: ${await syncRes.text()}`).toBeTruthy();
  const user = await syncRes.json();
  expect(user.status).toBe("pending_invite");
  expect(user.assignedApps).toContain("ess");

  // Employee is now linked to that user...
  const linked = await (
    await request.get(`${API}/employees/${emp.id}`, { headers: auth(token) })
  ).json();
  expect(linked.userId).toBe(user.id);

  // ...and no longer pending.
  const pending: { id: string }[] = await (
    await request.get(`${API}/admin/users/pending-sync`, { headers: auth(token) })
  ).json();
  expect(pending.some((p) => p.id === emp.id)).toBeFalsy();

  // Syncing twice must not create a second account.
  const again = await request.post(`${API}/admin/employees/${emp.id}/sync`, {
    headers: auth(token),
    data: { role: "Employee" },
  });
  expect(again.status()).toBe(409);
});

// ── UI surfaces ─────────────────────────────────────────────────────────────
test("Admin Users shows the Pending Sync queue with a Sync button", async ({ page, request }) => {
  const token = await login(request);
  await createEmployee(request, token, `UI${Date.now()}`);
  await injectAuth(page, token, request);

  await page.goto("/apps/admin/users");
  await expect(page.getByText(/Pending Sync from HR/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /^Sync$/ }).first()).toBeVisible();
  // The KPI tile that counts them.
  await expect(page.getByText("Unsynced (HR)")).toBeVisible();
});

test("Sync slide-over opens and offers real roles plus app access", async ({ page, request }) => {
  const token = await login(request);
  await createEmployee(request, token, `Panel${Date.now()}`);
  await injectAuth(page, token, request);

  await page.goto("/apps/admin/users");
  await page.getByRole("button", { name: /^Sync$/ }).first().click();

  await expect(page.getByText("Sync Employee to User")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Company Email")).toBeVisible();
  await expect(page.getByText("Application Access")).toBeVisible();

  // The role dropdown must be populated from real AppRole rows.
  const roleSelect = page.locator("select").filter({ hasText: "Employee" }).first();
  await expect(roleSelect).toBeVisible();
});

test("HR employee list shows a System Access sync badge", async ({ page, request }) => {
  const token = await login(request);
  await createEmployee(request, token, `Badge${Date.now()}`);
  await injectAuth(page, token, request);

  await page.goto("/apps/hr/employees");
  await expect(page.getByRole("columnheader", { name: /System Access/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Pending sync/i).first()).toBeVisible();
});

// ── Add Employee required-field validation ──────────────────────────────────
test("Add New Employee blocks submission and flags every newly-required field", async ({ page, request }) => {
  const token = await login(request);
  await injectAuth(page, token, request);

  await page.goto("/apps/hr/employees");
  await page.getByRole("button", { name: /Add Employee/i }).click();
  await expect(page.getByText("Add New Employee")).toBeVisible({ timeout: 10_000 });

  // Submit an empty form — nothing should be created.
  await page.getByRole("button", { name: /Create Employee/i }).click();

  await expect(page.getByText(/Please correct \d+ highlighted field/i)).toBeVisible();
  for (const message of [
    "Gender is required.",
    "Date of birth is required.",
    "Email is required.",
    "Phone is required.",
    "Address is required.",
    "City is required.",
    "State is required.",
    "Next of kin contact is required.",
    "Emergency phone is required.",
    "Salary grade is required.",
    "Base salary is required.",
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }

  // The modal must still be open (submission was blocked).
  await expect(page.getByText("Add New Employee")).toBeVisible();
});

// ── Personal info rendering (previously hardcoded "—") ──────────────────────
test("employee personal info renders DOB, gender and address instead of placeholders", async ({ page, request }) => {
  const token = await login(request);
  const emp = await createEmployee(request, token, `Info${Date.now()}`);
  await injectAuth(page, token, request);

  await page.goto(`/apps/hr/employees/${emp.id}`);
  await expect(page.getByText("Personal Details")).toBeVisible({ timeout: 20_000 });

  const panel = page.locator("div").filter({ hasText: "Personal Details" }).last();
  await expect(panel).toContainText("Female");
  await expect(panel).toContainText("4 Marina Road");
  await expect(panel).toContainText("Lagos");
  // The header pill reflects sync state.
  await expect(page.getByText("Pending Sync")).toBeVisible();
});

test("Export Profile button is wired and triggers a download", async ({ page, request }) => {
  const token = await login(request);
  const emp = await createEmployee(request, token, `Export${Date.now()}`);
  await injectAuth(page, token, request);

  await page.goto(`/apps/hr/employees/${emp.id}`);
  await expect(page.getByRole("button", { name: /Export Profile/i })).toBeVisible({
    timeout: 20_000,
  });

  const download = page.waitForEvent("download", { timeout: 15_000 });
  await page.getByRole("button", { name: /Export Profile/i }).click();
  const file = await download;
  // Filename carries a timestamp so repeated exports don't collide.
  expect(file.suggestedFilename()).toMatch(/^employee-profile-.+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/);
});
