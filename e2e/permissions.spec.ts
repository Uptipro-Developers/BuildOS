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

import { existsSync, readFileSync } from "node:fs";
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
    expect(effective.processPermissions.p_leave_requests.approve).toBe(true);
    expect(effective.processSources.p_leave_requests.approve).toBe("role");

    // A process in an app the role has no access to must not be granted.
    expect(effective.processPermissions.p_expenses).toBeUndefined();
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
      data: { processOverrides: { p_leave_requests: { approve: "deny" } } },
    });
    expect(revoke.ok(), await revoke.text()).toBeTruthy();
    const revoked = await revoke.json();
    expect(revoked.processPermissions.p_leave_requests.approve).toBe(false);
    expect(revoked.processSources.p_leave_requests.approve).toBe("deny");
    // Only that action is narrowed — `view` still comes from the role.
    expect(revoked.processPermissions.p_leave_requests.view).toBe(true);
    expect(revoked.processSources.p_leave_requests.view).toBe("role");

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
    expect((await cleared.json()).processSources.p_leave_requests.approve).toBe("role");

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
    expect(scoped.processPermissions.p_expenses).toBeUndefined();

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
    expect(extended.processPermissions.p_expenses.create).toBe(true);
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
    const catalog = new Map<string, { label: string; section: string }>();
    for (const m of catalogSource.matchAll(
      /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]*)",\s*section:\s*"([^"]*)"\s*\}/g,
    )) {
      catalog.set(m[1], { label: m[2], section: m[3] });
    }

    // Commented-out nav items are not rendered, so they are not permission
    // surfaces — strip comments before scanning or the check reports phantoms.
    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    // Labels and section headers are checked as well as hrefs. Checking only the
    // href let a *rename* pass silently: Layer 2 kept offering "Finance
    // Configuration" and an "HR General Setup" group long after the sidebars had
    // been reorganised, so admins were configuring against module names that no
    // longer existed anywhere in the app.
    const problems: string[] = [];
    const seen = new Set<string>();

    for (const layout of LAYOUTS) {
      const source = stripComments(readFileSync(layout, "utf-8"));
      // A `label:` with no `href:` is a sidebar group header; it names the
      // section every item after it belongs to.
      let section = "";
      for (const match of source.matchAll(
        /label:\s*"([^"]*)"(?:\s*,\s*href:\s*"([^"]+)")?/g,
      )) {
        const [, label, href] = match;
        if (!href) {
          section = label;
          continue;
        }
        if (!href.startsWith("/apps/")) continue;
        seen.add(href);

        const entry = catalog.get(href);
        if (!entry) {
          problems.push(`${layout}: missing "${href}" ("${label}")`);
          continue;
        }
        if (entry.label !== label) {
          problems.push(
            `${layout}: ${href} label is "${entry.label}", sidebar renders "${label}"`,
          );
        }
        if (entry.section !== section) {
          problems.push(
            `${layout}: ${href} section is "${entry.section}", sidebar groups it under "${section}"`,
          );
        }
      }
    }

    // A catalog entry no route renders is a permission for a page that is gone.
    for (const [href, entry] of catalog) {
      if (!seen.has(href)) {
        problems.push(`stale: ${href} ("${entry.label}") is in the catalog but no sidebar renders it`);
      }
    }

    expect(
      problems,
      `navCatalog.ts is out of step with the sidebars:\n${problems.join("\n")}`,
    ).toEqual([]);
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
    const row = page.locator("tr", { hasText: ADMIN_EMAIL }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    await expect(
      page.getByRole("button", { name: "Basic Info", exact: true }),
    ).toBeVisible({ timeout: 15_000 });

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

test.describe("process catalog", () => {
  /**
   * The catalog is what roles are configured against, what approval workflows
   * route, and what the API guards enforce. An entry with no implementation is a
   * permission that governs nothing; a missing entry is an operation nobody can
   * restrict. Three aspirational entries (Bank Reconciliation, Salary Advance,
   * Approve Milestone) had accumulated with no route, service or model at all.
   */
  test("every catalog process names a real module and route", async ({ request }) => {
    const token = await login(request);
    const catalog: Array<{
      id: string;
      app: string;
      actions?: string[];
      backedBy?: { module?: string; route?: string };
    }> = await (
      await request.get(`${API}/admin/process-catalog`, { headers: auth(token) })
    ).json();

    // Read from the API rather than by parsing the source file: the catalog is
    // built by a helper call now, so a source regex would silently match nothing
    // and the assertions below would pass vacuously.
    expect(catalog.length).toBeGreaterThan(20);

    const navCatalog = readFileSync("src/app/utils/navCatalog.ts", "utf-8");
    const navIds = new Set(
      [...navCatalog.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]),
    );

    // A process one app owns but another app's page performs. Appraisals are
    // HR-owned, but the only appraisal screen is under ESS; scoping it to `ess`
    // would grant it to everyone, since ESS is every user's baseline app.
    const CROSS_APP_BY_DESIGN = new Set(["p_appraisals"]);

    const problems: string[] = [];
    for (const proc of catalog) {
      const module = proc.backedBy?.module;
      const route = proc.backedBy?.route;

      if (!module || !route) {
        problems.push(`${proc.id}: missing backedBy`);
        continue;
      }
      if (!existsSync(`server/src/${module}`)) {
        problems.push(`${proc.id}: no server module "${module}"`);
      }
      if (!navIds.has(route)) {
        problems.push(`${proc.id}: route "${route}" is not a nav destination`);
      }
      const routeApp = /^\/apps\/([^/]+)/.exec(route)?.[1];
      if (routeApp && routeApp !== proc.app && !CROSS_APP_BY_DESIGN.has(proc.id)) {
        problems.push(`${proc.id}: app "${proc.app}" but route is under "${routeApp}"`);
      }
      if (!proc.actions?.length) {
        problems.push(`${proc.id}: supports no permissions`);
      }
    }

    expect(problems, `process catalog is out of step:\n${problems.join("\n")}`).toEqual(
      [],
    );
  });

  test("the requisition and purchase-order processes both exist", async ({ request }) => {
    const token = await login(request);
    const catalog: Array<{ id: string }> = await (
      await request.get(`${API}/admin/process-catalog`, { headers: auth(token) })
    ).json();
    const ids = new Set(catalog.map((p) => p.id));

    // Material requisition and purchase requisition are distinct flows with their
    // own pages, models and approval routes; only the latter used to be listed.
    for (const id of [
      "p_material_requests",
      "p_purchase_requests",
      "p_purchase_orders",
      "p_goods_receipt",
    ]) {
      expect(ids.has(id), `${id} should be in the catalog`).toBe(true);
    }

    // Entries that named no implementation are gone.
    for (const id of ["p_bank_recon", "p_salary_advance", "p_milestone_approve"]) {
      expect(ids.has(id), `${id} is unimplemented and should not be listed`).toBe(
        false,
      );
    }
  });

  test("processes are entity-grained and expose only supported permissions", async ({
    request,
  }) => {
    const token = await login(request);
    const catalog = await (
      await request.get(`${API}/admin/process-catalog`, { headers: auth(token) })
    ).json();

    const byId = (id: string) => catalog.find((p: any) => p.id === id);

    // A process is the activity, not the verb — Expenses carries the full
    // lifecycle rather than "Create Expense" and "Approve Expense" being separate
    // entries with a matrix row each.
    expect(byId("p_expenses")?.actions).toEqual(
      expect.arrayContaining(["view", "create", "edit", "approve", "delete"]),
    );

    // Actions with no workflow behind them are left out entirely, so the matrices
    // cannot offer a permission that would govern nothing.
    expect(byId("p_goods_receipt")?.actions).not.toContain("delete");
    expect(byId("p_goods_receipt")?.actions).not.toContain("approve");
    expect(byId("p_stock_movements")?.actions).not.toContain("edit");
    expect(byId("p_rfqs")?.actions).not.toContain("approve");
    expect(byId("p_ess_requests")?.actions).not.toContain("approve");
    expect(byId("p_ess_payslips")?.actions).toEqual(["view"]);

    // requiresApproval is derived, never independently set.
    for (const proc of catalog) {
      expect(
        proc.requiresApproval,
        `${proc.id}: requiresApproval must match whether Approve is supported`,
      ).toBe((proc.actions ?? []).includes("approve"));
    }
  });

  test("resolution omits unsupported permissions rather than denying them", async ({
    request,
  }) => {
    const token = await login(request);
    const userId = await inviteUser(request, token, {
      name: "Perm Actions",
      email: `perm.actions.${Date.now()}@buildos-e2e.ng`,
      role: "HR Manager",
      assignedApps: ["ess", "hr"],
    });

    const effective = await (
      await request.get(`${API}/admin/users/${userId}/permissions`, {
        headers: auth(token),
      })
    ).json();

    // Payslips are read-only for an employee: only `view` exists as a key at all.
    expect(Object.keys(effective.processPermissions.p_ess_payslips)).toEqual(["view"]);
    // Departments are managed reference data — no approval step.
    expect(Object.keys(effective.processPermissions.p_departments)).not.toContain(
      "approve",
    );

    // Granting an unsupported verb must be inert, not silently stored as usable.
    const attempted = await request.put(`${API}/admin/users/${userId}/permissions`, {
      headers: auth(token),
      data: { processOverrides: { p_ess_payslips: { delete: "allow" } } },
    });
    expect(attempted.ok()).toBeTruthy();
    const after = await attempted.json();
    expect(after.processPermissions.p_ess_payslips.delete).toBeUndefined();
  });
});
