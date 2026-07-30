/**
 * BuildOS — export buttons, end to end.
 *
 * The product owner reported that export functionality was unreliable across
 * the app. A sweep found ten export/download buttons rendered with no onClick
 * handler at all: they looked clickable and did nothing.
 *
 * This suite pins each of them so a handler can't be dropped again silently:
 *  - the CSV exports must actually emit a download, with the shared
 *    timestamped filename convention from src/app/utils/exportCSV.ts,
 *  - the payslip / payroll "Download PDF" buttons must reach the browser's
 *    print pipeline (which is where "Save as PDF" produces the file).
 *
 * Run:
 *   BUILDOS_API=http://localhost:8090/api BUILDOS_URL=http://localhost:5180 \
 *     npx playwright test e2e/exports.spec.ts --reporter=list
 */

import { test, expect, type Page } from "@playwright/test";

const API = process.env.BUILDOS_API || "http://localhost:8080/api";

/** exportCSV appends `_YYYY-MM-DD_HH-MM` to every filename. */
const CSV_FILENAME = /^[a-z0-9-]+.*_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/;

/** Seeds the session into localStorage and returns the access token. */
async function givenLoggedInAsAdmin(page: Page): Promise<string> {
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
  return access_token as string;
}

interface ExportCase {
  /** Page under test, for the test title. */
  name: string;
  path: string;
  /** Accessible name of the export button. */
  button: RegExp;
  /** Expected filename stem, proving the right dataset was exported. */
  filenameStem: RegExp;
}

// One case per previously-dead CSV button. Each asserts the filename stem so a
// button wired to the wrong dataset fails rather than passing on "any download".
const CSV_CASES: ExportCase[] = [
  {
    name: "HR · Attendance Logs · Export Logs",
    path: "/apps/hr/attendance-logs",
    button: /Export Logs/i,
    filenameStem: /^attendance-logs_/,
  },
  {
    name: "HR · Leave Balances · Export",
    path: "/apps/hr/leave-balances",
    button: /^Export$/i,
    filenameStem: /^leave-balances/,
  },
  {
    name: "HR · Reports · Export",
    path: "/apps/hr/reports",
    button: /^Export$/i,
    filenameStem: /^(attendance|workforce|payroll)/,
  },
  {
    name: "Procurement · Reports · Export",
    path: "/apps/procurement/reports",
    button: /^Export$/i,
    filenameStem: /^procurement-/,
  },
];

for (const c of CSV_CASES) {
  test(`${c.name} emits a CSV download`, async ({ page }) => {
    await givenLoggedInAsAdmin(page);
    await page.goto(c.path);

    const button = page.getByRole("button", { name: c.button }).first();
    await expect(button).toBeVisible({ timeout: 20_000 });

    const download = page.waitForEvent("download", { timeout: 15_000 });
    await button.click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(CSV_FILENAME);
    expect(file.suggestedFilename()).toMatch(c.filenameStem);
  });
}

/**
 * Records every document printDocument renders, as it is created.
 *
 * printDocument builds the document inside an off-screen iframe and calls that
 * frame's print(). Two things rule out the obvious approaches: stubbing
 * window.print does not reach the frame (each frame is its own realm, so a stub
 * on the top window is invisible inside it), and polling the DOM afterwards
 * finds nothing because headless Chromium fires afterprint immediately, so the
 * helper's cleanup detaches the frame before any assertion can look at it.
 *
 * A MutationObserver installed before the app loads catches the frame while it
 * is still attached. Capturing its rendered text is the stronger assertion
 * anyway — it proves the document was actually composed, not merely that a
 * print call was attempted.
 */
async function recordPrintedDocuments(page: Page) {
  await page.addInitScript(() => {
    (window as any).__printedDocs = [];
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (
            node instanceof HTMLIFrameElement &&
            node.getAttribute("aria-hidden") === "true"
          ) {
            // The helper writes the document synchronously right after
            // appending, so by the time this callback runs it is populated.
            (window as any).__printedDocs.push({
              title: node.getAttribute("title") ?? "",
              text: node.contentDocument?.body?.innerText ?? "",
            });
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

const printedDocuments = (page: Page) =>
  page.evaluate(
    () =>
      (window as any).__printedDocs as { title: string; text: string }[],
  );

test("ESS · Payslip History · Download PDF renders a payslip document", async ({
  page,
}) => {
  await recordPrintedDocuments(page);
  const token = await givenLoggedInAsAdmin(page);

  // Seed a payslip so this pins behaviour rather than skipping on an empty env.
  const period = `E2E ${Date.now()}`;
  const seeded = await page.request.post(`${API}/payslips`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      employeeName: "Export Tester",
      department: "QA",
      period,
      month: 4,
      year: 2026,
      grossPay: 500000,
      deductions: 75000,
      netPay: 425000,
      status: "Paid",
    },
  });
  expect(seeded.ok(), `payslip seed failed: ${await seeded.text()}`).toBeTruthy();

  await page.goto("/apps/ess/payslips");
  await expect(
    page.getByRole("heading", { name: /Payslip History/i }),
  ).toBeVisible({ timeout: 20_000 });

  const row = page.getByRole("row", { name: new RegExp(period) });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole("button", { name: /Download PDF/i }).click();

  await expect.poll(() => printedDocuments(page), { timeout: 10_000 }).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: `Payslip ${period}`,
        // The money figures must reach the document, not just the heading.
        text: expect.stringContaining("425,000"),
      }),
    ]),
  );
});

test("HR · Payroll Processing · Download PDF renders a run summary", async ({
  page,
}) => {
  await recordPrintedDocuments(page);
  await givenLoggedInAsAdmin(page);
  await page.goto("/apps/hr/payroll-processing");

  // The summary button only appears once a run completes, so drive the run.
  const runButton = page.getByRole("button", { name: /Run Payroll/i }).first();
  await expect(runButton).toBeVisible({ timeout: 20_000 });
  await runButton.click();

  const pdfButton = page.getByRole("button", { name: /Download PDF/i }).first();
  await expect(pdfButton).toBeVisible({ timeout: 30_000 });
  await pdfButton.click();

  await expect.poll(() => printedDocuments(page), { timeout: 10_000 }).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: expect.stringMatching(/^Payroll Summary /),
        text: expect.stringContaining("Total disbursed"),
      }),
    ]),
  );
});
