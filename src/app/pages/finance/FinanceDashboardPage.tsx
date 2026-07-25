import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CreditCard, ArrowUpRight, ArrowDownRight, BarChart3, Receipt } from "lucide-react";
import { NavLink } from "react-router";
import { DataTable, type Column } from "../../components/DataTable";

export function FinanceDashboardPage() {
  const metrics = [
    { label: "Total Income", value: "$4.2M", delta: "+14% this month", positive: true, icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: "Total Expenses", value: "$2.8M", delta: "+8% this month", positive: false, icon: TrendingDown, iconBg: "bg-red-100", iconColor: "text-red-600" },
    { label: "Net Position", value: "$1.4M", delta: "33% margin", positive: true, icon: DollarSign, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { label: "Pending Approvals", value: "18", delta: "Requires action", positive: null, icon: AlertCircle, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  ];

  const recentTransactions = [
    { id: "TXN-0041", type: "Expense", description: "Contractor Payment — Lekki Tower A", amount: -245000, date: "Apr 13, 2026", status: "Completed" },
    { id: "TXN-0040", type: "Income", description: "Client Milestone — Phase 2", amount: 850000, date: "Apr 12, 2026", status: "Completed" },
    { id: "TXN-0039", type: "Payroll", description: "April 2026 Payroll Run", amount: -620000, date: "Apr 10, 2026", status: "Completed" },
    { id: "TXN-0038", type: "Expense", description: "Materials — Cement & Steel", amount: -88400, date: "Apr 9, 2026", status: "Completed" },
    { id: "TXN-0037", type: "Income", description: "Subcontractor Recovery", amount: 42000, date: "Apr 8, 2026", status: "Completed" },
  ];

  const budgetSummary = [
    { project: "Lekki Tower A", budget: 12500000, spent: 8125000 },
    { project: "Riverside Residential", budget: 8200000, spent: 3444000 },
    { project: "Mall Renovation", budget: 18400000, spent: 19320000 },
    { project: "Industrial Warehouse", budget: 5800000, spent: 870000 },
  ];

  const pendingApprovals = [
    { id: "FA-018", type: "Expense Claim", title: "Q1 Marketing Campaign", requestedBy: "Olivia James", amount: 145000, urgency: "urgent" },
    { id: "FA-017", type: "Budget Override", title: "Data Centre Upgrade", requestedBy: "Marcus Webb", amount: 680000, urgency: "urgent" },
    { id: "FA-016", type: "Payment Request", title: "Contractor Milestone 3", requestedBy: "Finance Controller", amount: 2400000, urgency: "normal" },
  ];

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(Math.abs(n));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Finance Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Financial control center — live overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">{m.label}</p>
              <div className={`w-8 h-8 rounded-lg ${m.iconBg} flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 ${m.iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{m.value}</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${m.positive === true ? "text-emerald-600" : m.positive === false ? "text-red-500" : "text-gray-400"}`}>
              {m.positive === true && <ArrowUpRight className="w-3 h-3" />}
              {m.positive === false && <ArrowDownRight className="w-3 h-3" />}
              {m.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Budget vs Actual */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Budget vs Actual</h2>
            <NavLink to="/apps/finance/budget" className="text-xs text-emerald-600 hover:underline">View all</NavLink>
          </div>
          <div className="space-y-4">
            {budgetSummary.map((b) => {
              const pct = Math.min(Math.round((b.spent / b.budget) * 100), 100);
              const over = b.spent > b.budget;
              const warn = pct >= 85 && !over;
              return (
                <div key={b.project}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate flex-1 mr-2">{b.project}</span>
                    <span className={`text-xs font-semibold ${over ? "text-red-600" : warn ? "text-amber-600" : "text-emerald-600"}`}>
                      {Math.round((b.spent / b.budget) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${over ? "bg-red-500" : warn ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(b.spent)} of {fmt(b.budget)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Pending Approvals</h2>
            <NavLink to="/apps/finance/approvals" className="text-xs text-emerald-600 hover:underline">View all</NavLink>
          </div>
          <div className="space-y-3">
            {pendingApprovals.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    {a.urgency === "urgent" && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">Urgent</span>
                    )}
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{a.type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.requestedBy}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{fmt(a.amount)}</p>
                  <NavLink to="/apps/finance/approvals" className="text-xs text-emerald-600 hover:underline mt-0.5 block">Review →</NavLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
          <NavLink to="/apps/finance/ledger" className="text-xs text-emerald-600 hover:underline">View ledger</NavLink>
        </div>
        <DataTable columns={[
          { key: "id", label: "ID", render: t => <span className="font-mono text-xs text-gray-500">{t.id}</span>, sortable: true, filterable: true },
          { key: "description", label: "Description", render: t => <span className="text-sm text-gray-900">{t.description}</span>, sortable: true, filterable: true, minWidth: 200 },
          { key: "type", label: "Type", render: t => {
            const colors: Record<string, string> = { Income: "bg-emerald-100 text-emerald-700", Payroll: "bg-purple-100 text-purple-700" };
            return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[t.type] ?? "bg-red-100 text-red-700"}`}>{t.type}</span>;
          }, sortable: true, filterable: true },
          { key: "date", label: "Date", render: t => <span className="text-sm text-gray-500">{t.date}</span>, sortable: true, filterable: false },
          { key: "amount", label: "Amount ($)", render: t => (
            <span className={`text-sm font-semibold ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>{t.amount > 0 ? "+" : "−"}{fmt(t.amount)}</span>
          ), sortable: true, filterable: false, className: "text-right", headerClassName: "text-right" },
        ]} data={recentTransactions} keyExtractor={t => t.id}
          searchPlaceholder="Search..."
          searchFields={[t => t.id, t => t.description, t => t.type]}
          emptyMessage="No recent transactions" pageSize={5} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Add Expense", icon: Receipt, href: "/apps/finance/expenses", color: "text-red-600 bg-red-50" },
          { label: "Record Income", icon: TrendingUp, href: "/apps/finance/income", color: "text-emerald-600 bg-emerald-50" },
          { label: "Process Payment", icon: CreditCard, href: "/apps/finance/payments", color: "text-blue-600 bg-blue-50" },
          { label: "View Reports", icon: BarChart3, href: "/apps/finance/reports", color: "text-purple-600 bg-purple-50" },
        ].map((action) => (
          <NavLink
            key={action.label}
            to={action.href}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-sm transition-all group"
          >
            <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center shrink-0`}>
              <action.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
