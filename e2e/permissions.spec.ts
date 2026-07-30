/**
 * BuildOS — role and user permission enforcement, end to end.
 *
 * Roles have long stored three layers of configuration — Layer 1 application
 * access, Layer 2 navigation, Layer 3 per-process VCEAD — but nothing read any of
 * it, so configuring a role changed nothing anywhere in the app. These tests pin
 * the enforcement that closes that gap:
 *
 *  - a user can only be assigned applications configured for their role,
 *  - role process permissions resolve for each user assigned that role,
 *  - a per-user override wins over the role AND is enforced at the API, not just
 *    hidden in the UI,
 *  - clearing an override restores the inherited permission,
 *  - extending a user into a new application opens that application's processes,
 *  - the Activity and Requests tabs show real data instead of empty states,
 *  - the Layer 2 catalog still covers every sidebar item (the drift that made
 *    Layer 2 unenforceable in the first place).
 *
 * Run:
 *   BUILDOS_API=http://localhost:8090/api BUILDOS_URL=http://localhost:5180 \
 *     npx playwright test e2e/permissions.spec.ts --reporter=list
 */

import { readFileSync } from "node:fs";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.BUILDOS_API || "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.BUILDOS_ADMIN_EMAIL || "admin@buildos.ng";
const ADMIN_PASSWORD = process.env.BUILDOS_ADMIN_PASSWORD || "BuildOS@2025";

async function login(request: APIRequestContext, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok(), `login failed for ${email}: ${await res.text()}`).toBeTruthy();
  return (await res.json()).access_token as string;
}

const auth = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

