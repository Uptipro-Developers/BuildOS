import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { fetchAccruals, fetchAccrualTypes } from "../api/accruals";
import { getChartAccounts } from "../api/finance-extras";
import type {
  Account, AccountType, FiscalYear,
  Accrual, TxnType, AccrualTypeConfig,
} from "../pages/finance/types";

// ── Transaction type (from TransactionsLedger) ─────────────────────────────
interface Transaction {
  id: string; type: TxnType; description: string;
  debitAccount: string; creditAccount: string;
  reference: string; amount: number; date: string; createdBy: string;
  sourceApp: string; sourceProcess: string;
  approvalStatus: "approved" | "pending" | "auto-approved";
  linkedRecords?: { label: string; ref: string }[];
  notes?: string;
  fiscalYearId?: string;
}

// ── Context shape ──────────────────────────────────────────────────────────
interface FinanceContextValue {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  fiscalYears: FiscalYear[];
  setFiscalYears: React.Dispatch<React.SetStateAction<FiscalYear[]>>;
  accruals: Accrual[];
  setAccruals: React.Dispatch<React.SetStateAction<Accrual[]>>;
  accrualTypeConfigs: AccrualTypeConfig[];
  setAccrualTypeConfigs: React.Dispatch<React.SetStateAction<AccrualTypeConfig[]>>;
  /** Re-reads accruals from the backend after a mutation. */
  reloadAccruals: () => Promise<void>;

  getAccountBalance: (accountId: string) => number;
  getAccountsByType: (type: AccountType) => Account[];
  getDescendantIds: (parentId: string) => string[];
  getTrialBalance: (fiscalYearId?: string) => TrialBalanceRow[];
  getBalanceSheet: (fiscalYearId?: string) => BalanceSheetSection[];
  getIncomeStatement: (fiscalYearId?: string) => IncomeStatementRow[];
}

