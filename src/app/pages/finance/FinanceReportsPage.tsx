import { useState, useEffect, useMemo } from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, ScrollText } from "lucide-react";
import { useFinance, type TrialBalanceRow, type IncomeStatementRow } from "../../stores/financeStore";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { exportCSV } from "../../utils/exportCSV";
import { apiFetch } from "../../api/client";
import {
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

type ReportType = "Trial Balance" | "Balance Sheet" | "Income Statement" | "Cash Flow" | "Budget vs Actual";

interface ReportTemplate {
  id: string;
  type: ReportType;
  icon: React.ReactNode;
  description: string;
  color: string;
  bg: string;
}

const templates: ReportTemplate[] = [
  { id: "trial-balance", type: "Trial Balance", icon: <ScrollText className="w-5 h-5" />, description: "List of all accounts with debit/credit balances — verifies books are balanced", color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "balance-sheet", type: "Balance Sheet", icon: <BarChart3 className="w-5 h-5" />, description: "Assets, Liabilities, and Equity at a point in time — cumulative across years", color: "text-blue-600", bg: "bg-blue-50" },
  { id: "income-statement", type: "Income Statement", icon: <TrendingUp className="w-5 h-5" />, description: "Revenue and expenses for a specific period — resets each fiscal year", color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "cashflow", type: "Cash Flow", icon: <DollarSign className="w-5 h-5" />, description: "Operating, investing, and financing cash flow summary", color: "text-amber-600", bg: "bg-amber-50" },
  { id: "budget", type: "Budget vs Actual", icon: <TrendingDown className="w-5 h-5" />, description: "Compare planned budgets against actual spend by project", color: "text-red-600", bg: "bg-red-50" },
];

interface CashFlowRow {
  label: string;
  value: string;
  positive?: boolean | null;
}

interface BudgetRow {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
}

interface BSRow {
  section: string;
  account: string;
  amount: number;
  isSection: boolean;
}

interface ReportRow {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}

interface ApiReportRow {
  label: string;
  amount: number;
  format?: "currency" | "count" | "percent";
  sub?: string;
  positive?: boolean;
}

function toDisplayRow(row: ApiReportRow): ReportRow {
  let value: string;
  switch (row.format) {
    case "count":
      value = formatNumberByGeneralSettings(row.amount);
      break;
    case "percent":
      value = `${formatNumberByGeneralSettings(row.amount)}%`;
      break;
    case "currency":
    default:
      value = formatCurrencyByGeneralSettings(row.amount);
      break;
  }
  return { label: row.label, value, sub: row.sub, positive: row.positive };
}

const fmt = (n: number) => `₦${n.toLocaleString()}`;

// ── Column definitions ──────────────────────────────────────────────────────

const tbColumns: Column<TrialBalanceRow>[] = [
  { key: "code", label: "Account Code", render: r => <span className="font-mono text-xs text-gray-500">{r.code}</span>, sortable: true, filterable: true },
  { key: "accountName", label: "Account Name", render: r => <span className="text-sm text-gray-900">{r.accountName}</span>, sortable: true, filterable: true },
  { key: "type", label: "Type", render: r => <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{r.type}</span>, sortable: true, filterable: true },
  { key: "debit", label: "Debit", render: r => r.debit > 0 ? <span className="text-sm font-mono text-gray-900">{fmt(r.debit)}</span> : <span className="text-sm font-mono text-gray-400">—</span>, sortable: true, className: "text-right" },
  { key: "credit", label: "Credit", render: r => r.credit > 0 ? <span className="text-sm font-mono text-gray-900">{fmt(r.credit)}</span> : <span className="text-sm font-mono text-gray-400">—</span>, sortable: true, className: "text-right" },
];

const isColumns: Column<IncomeStatementRow>[] = [
  { key: "label", label: "Item", render: r => <span className={`text-sm ${r.isTotal ? "font-semibold text-gray-900" : r.isSection ? "font-semibold text-gray-700" : "text-gray-900"}`}>{r.label}</span>, sortable: true, filterable: true },
  {
    key: "amount", label: "Amount",
    render: r => {
      if (r.isSection) return <span className="text-sm" />;
      return <span className={`text-sm font-mono ${r.amount >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}`}>{fmt(r.amount)}</span>;
    },
    sortable: true, className: "text-right",
  },
];

const cfColumns: Column<CashFlowRow>[] = [
  { key: "label", label: "Metric", render: r => <span className="text-sm text-gray-900">{r.label}</span>, sortable: true, filterable: true },
  { key: "value", label: "Value", render: r => <span className={`text-sm font-semibold ${r.positive === true ? "text-emerald-600" : r.positive === false ? "text-red-600" : "text-gray-900"}`}>{r.value}</span>, sortable: true, className: "text-right" },
];

const budgetColumns: Column<BudgetRow>[] = [
  { key: "label", label: "Project", render: r => <span className="text-sm text-gray-900">{r.label}</span>, sortable: true, filterable: true },
  { key: "value", label: "Utilisation", render: r => <span className={`text-sm font-semibold ${r.positive === false ? "text-red-600" : "text-gray-900"}`}>{r.value}</span>, sortable: true, className: "text-right" },
  { key: "sub", label: "Details", render: r => <span className="text-xs text-gray-400">{r.sub ?? "—"}</span>, sortable: false, filterable: false, className: "text-right" },
];

const bsColumns: Column<BSRow>[] = [
  { key: "account", label: "Account", render: r => r.isSection ? <span className="text-sm font-bold text-gray-900">{r.account}</span> : <span className="text-sm text-gray-600 ml-6">{r.account}</span>, sortable: true, filterable: true },
  { key: "amount", label: "Amount", render: r => <span className={`text-sm font-mono ${r.isSection ? "font-bold text-gray-900" : "text-gray-800"}`}>{fmt(r.amount)}</span>, sortable: true, className: "text-right" },
];

export function FinanceReportsPage() {
  const { fiscalYears, getTrialBalance, getBalanceSheet, getIncomeStatement } = useFinance();
  const { logChange } = useChangelog();
  const [selectedReport, setSelectedReport] = useState<string>("trial-balance");
  const [selectedFyId, setSelectedFyId] = useState<string>(() => {
    const current = fiscalYears.find(fy => fy.isCurrent);
    return current?.id ?? fiscalYears[0]?.id ?? "";
  });

  const selectedFy = fiscalYears.find(fy => fy.id === selectedFyId);
  const tb = getTrialBalance(selectedFyId);
  const balanceSheet = getBalanceSheet(selectedFyId);
  const incomeStatement = getIncomeStatement(selectedFyId);

  const totalDebits = tb.reduce((s, r) => s + r.debit, 0);
  const totalCredits = tb.reduce((s, r) => s + r.credit, 0);

  const [reportData, setReportData] = useState<Record<string, ReportRow[]>>({});

  useEffect(() => {
    const fy = fiscalYears.find((f) => f.id === selectedFyId);
    const qs = fy
      ? `?from=${encodeURIComponent(fy.startDate)}&to=${encodeURIComponent(fy.endDate)}`
      : "";
    apiFetch<Record<string, ApiReportRow[]>>(`/finance-reports${qs}`)
      .then((data) => {
        const mapped: Record<string, ReportRow[]> = {};
        for (const [key, rows] of Object.entries(data ?? {})) {
          if (Array.isArray(rows)) mapped[key] = rows.map(toDisplayRow);
        }
        setReportData(mapped);
      })
      .catch(() => setReportData({}));
  }, [selectedFyId, fiscalYears]);

  useEffect(() => {
    logChange({
      module: "Finance",
      action: "Generated Report",
      entityType: "Report",
      entityId: selectedReport,
      summary: `Generated ${active.type} for ${selectedFy?.label ?? "All years"}`,
      performedBy: "current-user",
    });
  }, [selectedReport, selectedFyId]);

  const bsRows = useMemo<BSRow[]>(() => {
    const rows: BSRow[] = [];
    for (const section of balanceSheet) {
      rows.push({ section: section.section, account: section.section, amount: section.total, isSection: true });
      for (const item of section.items) {
        rows.push({ section: section.section, account: item.account, amount: item.amount, isSection: false });
      }
    }
    return rows;
  }, [balanceSheet]);

  function handleExport() {
    const rows: string[][] = [];
    if (selectedReport === "trial-balance") {
      rows.push(["Account Code", "Account Name", "Type", "Debit", "Credit"]);
      tb.forEach(r => rows.push([r.code, r.accountName, r.type, fmt(r.debit), fmt(r.credit)]));
      rows.push(["", "", "Total", fmt(totalDebits), fmt(totalCredits)]);
    } else if (selectedReport === "balance-sheet") {
      rows.push(["Section", "Account", "Amount"]);
      balanceSheet.forEach(s => {
        rows.push([s.section, "", fmt(s.total)]);
        s.items.forEach(i => rows.push(["", i.account, fmt(i.amount)]));
      });
    } else if (selectedReport === "income-statement") {
      rows.push(["Item", "Amount"]);
      incomeStatement.forEach(r => rows.push([r.label, r.isSection ? "" : fmt(r.amount)]));
    }
    exportCSV(`finance-report-${selectedReport}-${selectedFy?.label ?? "all"}`, rows[0] ?? [], rows.slice(1));
  }

  function exportTB() {
    const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit"];
    const rows = tb.map(r => [r.code, r.accountName, r.type, fmt(r.debit), fmt(r.credit)]);
    rows.push(["", "", "Total", fmt(totalDebits), fmt(totalCredits)]);
    exportCSV(`trial-balance-${selectedFy?.label ?? "all"}`, headers, rows);
  }

  function exportBS() {
    const headers = ["Section", "Account", "Amount"];
    const rows: string[][] = [];
    balanceSheet.forEach(s => {
      rows.push([s.section, "", fmt(s.total)]);
      s.items.forEach(i => rows.push(["", i.account, fmt(i.amount)]));
    });
    exportCSV(`balance-sheet-${selectedFy?.label ?? "all"}`, headers, rows);
  }

  function exportIS() {
    const headers = ["Item", "Amount"];
    const rows = incomeStatement.map(r => [r.label, r.isSection ? "" : fmt(r.amount)]);
    exportCSV(`income-statement-${selectedFy?.label ?? "all"}`, headers, rows);
  }

  function exportCF() {
    const headers = ["Metric", "Value"];
    const rows = cashflowRows.map(r => [r.label, r.value]);
    exportCSV("cash-flow", headers, rows);
  }

  function exportBudget() {
    const headers = ["Project", "Utilisation", "Details"];
    const rows = budgetRows.map(r => [r.label, r.value, r.sub ?? ""]);
    exportCSV("budget-vs-actual", headers, rows);
  }

  const active = templates.find((t) => t.id === selectedReport) ?? templates[0];
  const cashflowRows = reportData["cashflow"] ?? [];
  const budgetRows = reportData["budget"] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and export financial reports — computed from posted transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedFyId} onChange={(e) => setSelectedFyId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {fiscalYears.map(fy => (
              <option key={fy.id} value={fy.id}>{fy.label} ({fy.startDate} — {fy.endDate})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report templates */}
      <div className="grid grid-cols-5 gap-3">
        {templates.map((t) => (
          <button key={t.id} onClick={() => setSelectedReport(t.id)}
            className={`p-4 rounded-xl border text-left transition-all ${selectedReport === t.id ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
            <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center mb-3 ${t.color}`}>{t.icon}</div>
            <p className="text-xs font-semibold text-gray-900">{t.type}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {t.description}
            </p>
          </button>
        ))}
      </div>

      {/* Report preview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${active.bg} flex items-center justify-center ${active.color}`}>{active.icon}</div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{active.type}</h2>
              <p className="text-xs text-gray-500">Period: {selectedFy?.label ?? "All years"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedReport === "trial-balance" && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trial Balance — {selectedFy?.label}</p>
              </div>
              <DataTable
                columns={tbColumns}
                data={tb}
                keyExtractor={r => r.code}
                searchFields={[r => r.accountName, r => r.code, r => r.type]}
                headerExtra={
                  <button onClick={exportTB} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                }
              />
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className={`text-xs font-semibold ${Math.abs(totalDebits - totalCredits) < 0.01 ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.abs(totalDebits - totalCredits) < 0.01 ? "✓ Trial Balance is balanced" : "✗ Trial Balance is NOT balanced"}
                </span>
                <span className="text-xs font-semibold text-gray-500">Total Debits: {fmt(totalDebits)} / Total Credits: {fmt(totalCredits)}</span>
              </div>
            </div>
          )}

          {selectedReport === "balance-sheet" && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance Sheet — {selectedFy?.label}</p>
              </div>
              <DataTable
                columns={bsColumns}
                data={bsRows}
                keyExtractor={r => `${r.section}-${r.account}`}
                searchFields={[r => r.account]}
                headerExtra={
                  <button onClick={exportBS} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                }
              />
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Assets = Liabilities + Equity</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {fmt(balanceSheet[0]?.total ?? 0)} = {fmt((balanceSheet[1]?.total ?? 0) + (balanceSheet[2]?.total ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedReport === "income-statement" && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Income Statement — {selectedFy?.label}</p>
              </div>
              <DataTable
                columns={isColumns}
                data={incomeStatement}
                keyExtractor={r => `is-${r.label}`}
                searchFields={[r => r.label]}
                headerExtra={
                  <button onClick={exportIS} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                }
              />
            </div>
          )}

          {selectedReport === "cashflow" && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-3"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash Flow Statement</p></div>
              <DataTable
                columns={cfColumns}
                data={cashflowRows}
                keyExtractor={r => `cf-${r.label}`}
                searchFields={[r => r.label]}
                headerExtra={
                  <button onClick={exportCF} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                }
              />
            </div>
          )}

          {selectedReport === "budget" && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-3"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget vs Actual</p></div>
              <DataTable
                columns={budgetColumns}
                data={budgetRows}
                keyExtractor={r => `budget-${r.label}`}
                searchFields={[r => r.label]}
                headerExtra={
                  <button onClick={exportBudget} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                }
              />
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500">
              <strong>Generated:</strong>{" "}
              {formatDateByGeneralSettings(new Date())} ·{" "}
              <strong>Source:</strong> BuildOS Finance Module ·{" "}
              <strong>Period:</strong> {selectedFy?.label ?? "All years"} · All figures in NGN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
