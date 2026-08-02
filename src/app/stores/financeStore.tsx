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

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Starts empty and loads from the API. A seeded demo ledger rendered as if
  // it were the org's real chart of accounts until the fetch landed.
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
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

    // The chart of accounts is persisted server-side. This used to be seeded
    // from a hardcoded demo ledger, so every consumer of the store — the
    // Accruals line-item picker most visibly — offered accounts the org had
    // never configured.
    getChartAccounts()
      .then((rows) => {
        if (!Array.isArray(rows)) return;
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
        // Nothing to fall back to, and inventing accounts would be worse than
        // an empty ledger the user can see is empty.
        setAccounts([]);
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