export interface TrialBalanceRow {
  code: string;
  accountName: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface BalanceSheetSection {
  section: string;
  total: number;
  items: { account: string; code: string; amount: number }[];
}

export interface IncomeStatementRow {
  label: string;
  amount: number;
  isTotal?: boolean;
  isSection?: boolean;
}

// ── Seed Accounts ──────────────────────────────────────────────────────────
const SEED_ACCOUNTS: Account[] = [
  { id: "a1",  code: "1000", name: "Assets",                type: "Assets",      parentId: null, description: "All asset accounts" },
  { id: "a2",  code: "1100", name: "Current Assets",        type: "Assets",      parentId: "a1",  description: "Short-term assets" },
  { id: "a3",  code: "1110", name: "Cash & Bank",           type: "Assets",      parentId: "a2",  description: "Cash on hand and bank balances" },
  { id: "a4",  code: "1120", name: "Accounts Receivable",   type: "Assets",      parentId: "a2",  description: "Amounts owed by customers" },
  { id: "a5",  code: "1200", name: "Fixed Assets",          type: "Assets",      parentId: "a1",  description: "Long-term physical assets" },
  { id: "a6",  code: "1210", name: "Plant & Equipment",     type: "Assets",      parentId: "a5",  description: "Machinery and equipment" },
  { id: "a7",  code: "2000", name: "Liabilities",           type: "Liabilities", parentId: null, description: "All liability accounts" },
  { id: "a8",  code: "2100", name: "Current Liabilities",   type: "Liabilities", parentId: "a7",  description: "Short-term obligations" },
  { id: "a9",  code: "2110", name: "Accounts Payable",      type: "Liabilities", parentId: "a8",  description: "Amounts owed to suppliers" },
  { id: "a10", code: "2120", name: "Accrued Expenses",      type: "Liabilities", parentId: "a8",  description: "Expenses incurred but not yet paid" },
  { id: "a11", code: "3000", name: "Equity",                type: "Equity",      parentId: null, description: "Owner's equity" },
  { id: "a12", code: "3100", name: "Retained Earnings",     type: "Equity",      parentId: "a11", description: "Accumulated profits" },
  { id: "a13", code: "4000", name: "Income",                type: "Income",      parentId: null, description: "All income accounts" },
  { id: "a14", code: "4100", name: "Contract Revenue",      type: "Income",      parentId: "a13", description: "Revenue from construction contracts" },
  { id: "a15", code: "4200", name: "Service Income",        type: "Income",      parentId: "a13", description: "Revenue from services rendered" },
  { id: "a16", code: "5000", name: "Expenses",              type: "Expenses",    parentId: null, description: "All expense accounts" },
  { id: "a17", code: "5100", name: "Labour Costs",          type: "Expenses",    parentId: "a16", description: "Wages and salaries" },
  { id: "a18", code: "5200", name: "Material Costs",        type: "Expenses",    parentId: "a16", description: "Raw materials and supplies" },
  { id: "a19", code: "5300", name: "Equipment Costs",       type: "Expenses",    parentId: "a16", description: "Equipment hire and maintenance" },
  { id: "a20", code: "5400", name: "Overhead",              type: "Expenses",    parentId: "a16", description: "General overhead costs" },
];

// ── Seed Fiscal Years ──────────────────────────────────────────────────────
const SEED_FISCAL_YEARS: FiscalYear[] = [
  { id: "fy1", label: "FY 2025", startDate: "2025-01-01", endDate: "2025-12-31", status: "closed", isCurrent: false, closedAt: "2026-01-15", closedBy: "Sola Adeleke" },
  { id: "fy2", label: "FY 2026", startDate: "2026-01-01", endDate: "2026-12-31", status: "open", isCurrent: true },
];



// ── Context ────────────────────────────────────────────────────────────────
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(SEED_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>(SEED_FISCAL_YEARS);
  // Accruals and their type catalogue are persisted server-side. They used to be
  // seeded from a hardcoded array and mirrored into localStorage, so nothing a
  // user entered survived a refresh (and every session showed the same demo rows).
  const [accruals, setAccruals] = useState<Accrual[]>([]);
  const [accrualTypeConfigs, setAccrualTypeConfigs] = useState<AccrualTypeConfig[]>([]);

  const reloadAccruals = useCallback(
    () => fetchAccruals().then(setAccruals),
    [],
  );

  useEffect(() => {
    reloadAccruals().catch(() => setAccruals([]));
    fetchAccrualTypes()
      .then(setAccrualTypeConfigs)
      .catch(() => setAccrualTypeConfigs([]));

    // The chart of accounts is persisted server-side. SEED_ACCOUNTS is only the
    // pre-load placeholder: without this, every consumer of the store (the
    // Accruals line-item picker most visibly) offered the same demo ledger
    // rather than the accounts the org actually configured.
    getChartAccounts()
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        setAccounts(
          rows.map((a: any) => ({
            id: a.id,
            code: a.code ?? "",
            name: a.name ?? "",
            type: a.type,
            parentId: a.parentId ?? null,
            description: a.description ?? "",
            balance: a.balance ?? undefined,
          })),
        );
      })
      .catch(() => {
        /* keep the placeholder ledger if the lookup fails */
      });
  }, [reloadAccruals]);

  const getDescendantIds = useCallback((parentId: string): string[] => {
    const children = accounts.filter(a => a.parentId === parentId);
    return [
      parentId,
      ...children.flatMap(c => getDescendantIds(c.id)),
    ];
  }, [accounts]);

  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const descendantIds = getDescendantIds(accountId);
    const isDebitType = account.type === "Assets" || account.type === "Expenses";

    let balance = 0;
    for (const txn of transactions) {
      const matchesDR = descendantIds.some(id => {
        const a = accounts.find(ac => ac.id === id);
        return a && txn.debitAccount.includes(a.code);
      });
      const matchesCR = descendantIds.some(id => {
        const a = accounts.find(ac => ac.id === id);
        return a && txn.creditAccount.includes(a.code);
      });

      if (matchesDR && matchesCR) continue; // contra entry
      if (matchesDR) balance += Math.abs(txn.amount);
      if (matchesCR) balance -= Math.abs(txn.amount);
    }

    return isDebitType ? balance : -balance;
  }, [accounts, transactions, getDescendantIds]);

  const getAccountsByType = useCallback((type: AccountType) =>
    accounts.filter(a => a.type === type),
  [accounts]);

  // ── Trial Balance ──────────────────────────────────────────────────────
  const getTrialBalance = useCallback((fiscalYearId?: string): TrialBalanceRow[] => {
    const filtered = fiscalYearId
      ? transactions.filter(t => t.fiscalYearId === fiscalYearId)
      : transactions;

    const accountBalances: Record<string, { debit: number; credit: number }> = {};

    for (const account of accounts) {
      if (account.parentId !== null) continue; // only top-level
      const descIds = getDescendantIds(account.id);
      let dr = 0; let cr = 0;
      for (const txn of filtered) {
        const matchesDR = descIds.some(id => {
          const a = accounts.find(ac => ac.id === id);
          return a && txn.debitAccount.includes(a.code);
        });
        const matchesCR = descIds.some(id => {
          const a = accounts.find(ac => ac.id === id);
          return a && txn.creditAccount.includes(a.code);
        });
        if (matchesDR === matchesCR) continue;
        if (matchesDR) {
          if (account.type === "Assets" || account.type === "Expenses") dr += Math.abs(txn.amount);
          else cr += Math.abs(txn.amount);
        }
        if (matchesCR) {
          if (account.type === "Liabilities" || account.type === "Equity" || account.type === "Income") cr += Math.abs(txn.amount);
          else dr += Math.abs(txn.amount);
        }
      }
      accountBalances[account.id] = { debit: dr, credit: cr };
    }

    return accounts
      .filter(a => a.parentId === null)
      .map(a => ({
        code: a.code,
        accountName: a.name,
        type: a.type,
        debit: accountBalances[a.id]?.debit ?? 0,
        credit: accountBalances[a.id]?.credit ?? 0,
      }));
  }, [accounts, transactions, getDescendantIds]);

  // ── Balance Sheet ──────────────────────────────────────────────────────
  const getBalanceSheet = useCallback((fiscalYearId?: string): BalanceSheetSection[] => {
    const tb = getTrialBalance(fiscalYearId);
    const sections: BalanceSheetSection[] = [];

    const assetAccounts = tb.filter(r => r.type === "Assets");
    const assetTotal = assetAccounts.reduce((s, r) => s + r.debit - r.credit, 0);
    sections.push({
      section: "Assets",
      total: assetTotal,
      items: assetAccounts.map(r => ({ account: r.accountName, code: r.code, amount: r.debit - r.credit })),
    });

    const liabilityAccounts = tb.filter(r => r.type === "Liabilities");
    const liabilityTotal = liabilityAccounts.reduce((s, r) => s + r.credit - r.debit, 0);
    sections.push({
      section: "Liabilities",
      total: liabilityTotal,
      items: liabilityAccounts.map(r => ({ account: r.accountName, code: r.code, amount: r.credit - r.debit })),
    });

    const equityAccounts = tb.filter(r => r.type === "Equity");
    const incomeTotal = tb.filter(r => r.type === "Income").reduce((s, r) => s + r.credit - r.debit, 0);
    const expenseTotal = tb.filter(r => r.type === "Expenses").reduce((s, r) => s + r.debit - r.credit, 0);
    const netIncome = incomeTotal - expenseTotal;

    const equityItems = equityAccounts.map(r => ({ account: r.accountName, code: r.code, amount: r.credit - r.debit }));
    equityItems.push({ account: "Current Year Earnings", code: "—", amount: netIncome });
    const equityTotal = equityItems.reduce((s, i) => s + i.amount, 0);

    sections.push({
      section: "Equity",
      total: equityTotal,
      items: equityItems,
    });

    return sections;
  }, [getTrialBalance]);

  // ── Income Statement ───────────────────────────────────────────────────
  const getIncomeStatement = useCallback((fiscalYearId?: string): IncomeStatementRow[] => {
    const tb = getTrialBalance(fiscalYearId);
    const rows: IncomeStatementRow[] = [];

    const incomeAccounts = tb.filter(r => r.type === "Income");
    const totalIncome = incomeAccounts.reduce((s, r) => s + r.credit - r.debit, 0);
    rows.push({ label: "Income", amount: 0, isSection: true });
    incomeAccounts.forEach(r => rows.push({ label: `  ${r.accountName}`, amount: r.credit - r.debit }));
    rows.push({ label: "Total Income", amount: totalIncome, isTotal: true });

    rows.push({ label: "", amount: 0 });

    const expenseAccounts = tb.filter(r => r.type === "Expenses");
    const totalExpenses = expenseAccounts.reduce((s, r) => s + r.debit - r.credit, 0);
    rows.push({ label: "Expenses", amount: 0, isSection: true });
    expenseAccounts.forEach(r => rows.push({ label: `  ${r.accountName}`, amount: r.debit - r.credit }));
    rows.push({ label: "Total Expenses", amount: totalExpenses, isTotal: true });

    rows.push({ label: "", amount: 0 });
    rows.push({ label: "Net Income / (Loss)", amount: totalIncome - totalExpenses, isTotal: true });

    return rows;
  }, [getTrialBalance]);

  const value = useMemo(() => ({
    accounts, setAccounts,
    transactions, setTransactions,
    fiscalYears, setFiscalYears,
    accruals, setAccruals, reloadAccruals,
    accrualTypeConfigs, setAccrualTypeConfigs,
    getAccountBalance, getAccountsByType, getDescendantIds,
    getTrialBalance, getBalanceSheet, getIncomeStatement,
  }), [accounts, transactions, fiscalYears, accruals, reloadAccruals, accrualTypeConfigs, getAccountBalance, getAccountsByType, getDescendantIds, getTrialBalance, getBalanceSheet, getIncomeStatement]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
