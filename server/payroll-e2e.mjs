import { PrismaClient } from '@prisma/client';

/**
 * Walks one payroll run from HR approval into the general ledger, against the
 * real database, then removes everything it created.
 *
 * The flow has 18 unit tests but had never run for real — there are no payroll
 * runs in this database — so this exists to prove the parts fit together:
 * the status gates, the process mapping, the posting engine, and the effect on
 * the Chart of Accounts.
 */
const prisma = new PrismaClient();
const API = 'http://localhost:8080/api';

const MAPPING_KEY = 'finance-process-mappings';
const created = { runId: null, journalIds: [], mappingRestore: undefined, hadMapping: false };

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@buildos.ng', password: 'BuildOS@2025' }),
});
const { access_token } = await login.json();
const auth = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: auth,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
};

const balancesOf = async (codes) => {
  const rows = await prisma.chartAccount.findMany({
    where: { code: { in: codes } },
    select: { code: true, balance: true },
  });
  return Object.fromEntries(rows.map((r) => [r.code, r.balance]));
};

const CODES = ['5100', '2120', '1110'];
const step = (n, s) => console.log(`\n${n}. ${s}`);

try {
  // ── Set up the mapping payroll posts through ──────────────────────────────
  const existing = await prisma.systemSetting.findUnique({ where: { key: MAPPING_KEY } });
  created.hadMapping = Boolean(existing);
  created.mappingRestore = existing?.value ?? null;

  const mappings = Array.isArray(existing?.value) ? [...existing.value] : [];
  const already = mappings.some(
    (m) => String(m?.process ?? '').toLowerCase() === 'payroll disbursement',
  );
  step(1, `Payroll Disbursement mapping already configured: ${already}`);
  if (!already) {
    mappings.push({
      id: 'e2e-payroll-disbursement',
      application: 'HR',
      process: 'Payroll Disbursement',
      status: 'mapped',
      lines: [
        { id: 'l1', field: 'Gross Salary', glCode: '5100', account: 'Labour Costs', action: 'debit' },
        { id: 'l2', field: 'PAYE Tax', glCode: '2120', account: 'Accrued Expenses', action: 'credit' },
        { id: 'l3', field: 'Net Pay', glCode: '1110', account: 'Cash & Bank', action: 'credit' },
      ],
    });
    await prisma.systemSetting.upsert({
      where: { key: MAPPING_KEY },
      create: { key: MAPPING_KEY, value: mappings },
      update: { value: mappings },
    });
    console.log('   added a temporary one for this run');
  }

  // ── An HR-approved run, the way the orchestration leaves it ───────────────
  const run = await prisma.payrollRun.create({
    data: {
      periodName: 'E2E Smoke Period',
      month: 8,
      year: 2026,
      status: 'Completed', // what payroll orchestration actually writes
      totalGross: 1000,
      totalNet: 800,
      employeeCount: 2,
      entries: {
        create: [
          { employeeName: 'E2E One', department: 'Ops', grossPay: 600, netPay: 480, deductions: 120, tax: 120 },
          { employeeName: 'E2E Two', department: 'Ops', grossPay: 400, netPay: 320, deductions: 80, tax: 80 },
        ],
      },
    },
  });
  created.runId = run.id;
  step(2, `Created an HR-"Completed" run: ${run.id}`);

  const before = await balancesOf(CODES);
  console.log('   balances before:', before);

  // ── It should surface in the Overview, reported as Approved ───────────────
  const overview = await call('/payroll-overview');
  const row = overview.body.find((r) => r.id === run.id);
  step(3, 'Appears in Payroll Overview');
  console.log(`   status: ${row.status}  code: ${row.code}`);
  console.log(`   earnings ${row.totalEarnings} · deductions ${row.totalDeductions} · net ${row.netPay}`);
  console.log(`   month ${row.month} year ${row.year}`);

  // ── Posting must be refused before it is approved ─────────────────────────
  const early = await call(`/payroll-overview/${run.id}/post`, 'POST', {});
  step(4, `Posting before approval refused: ${!early.ok} (${early.status})`);
  console.log(`   "${early.body.message}"`);

  // ── Send for posting approval ─────────────────────────────────────────────
  const sent = await call(`/payroll-overview/${run.id}/send-for-posting-approval`, 'POST', {});
  step(5, `Send for Posting Approval → ${sent.body.status}  (code ${sent.body.code})`);

  const midway = await balancesOf(CODES);
  console.log('   balances unchanged so far:', JSON.stringify(midway) === JSON.stringify(before));

  // ── Approve the posting — still moves nothing ─────────────────────────────
  const approved = await call(`/payroll-overview/${run.id}/approve-posting`, 'POST', {});
  step(6, `Approve Posting → ${approved.body.status}`);
  const afterApproval = await balancesOf(CODES);
  console.log('   balances still unchanged:', JSON.stringify(afterApproval) === JSON.stringify(before));

  // ── Preview, then post ────────────────────────────────────────────────────
  const preview = await call(`/payroll-overview/${run.id}/posting-preview`);
  step(7, `Preview: mapped=${preview.body.mapped} balanced=${preview.body.balanced}`);
  for (const l of preview.body.lines) {
    console.log(`   ${l.accountCode} ${l.accountName.padEnd(20)} dr ${String(l.debit).padStart(6)}  cr ${String(l.credit).padStart(6)}`);
  }

  const posted = await call(`/payroll-overview/${run.id}/post`, 'POST', {});
  if (!posted.ok) throw new Error(`post failed: ${JSON.stringify(posted.body)}`);
  created.journalIds.push(posted.body.journalEntry.id);
  step(8, `Post → run ${posted.body.run.status}, journal ${posted.body.journalEntry.reference}`);

  const after = await balancesOf(CODES);
  console.log('   balances after:', after);
  console.log('   deltas:', Object.fromEntries(CODES.map((c) => [c, after[c] - before[c]])));

  // ── It should be in the General Ledger, traceable back to the run ─────────
  const gl = await call('/general-ledger?sourceModule=Payroll');
  const mine = gl.body.rows.filter((r) => r.sourceId === run.id);
  step(9, `General Ledger shows ${mine.length} payroll lines for this run`);
  for (const r of mine) {
    console.log(`   ${r.reference}  ${r.sourceModule}/${r.process}  origin=${r.sourceRef}  ${r.accountCode} dr ${r.debit} cr ${r.credit}`);
  }
  console.log(`   traces back to the run: ${mine.every((r) => r.sourceId === run.id)}`);

  // ── Posting twice must be refused ─────────────────────────────────────────
  const again = await call(`/payroll-overview/${run.id}/post`, 'POST', {});
  step(10, `Posting a second time refused: ${!again.ok} — "${again.body.message}"`);
} catch (err) {
  console.error('\nFAILED:', err.message);
  process.exitCode = 1;
} finally {
  // ── Remove everything this script created ─────────────────────────────────
  console.log('\n--- cleanup ---');
  for (const id of created.journalIds) {
    await prisma.journalLine.deleteMany({ where: { journalId: id } });
    await prisma.journalEntry.delete({ where: { id } }).catch(() => {});
    console.log(`  removed journal entry ${id}`);
  }
  if (created.runId) {
    await prisma.payrollEntry.deleteMany({ where: { runId: created.runId } });
    await prisma.payrollRun.delete({ where: { id: created.runId } }).catch(() => {});
    console.log(`  removed payroll run ${created.runId}`);
  }
  if (created.mappingRestore !== undefined) {
    if (created.hadMapping) {
      await prisma.systemSetting.update({
        where: { key: MAPPING_KEY },
        data: { value: created.mappingRestore },
      });
      console.log('  restored the process mappings setting');
    } else {
      await prisma.systemSetting.delete({ where: { key: MAPPING_KEY } }).catch(() => {});
      console.log('  removed the temporary process mappings setting');
    }
  }
  // Balances were moved by the posting that has now been deleted.
  const fix = await call('/chart-accounts/recompute-balances', 'POST', {});
  console.log('  recomputed balances:', JSON.stringify(fix.body));
  await prisma.$disconnect();
}