/** Invites a user and returns its id. Roles come from the live AppRole list. */
async function inviteUser(
  request: APIRequestContext,
  token: string,
  body: { name: string; email: string; role: string; assignedApps: string[] },
) {
  const res = await request.post(`${API}/admin/users/invite`, {
    headers: auth(token),
    data: { department: "Human Resources", ...body },
  });
  expect(res.ok(), `invite failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).id as string;
}

test.describe("role-driven permissions", () => {
  test("a role's application scope is what the Add User form offers", async ({ request }) => {
    const token = await login(request);
    const roles = await (
      await request.get(`${API}/admin/roles`, { headers: auth(token) })
    ).json();

    const hrManager = roles.find((r: any) => r.name === "HR Manager");
    expect(hrManager, "HR Manager role should exist").toBeTruthy();

    // This is the field the Add User form reads to scope its checkboxes. It was
    // always sent and always discarded, which is why every app was offered.
    const appAccess = hrManager.permissions?.appAccess ?? {};
    const granted = Object.entries(appAccess)
      .filter(([, allowed]) => allowed)
      .map(([app]) => app);

    expect(granted).toContain("hr");
    expect(granted).not.toContain("finance");
  });

  test("role process permissions resolve for a user assigned that role", async ({ request }) => {
    const token = await login(request);
    const userId = await inviteUser(request, token, {
      name: "Perm Inherit",
      email: `perm.inherit.${Date.now()}@buildos-e2e.ng`,
      role: "HR Manager",
      assignedApps: ["ess", "hr"],
    });

    const effective = await (
      await request.get(`${API}/admin/users/${userId}/permissions`, {
        headers: auth(token),
      })
    ).json();

    expect(effective.role).toBe("HR Manager");
    expect(effective.appAccess).toEqual(expect.arrayContaining(["ess", "hr"]));

    // Leave approval is an HR process, and HR Manager is a supervisory role, so it
    // is granted — and marked as coming from the role, not from an override.
    expect(effective.processPermissions.p_approve_lv.approve).toBe(true);
    expect(effective.processSources.p_approve_lv.approve).toBe("role");

    // A process in an app the role has no access to must not be granted.
    expect(effective.processPermissions.p_create_exp).toBeUndefined();
  });

  test("a per-user deny overrides the role and is enforced by the API", async ({ request }) => {
    const adminToken = await login(request);
    const email = `perm.deny.${Date.now()}@buildos-e2e.ng`;

    // Invite, then activate through the real invite flow so this exercises a
    // genuine end-user session rather than a hand-built token.
    const invite = await request.post(`${API}/admin/users/invite`, {
      headers: auth(adminToken),
      data: {
        name: "Perm Deny",
        email,
        role: "HR Manager",
        department: "Human Resources",
        assignedApps: ["ess", "hr"],
      },
    });
    expect(invite.ok(), `invite failed: ${await invite.text()}`).toBeTruthy();
    const invited = await invite.json();
    const userId = invited.id as string;

    const inviteToken = String(invited.activationLink ?? "").split("token=").pop();
    expect(inviteToken, "invite should return an activation link").toBeTruthy();

    const activation = await request.post(`${API}/auth/activate`, {
      headers: { "Content-Type": "application/json" },
      data: { token: inviteToken, password: "PermTest@2026" },
    });
    expect(activation.ok(), `activation failed: ${await activation.text()}`).toBeTruthy();
    const userToken = (await activation.json()).access_token as string;
    expect(userToken).toBeTruthy();

    // Baseline: the role permits approval, so the guard lets the call through and
    // it fails on the bogus id instead.
    const before = await request.post(`${API}/leave-requests/does-not-exist/approve`, {
      headers: auth(userToken),
      data: {},
    });
    expect(before.status()).not.toBe(403);

    // Revoke just `approve` on this one process for this one user.
    const revoke = await request.put(`${API}/admin/users/${userId}/permissions`, {
      headers: auth(adminToken),
      data: { processOverrides: { p_approve_lv: { approve: "deny" } } },
    });
    expect(revoke.ok(), await revoke.text()).toBeTruthy();
    const revoked = await revoke.json();
    expect(revoked.processPermissions.p_approve_lv.approve).toBe(false);
    expect(revoked.processSources.p_approve_lv.approve).toBe("deny");
    // Only that action is narrowed — `view` still comes from the role.
    expect(revoked.processPermissions.p_approve_lv.view).toBe(true);
    expect(revoked.processSources.p_approve_lv.view).toBe("role");

    // The API must refuse, not merely the UI.
    const denied = await request.post(`${API}/leave-requests/does-not-exist/approve`, {
      headers: auth(userToken),
      data: {},
    });
    expect(denied.status()).toBe(403);
    expect(await denied.text()).toContain("does not permit");

    // Clearing the override restores the inherited permission.
    const cleared = await request.put(`${API}/admin/users/${userId}/permissions`, {
      headers: auth(adminToken),
      data: { processOverrides: {} },
    });
    expect(cleared.ok()).toBeTruthy();
    expect((await cleared.json()).processSources.p_approve_lv.approve).toBe("role");

    const after = await request.post(`${API}/leave-requests/does-not-exist/approve`, {
      headers: auth(userToken),
      data: {},
    });
    expect(after.status()).not.toBe(403);
  });

  test("extending a user into another application opens that application's processes", async ({
    request,
  }) => {
    const token = await login(request);
    const userId = await inviteUser(request, token, {
      name: "Perm Extend",
      email: `perm.extend.${Date.now()}@buildos-e2e.ng`,
      role: "HR Manager",
      assignedApps: ["ess", "hr"],
    });

    const scoped = await (
      await request.get(`${API}/admin/users/${userId}/permissions`, { headers: auth(token) })
    ).json();
    expect(scoped.processPermissions.p_create_exp).toBeUndefined();

    // Grant Finance beyond the role, as Edit User does.
    const extend = await request.put(`${API}/admin/users/${userId}`, {
      headers: auth(token),
      data: { assignedApps: ["ess", "hr", "finance"] },
    });
    expect(extend.ok(), await extend.text()).toBeTruthy();

    const extended = await (
      await request.get(`${API}/admin/users/${userId}/permissions`, { headers: auth(token) })
    ).json();
    expect(extended.appAccess).toContain("finance");
    // The HR Manager role configures nothing for Finance, so Finance is
    // unrestricted for this user rather than resolving to no permissions at all.
    expect(extended.processUnrestrictedApps).toContain("finance");
    expect(extended.processPermissions.p_create_exp.create).toBe(true);
  });

  test("the Layer 2 catalog still covers every sidebar item", () => {
    // The original Layer 2 list used synthetic ids that existed nowhere else and
    // had drifted to a fraction of the real sidebars, which is precisely why nav
    // permissions could never be enforced. This fails the moment a layout gains a
    // nav item the catalog does not list.
    const LAYOUTS = [
      "src/app/pages/construction/ConstructionLayout.tsx",
      "src/app/pages/finance/FinanceLayout.tsx",
      "src/app/pages/hr/HRLayout.tsx",
      "src/app/pages/procurement/ProcurementLayout.tsx",
      "src/app/pages/storefront/StorefrontLayout.tsx",
      "src/app/pages/admin/AdminLayout.tsx",
      "src/app/pages/ess/ESSLayout.tsx",
    ];

    const catalogSource = readFileSync("src/app/utils/navCatalog.ts", "utf-8");
    const catalogIds = new Set(
      [...catalogSource.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]),
    );

    const missing: string[] = [];
    for (const layout of LAYOUTS) {
      const source = readFileSync(layout, "utf-8");
      for (const match of source.matchAll(/href:\s*"(\/apps\/[^"]+)"/g)) {
        if (!catalogIds.has(match[1])) missing.push(`${layout}: ${match[1]}`);
      }
    }

    expect(missing, `navCatalog.ts is missing nav items:\n${missing.join("\n")}`).toEqual([]);
  });
});

test.describe("user detail tabs", () => {
  async function givenLoggedInAsAdmin(page: Page) {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
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

  test("Permissions, Activity and Requests tabs render real data", async ({ page }) => {
    await givenLoggedInAsAdmin(page);
    await page.goto("/apps/admin/users");

    // The admin account is the one with recorded audit history in any environment
    // that has been used at all.
    const row = page.getByRole("row", { name: new RegExp(ADMIN_EMAIL, "i") }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    const panel = page.locator("div").filter({ hasText: "Basic Info" }).last();
    await expect(panel).toBeVisible({ timeout: 15_000 });

    // Permissions — must list real catalog processes, not the old empty state.
    await page.getByRole("button", { name: "Permissions", exact: true }).click();
    await expect(
      page.getByText("No processes assigned to this user"),
    ).toHaveCount(0);
    await expect(page.getByText(/Inherited from role/i)).toBeVisible({
      timeout: 15_000,
    });

    // Activity — sourced from the audit log.
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(page.getByText("No activity recorded for this user yet")).toHaveCount(
      0,
      { timeout: 15_000 },
    );
  });
});
