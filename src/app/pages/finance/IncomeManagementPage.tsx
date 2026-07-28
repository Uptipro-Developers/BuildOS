import { useState, useEffect } from "react";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { fetchIncome, createIncome } from "../../api/income";
import { fetchProjects } from "../../api/projects";
import { getChartAccounts } from "../../api/finance-extras";
import { Plus, Download, TrendingUp, CheckCircle, Clock, X, Save } from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";

type IncomeStatus = "Draft" | "Confirmed" | "Invoiced" | "Received";

interface Income {
  id: string;
  source: string;
  project: string;
  amount: number;
  description: string;
  date: string;
  status: IncomeStatus;
  receivedBy?: string;
}

const statusConfig: Record<IncomeStatus, { badge: string }> = {
  Draft: { badge: "bg-gray-100 text-gray-600" },
  Confirmed: { badge: "bg-blue-100 text-blue-700" },
  Invoiced: { badge: "bg-amber-100 text-amber-700" },
  Received: { badge: "bg-emerald-100 text-emerald-700" },
};

const STATUS_OPTS: Array<IncomeStatus | "All"> = [
  "All",
  "Draft",
  "Confirmed",
  "Invoiced",
  "Received",
];

const emptyForm = {
  source: "",
  project: "",
  amount: "",
  description: "",
  date: "",
};

export function IncomeManagementPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);
  useEffect(() => {
    Promise.all([fetchIncome(), fetchProjects(), getChartAccounts("Income")])
      .then(([incomeData, projects, accounts]) => {
        setIncomes(incomeData);
        setProjectNames(projects.map((p) => p.name));
        setSourceOptions(
          Array.from(
            new Set([
              ...incomeData.map((i) => i.source).filter(Boolean),
              ...accounts.map((a) => a.name).filter(Boolean),
            ]),
          ),
        );
      })
      .catch(console.error);
  }, []);
  const [statusFilter, setStatusFilter] = useState<IncomeStatus | "All">("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { logChange } = useChangelog();

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  const filtered = incomes.filter((i) => {
    if (statusFilter !== "All" && i.status !== statusFilter) return false;
    return true;
  });

  function addIncome() {
    if (!form.source || !form.amount || !form.description || !form.date) return;
    createIncome({
      source: form.source,
      project: form.project || "General",
      amount: parseFloat(form.amount.replace(/,/g, "")),
      description: form.description,
      date: form.date,
      status: "Draft",
    })
      .then((created: any) => {
        logChange({ module: "Finance", action: "Created", entityType: "Income", entityId: created?.id ?? "", summary: `Income ${created?.id ?? ""} created — ${form.description}`, performedBy: "Current User" });
        fetchIncome().then(setIncomes).catch(console.error);
        setShowAddModal(false);
        setForm(emptyForm);
      })
      .catch((err) => {
        alert("Failed to create income. Please try again.");
        console.error(err);
      });
  }

  function advance(id: string) {
    setIncomes((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const next: IncomeStatus = i.status === "Draft" ? "Confirmed" : i.status === "Confirmed" ? "Invoiced" : i.status === "Invoiced" ? "Received" : i.status;
      logChange({ module: "Finance", action: "Advanced", entityType: "Income", entityId: id, summary: `Income ${id} advanced to ${next}`, performedBy: "Current User" });
      return { ...i, status: next };
    }));
  }

  function handleExport() {
    exportCSV(
      "income",
      ["Income ID", "Source", "Project", "Amount", "Date", "Status"],
      incomes.map((i) => [
        i.id,
        i.source,
        i.project,
        fmt(i.amount),
        i.date,
        i.status,
      ]),
    );
  }

  const totalReceived = incomes
    .filter((i) => i.status === "Received")
    .reduce((s, i) => s + i.amount, 0);
  const totalPending = incomes
    .filter((i) => i.status !== "Received")
    .reduce((s, i) => s + i.amount, 0);
  const total = incomes.reduce((s, i) => s + i.amount, 0);

  const columns: Column<Income>[] = [
    {
      key: "id",
      label: "Income ID",
      sortable: true,
      filterable: true,
      render: (i) => <span className="font-mono text-xs">{i.id}</span>,
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      filterable: true,
      render: (i) => <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{i.source}</span>,
    },
    {
      key: "project",
      label: "Project",
      sortable: true,
      filterable: true,
      render: (i) => <span className="text-sm text-gray-700">{i.project}</span>,
    },
    {
      key: "description",
      label: "Description",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (i) => <span className="text-sm text-gray-600 max-w-xs truncate">{i.description}</span>,
    },
    {
      key: "amount",
      label: "Amount ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (i) => <span className="text-sm font-semibold text-emerald-700">{fmt(i.amount)}</span>,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (i) => <span className="text-sm text-gray-500">{i.date}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (i) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[i.status].badge}`}>{i.status}</span>,
    },
    {
      key: "action",
      label: "Action",
      sortable: false,
      filterable: false,
      render: (i) =>
        i.status !== "Received" ? (
          <button onClick={() => advance(i.id)} className="text-xs text-emerald-600 hover:underline">
            {i.status === "Draft" ? "Confirm →" : i.status === "Confirmed" ? "Invoice →" : "Mark Received →"}
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Income Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage all income sources
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Income
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">Total Income</p>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(total)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {incomes.length} transactions
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">Received</p>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {fmt(totalReceived)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {incomes.filter((i) => i.status === "Received").length} confirmed
            payments
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">In Pipeline</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {fmt(totalPending)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Awaiting receipt</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${statusFilter === s ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} keyExtractor={i => i.id}
        searchPlaceholder="Search income..."
        searchFields={[i => i.id, i => i.description, i => i.source]}
        emptyMessage="No income records found"
        headerExtra={<button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"><Download className="w-3.5 h-3.5" /> Export</button>}
      />

      {/* Add Income Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Record Income
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Source *
                </label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select source</option>
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Project
                </label>
                <select
                  value={form.project}
                  onChange={(e) =>
                    setForm({ ...form, project: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select project</option>
                  {projectNames.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Amount (USD) *
                  </label>
                  <input
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe this income..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addIncome}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
