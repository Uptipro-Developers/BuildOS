/**
 * BuildOS — ESS leave request, end to end.
 *
 * Covers the flow the product owner asked for: a leave request is created, it
 * adopts the configured approval process, and once fully approved it feeds the
 * HR leave calculations.
 *
 * Also pins the guards that were missing (the create used to 500 outright):
 *  - the ESS form's `reason` field maps onto the `notes` column,
 *  - over-entitlement and overlapping dates are refused,
 *  - a multi-approval leave type is not released by a single approval,
 *  - rejected leave never consumes balance.
 *
 * Run:
 *   BUILDOS_API=http://localhost:8090/api npx playwright test e2e/leave-flow.spec.ts
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

const API = process.env.BUILDOS_API || "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.BUILDOS_ADMIN_EMAIL || "admin@buildos.ng";
const ADMIN_PASSWORD = process.env.BUILDOS_ADMIN_PASSWORD || "BuildOS@2025";

async function login(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `login failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).access_token as string;
}

const auth = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

/** A dedicated employee per test keeps balances independent between runs. */
async function freshEmployee(request: APIRequestContext, token: string, tag: string) {
  const res = await request.post(`${API}/employees`, {
    headers: auth(token),
    data: {
      firstName: "Leave",
      lastName: tag,
      email: `leave.${tag.toLowerCase()}@buildos-e2e.ng`,
      phone: "+2348000000000",
      role: "QA Engineer",
      employmentType: "FullTime",
      status: "active",
      dateHired: new Date().toISOString(),
    },
  });
  expect(res.ok(), `employee create failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).id as string;
}

async function leaveTypeByName(request: APIRequestContext, token: string, name: string) {
  const types = await (
    await request.get(`${API}/leave-types`, { headers: auth(token) })
  ).json();
  const match = types.find((t: any) => t.name === name);
  expect(match, `leave type "${name}" should exist`).toBeTruthy();
  return match;
}

function isoDaysFromNow(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

test("a leave request submitted with the ESS payload is created, not rejected with a 500", async ({ request }) => {
  const token = await login(request);
  const employeeId = await freshEmployee(request, token, `Create${Date.now()}`);
  const annual = await leaveTypeByName(request, token, "Annual Leave");

  const res = await request.post(`${API}/leave-requests`, {
    headers: auth(token),
    data: {
      leaveTypeId: annual.id,
      employeeId,
      startDate: isoDaysFromNow(30),
      endDate: isoDaysFromNow(34),
      days: 5,
      // The ESS form sends `reason`; the column is `notes`.
      reason: "Family event",
    },
  });
  expect(res.status(), await res.text()).toBe(201);

  const created = (await res.json()).data;
  expect(created.notes).toBe("Family event");
  expect(created.status).toBe("pending");
  // The balance at submission time is captured for audit.
  expect(created.balanceBefore).toBe(annual.daysAllowed);
});

test("leave requests that exceed entitlement or overlap existing dates are refused", async ({ request }) => {
  const token = await login(request);
  const employeeId = await freshEmployee(request, token, `Guard${Date.now()}`);
  const annual = await leaveTypeByName(request, token, "Annual Leave");

  const first = await request.post(`${API}/leave-requests`, {
    headers: auth(token),
    data: {
      leaveTypeId: annual.id, employeeId,
      startDate: isoDaysFromNow(60), endDate: isoDaysFromNow(64), days: 5,
      reason: "First booking",
    },
  });
  expect(first.ok()).toBeTruthy();

  // Overlapping the request above.
  const overlap = await request.post(`${API}/leave-requests`, {
    headers: auth(token),
    data: {
      leaveTypeId: annual.id, employeeId,
      startDate: isoDaysFromNow(62), endDate: isoDaysFromNow(68), days: 5,
      reason: "Clashing",
    },
  });
  expect(overlap.status()).toBe(409);
  expect(await overlap.text()).toContain("overlap");

  // Beyond the annual entitlement.
  const tooLong = await request.post(`${API}/leave-requests`, {
    headers: auth(token),
    data: {
      leaveTypeId: annual.id, employeeId,
      startDate: isoDaysFromNow(200), endDate: isoDaysFromNow(260),
      days: annual.daysAllowed + 10,
      reason: "Too long",
    },
  });
  expect(tooLong.status()).toBe(400);
  expect(await tooLong.text()).toContain("Insufficient leave balance");

  // Inverted dates.
  const backwards = await request.post(`${API}/leave-requests`, {
    headers: auth(token),
    data: {
      leaveTypeId: annual.id, employeeId,
      startDate: isoDaysFromNow(120), endDate: isoDaysFromNow(110), days: 3,
    },
  });
  expect(backwards.status()).toBe(400);
});

test("approval follows the configured process and only the final step consumes balance", async ({ request }) => {
  const token = await login(request);
  const employeeId = await freshEmployee(request, token, `Multi${Date.now()}`);
  // Maternity Leave requires two approvals.
  const maternity = await leaveTypeByName(request, token, "Maternity Leave");
  expect(maternity.approvalsRequired).toBeGreaterThan(1);

  const created = (await (
    await request.post(`${API}/leave-requests`, {
      headers: auth(token),
      data: {
        leaveTypeId: maternity.id, employeeId,
        startDate: isoDaysFromNow(90), endDate: isoDaysFromNow(120), days: 22,
        reason: "Maternity",
      },
    })
  ).json()).data;
  // The approval process must actually start.
  expect(created.workflowWarning ?? null).toBeNull();

  const first = await request.post(`${API}/leave-requests/${created.id}/approve`, {
    headers: auth(token),
    data: { comments: "Manager ok" },
  });
  expect(first.ok(), await first.text()).toBeTruthy();
  const afterFirst = await first.json();
  // One approval of two — still pending, and no balance consumed yet.
  expect(afterFirst.data.status).toBe("pending");
  expect(afterFirst.approvals.approved).toBe(1);
  expect(afterFirst.approvals.required).toBe(maternity.approvalsRequired);

  const balanceMidway = await (
    await request.get(
      `${API}/leave-requests/balance/${employeeId}?leaveTypeId=${maternity.id}`,
      { headers: auth(token) },
    )
  ).json();
  expect((balanceMidway.data ?? balanceMidway).usedDays).toBe(0);

  const second = await request.post(`${API}/leave-requests/${created.id}/approve`, {
    headers: auth(token),
    data: { comments: "HR Manager ok" },
  });
  const afterSecond = await second.json();
  expect(afterSecond.data.status).toBe("approved");
  expect(afterSecond.data.balanceAfter).toBe(maternity.daysAllowed - 22);

  // HR leave calculations now reflect the approved leave.
  const balanceFinal = await (
    await request.get(
      `${API}/leave-requests/balance/${employeeId}?leaveTypeId=${maternity.id}`,
      { headers: auth(token) },
    )
  ).json();
  const b = balanceFinal.data ?? balanceFinal;
  expect(b.usedDays).toBe(22);
  expect(b.availableDays).toBe(maternity.daysAllowed - 22);

  // A settled request cannot be approved again.
  const again = await request.post(`${API}/leave-requests/${created.id}/approve`, {
    headers: auth(token),
    data: {},
  });
  expect(again.status()).toBe(409);
});

test("rejected leave does not consume balance and cannot then be approved", async ({ request }) => {
  const token = await login(request);
  const employeeId = await freshEmployee(request, token, `Reject${Date.now()}`);
  const annual = await leaveTypeByName(request, token, "Annual Leave");

  const created = (await (
    await request.post(`${API}/leave-requests`, {
      headers: auth(token),
      data: {
        leaveTypeId: annual.id, employeeId,
        startDate: isoDaysFromNow(45), endDate: isoDaysFromNow(49), days: 5,
        reason: "Trip",
      },
    })
  ).json()).data;

  const rejected = await request.post(`${API}/leave-requests/${created.id}/reject`, {
    headers: auth(token),
    data: { reason: "Peak project period" },
  });
  expect(rejected.ok()).toBeTruthy();
  const body = await rejected.json();
  expect(body.data.status).toBe("rejected");
  expect(body.data.notes).toBe("Peak project period");

  const balance = await (
    await request.get(
      `${API}/leave-requests/balance/${employeeId}?leaveTypeId=${annual.id}`,
      { headers: auth(token) },
    )
  ).json();
  expect((balance.data ?? balance).usedDays).toBe(0);

  const approveAfterReject = await request.post(
    `${API}/leave-requests/${created.id}/approve`,
    { headers: auth(token), data: {} },
  );
  expect(approveAfterReject.status()).toBe(409);
});
