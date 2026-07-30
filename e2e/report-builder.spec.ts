/**
 * BuildOS — Report Builder, end to end.
 *
 * The builder rendered its preview from an array nothing ever populated, so it
 * always showed headers with no rows, and its CSV export produced a headers-only
 * file. Several inputs were also disconnected: the Application select did not
 * scope the data sources, filters could target fields the database cannot filter
 * by (so the clause was silently dropped), and switching to SQL mode left every
 * visual input with no visible effect.
 *
 * Run:
 *   BUILDOS_API=http://localhost:8090/api BUILDOS_URL=http://localhost:5180 \
 *     npx playwright test e2e/report-builder.spec.ts --reporter=list
 */

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.BUILDOS_API || "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.BUILDOS_ADMIN_EMAIL || "admin@buildos.ng";
const ADMIN_PASSWORD = process.env.BUILDOS_ADMIN_PASSWORD || "BuildOS@2025";

const auth = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

async function login(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).access_token as string;
}

async function givenLoggedInAsAdmin(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
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

test("every declared data source actually executes", async ({ request }) => {
  const token = await login(request);
  const sources = (
    await (await request.get(`${API}/reports/sources`, { headers: auth(token) })).json()
  ).data as Array<{ value: string; app: string; fields: unknown[] }>;

  expect(sources.length).toBeGreaterThan(15);

  // A source that cannot be run is worse than one that does not exist: the
  // builder offers it and then fails.
  for (const source of sources) {
    const res = await request.post(`${API}/reports/run`, {
      headers: auth(token),
      data: { source: source.value, limit: 2 },
    });
    expect(res.ok(), `${source.value} failed: ${await res.text()}`).toBeTruthy();
    const result = (await res.json()).data;
    expect(result.columns.length, `${source.value} returned no columns`).toBeGreaterThan(0);
  }
});

test("sources cover every application the builder offers", async ({ request }) => {
  const token = await login(request);
  const sources = (
    await (await request.get(`${API}/reports/sources`, { headers: auth(token) })).json()
  ).data as Array<{ app: string }>;

  const apps = new Set(sources.map((s) => s.app));
  // Each of these has a reporting surface in the app; a missing one means the
  // Application select would offer an app with nothing to report on.
  for (const app of ["construction", "finance", "hr", "procurement", "storefront", "admin"]) {
    expect(apps.has(app), `no data source for the ${app} application`).toBe(true);
  }
});

test("filters and sorting are applied by the database, not ignored", async ({ request }) => {
  const token = await login(request);

  const unfiltered = (
    await (
      await request.post(`${API}/reports/run`, {
        headers: auth(token),
        data: { source: "employees", fields: ["name", "status"], limit: 500 },
      })
    ).json()
  ).data;

  const filtered = (
    await (
      await request.post(`${API}/reports/run`, {
        headers: auth(token),
        data: {
          source: "employees",
          fields: ["name", "status"],
          filters: [{ field: "status", operator: "equals", value: "inactive" }],
          limit: 500,
        },
      })
    ).json()
  ).data;

  expect(filtered.total).toBeLessThan(unfiltered.total);
  for (const row of filtered.rows) expect(String(row.status)).toBe("inactive");

  // Sorting must come back ordered.
  const sorted = (
    await (
      await request.post(`${API}/reports/run`, {
        headers: auth(token),
        data: {
          source: "projects",
          fields: ["name", "budget"],
          sort: [{ field: "budget", direction: "desc" }],
          limit: 10,
        },
      })
    ).json()
  ).data;

  const budgets = sorted.rows.map((r: any) => Number(r.budget));
  expect(budgets).toEqual([...budgets].sort((a, b) => b - a));
});

test("only queryable fields are offered as filter targets", async ({ request }) => {
  const token = await login(request);
  const sources = (
    await (await request.get(`${API}/reports/sources`, { headers: auth(token) })).json()
  ).data as Array<{ value: string; fields: Array<{ key: string; queryable: boolean }> }>;

  // Derived fields are computed after loading, so the database cannot filter by
  // them. They must be flagged, or the UI offers a filter that silently does
  // nothing — which is exactly what used to happen.
  const expenses = sources.find((s) => s.value === "expenses")!;
  expect(expenses.fields.find((f) => f.key === "project")?.queryable).toBe(false);
  expect(expenses.fields.find((f) => f.key === "category")?.queryable).toBe(true);
});

test("the Application select scopes the data sources, and SQL tracks the inputs", async ({
  page,
}) => {
  await givenLoggedInAsAdmin(page);
  await page.goto("/apps/admin/report-builder");

  // Get into the builder.
  const newReport = page.getByRole("button", { name: /New Template/i }).first();
  await expect(newReport).toBeVisible({ timeout: 20_000 });
  await newReport.click();

  const appSelect = page.locator("select").first();
  await expect(appSelect).toBeVisible({ timeout: 15_000 });

  const sourceSelect = page.locator("select").nth(1);
  await expect(sourceSelect).toBeVisible();

  // Construction sources, then Finance sources — the lists must differ.
  await appSelect.selectOption("construction");
  await expect
    .poll(async () => (await sourceSelect.locator("option").allTextContents()).join("|"), {
      timeout: 10_000,
    })
    .toMatch(/Projects/i);
  const construction = await sourceSelect.locator("option").allTextContents();

  await appSelect.selectOption("finance");
  await expect
    .poll(async () => (await sourceSelect.locator("option").allTextContents()).join("|"), {
      timeout: 10_000,
    })
    .toMatch(/Expenses|Accruals|Budgets/i);
  const finance = await sourceSelect.locator("option").allTextContents();

  expect(finance).not.toEqual(construction);
  expect(finance.join(" ")).not.toMatch(/Employees/i);

  // SQL mode must reflect the current source rather than being an inert editor.
  await page.getByRole("button", { name: /^SQL$/i }).click();
  const editor = page.locator("#sql-editor");
  await expect(editor).toBeVisible({ timeout: 10_000 });
  await expect(editor).toHaveValue(/SELECT[\s\S]+FROM \w+[\s\S]+LIMIT \d+;/);
});
