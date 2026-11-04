import { expect, test, type Page } from "@playwright/test";

interface CapturedCall {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

function unsignedToken(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

async function mockAuthenticatedApplication(page: Page, calls: CapturedCall[]) {
  const future = Math.floor(Date.now() / 1000) + 60 * 60;
  const materialRequests: Record<string, unknown>[] = [];

  await page.addInitScript(
    ({ access, refresh }) => {
      localStorage.setItem("auth_token", access);
      localStorage.setItem("refresh_token", refresh);
      if (!localStorage.getItem("auth_user")) {
        localStorage.setItem(
          "auth_user",
          JSON.stringify({
            id: "qa-user",
            name: "QA Admin",
            email: "qa@example.com",
            role: "admin",
            assignedApps: ["storefront", "procurement", "ess"],
          }),
        );
      }
    },
    {
      access: unsignedToken({ exp: future, sub: "qa-user", role: "admin" }),
      refresh: unsignedToken({ exp: future, sub: "qa-user", role: "admin" }),
    },
  );

  await page.route("http://localhost:3001/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON() as Record<string, unknown> | null;
    calls.push({ method: request.method(), path: url.pathname, body });

    if (url.pathname.endsWith("/material-requests") && request.method() === "POST") {
      const created = {
        id: `material-request-${materialRequests.length + 1}`,
        reference: `MRQ-QA-${String(materialRequests.length + 1).padStart(3, "0")}`,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      materialRequests.push(created);
      await route.fulfill({ json: created });
      return;
    }

    if (
      url.pathname.includes("/material-requests/") &&
      request.method() === "PATCH"
    ) {
      const id = url.pathname.split("/").at(-1);
      const index = materialRequests.findIndex((request) => request.id === id);
      const updated = {
        ...materialRequests[index],
        ...body,
        updatedAt: new Date().toISOString(),
      };
      materialRequests[index] = updated;
      await route.fulfill({ json: updated });
      return;
    }

    if (url.pathname.endsWith("/material-requests")) {
      await route.fulfill({ json: materialRequests });
      return;
    }

    let response: unknown = [];
    if (url.pathname.endsWith("/materials")) {
      response = [
        {
          id: "mat-low-1",
          name: "QA Test Cement",
          category: "Cement",
          unit: "Bag",
          totalQty: 2,
          availableQty: 2,
          reservedQty: 0,
          unitCost: 100,
          reorderLevel: 5,
          materialType: "Consumable",
          storeId: "store-1",
          storeName: "General Store",
          createdAt: new Date().toISOString(),
        },
      ];
    } else if (url.pathname.includes("reference-data")) {
      response = {
        projects: [{ id: "project-1", name: "QA Project" }],
        employees: [],
        departments: [],
      };
    } else if (url.pathname.endsWith("/stores")) {
      response = [{ id: "store-1", name: "General Store", type: "General" }];
    } else if (url.pathname.includes("material-categories")) {
      response = [{ id: "cat-1", name: "Cement", materials: [] }];
    } else if (url.pathname.endsWith("/admin/my-approval-processes")) {
      response = { processIds: ["p_material_requests"] };
    } else if (url.pathname.endsWith("/me/permissions")) {
      response = {
        isSuper: true,
        appAccess: ["storefront", "procurement", "ess"],
        navAccess: {},
        navUnrestrictedApps: ["storefront", "procurement", "ess"],
        processPermissions: {},
        roleProcessPermissions: {},
        processSources: {},
        processUnrestrictedApps: ["storefront", "procurement", "ess"],
        inherited: { navIds: [], processIds: [] },
        extended: { navIds: [], processIds: [], deniedProcessIds: [] },
      };
    } else if (url.pathname.endsWith("/admin/general-settings/public")) {
      response = { generalSettings: {}, currencyOptions: [] };
    }

    await route.fulfill({ json: response });
  });
}

test("Add Material exposes a searchable category dropdown and item threshold", async ({
  page,
}) => {
  const calls: CapturedCall[] = [];
  await mockAuthenticatedApplication(page, calls);

  await page.goto("/apps/storefront/all-materials");
  await expect(
    page.getByRole("columnheader", { name: "Reorder Threshold" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add Material" }).click();
  const categoryPicker = page.getByPlaceholder("Search or select a category…");
  await categoryPicker.click();
  await expect(page.getByRole("option", { name: /Cement/ })).toBeVisible();
  await page.getByRole("option", { name: /Cement/ }).click();

  await expect(page.getByPlaceholder("Reorder threshold *")).toBeVisible();
  const addSection = page.getByText("Add materials to Cement", { exact: true });
  const listSection = page.getByText("Materials under Cement", { exact: true });
  await expect(addSection).toBeVisible();
  await expect(listSection).toBeVisible();
  const addBox = await addSection.boundingBox();
  const listBox = await listSection.boundingBox();
  expect(addBox?.y).toBeLessThan(listBox?.y ?? 0);
});

test("low-stock material request persists and appears in Storefront and Procurement", async ({
  page,
}) => {
  const calls: CapturedCall[] = [];
  await mockAuthenticatedApplication(page, calls);

  await page.goto("/apps/storefront/all-materials");
  await expect(page.getByText("QA Test Cement", { exact: true })).toBeVisible();

  await page.locator('[title="Send for Procurement"]').click();
  await page.getByPlaceholder("Enter quantity…").fill("10");
  await page.getByRole("button", { name: "Send to Procurement" }).click();

  await expect.poll(
    () =>
      calls.filter(
        (call) =>
          call.method === "POST" && call.path.endsWith("/material-requests"),
      ).length,
  ).toBe(1);

  const createCall = calls.find(
    (call) => call.method === "POST" && call.path.endsWith("/material-requests"),
  );
  expect(createCall?.body).toMatchObject({
    materialName: "QA Test Cement",
    unit: "Bag",
    qty: 10,
    storeId: "store-1",
    storeName: "General Store",
    status: "pending",
    requestedBy: "QA Admin",
  });

  await page.reload();
  await expect(page.locator('[title="Sent to Procurement"]')).toBeVisible();

  await page.goto("/apps/storefront/incoming-requests");
  await expect(page.getByText("QA Test Cement", { exact: true }).first()).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: "approver-user",
        name: "QA Approver",
        email: "approver@example.com",
        role: "admin",
        assignedApps: ["storefront", "procurement", "ess"],
      }),
    );
  });
  await page.goto("/apps/procurement/material-requests");
  await page.getByText("MRQ-QA-001", { exact: true }).first().click();
  await expect(page.getByText("QA Test Cement", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve Request" }).click();

  await expect.poll(
    () =>
      calls.filter(
        (call) =>
          call.method === "PATCH" &&
          call.path.endsWith("/material-requests/material-request-1") &&
          call.body?.status === "approved",
      ).length,
  ).toBe(1);

  await page.reload();
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

  await page.goto("/apps/storefront/incoming-requests");
  const sharedRequestRow = page.locator("tr", { hasText: "QA Test Cement" });
  await expect(sharedRequestRow).toContainText("Approved");
});
