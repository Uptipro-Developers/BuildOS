import { useState, useEffect } from "react";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  fetchExpenses,
  approveExpense,
  rejectExpense,
} from "../../api/expenses";
import { fetchProjects } from "../../api/projects";
import { getChartAccounts } from "../../api/finance-extras";
import {
  Plus,
  Download,
  Receipt,
  X,
  Save,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Wallet,
  Upload,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { useNumbering } from "../../stores/numberingStore";

type ExpenseStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Sent to Finance"
  | "Paid";

interface Expense {
  id: string;
  project: string;
  category: string;
  amount: number;
  description: string;
  createdBy: string;
  date: string;
  status: ExpenseStatus;
  receipt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

const statusConfig: Record<
  ExpenseStatus,
  { badge: string; icon: React.ReactNode }
> = {
  Draft: {
    badge: "bg-gray-100 text-gray-600",
    icon: <Clock className="w-3 h-3" />,
  },
  Submitted: {
    badge: "bg-blue-100 text-blue-700",
    icon: <Send className="w-3 h-3" />,
  },
  Approved: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  Rejected: {
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3 h-3" />,
  },
  "Sent to Finance": {
    badge: "bg-purple-100 text-purple-700",
    icon: <Send className="w-3 h-3" />,
  },
  Paid: {
    badge: "bg-teal-100 text-teal-700",
    icon: <Wallet className="w-3 h-3" />,
  },
};

const STATUS_OPTIONS: Array<ExpenseStatus | "All"> = [
  "All",
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "Sent to Finance",
  "Paid",
];

const emptyForm = {
  project: "",
  category: "",
  amount: "",
  description: "",
  receipt: "",
};

export function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  function toExpense(e: any): Expense {
    const status: ExpenseStatus =
      e.status === "Draft" ||
      e.status === "Submitted" ||
      e.status === "Approved" ||
      e.status === "Rejected" ||
      e.status === "Sent to Finance" ||
      e.status === "Paid"
        ? e.status
        : "Draft";
    return {
      id: e.id,
      project: e.project ?? "",
      category: e.category ?? "",
      amount: Number(e.amount ?? 0),
      description: e.description ?? "",
      createdBy: e.createdBy ?? "",
      date: e.date ?? "",
      status,
      receipt: e.receipt,
      approvedBy: e.approvedBy,
      approvedAt: e.approvedAt,
      rejectedBy: e.rejectedBy,
      rejectedAt: e.rejectedAt,
      rejectionReason: e.rejectionReason,
    };
  }

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchProjects(), getChartAccounts("Expense")])
      .then(([expenseData, projects, accounts]) => {
        const mappedExpenses = expenseData.map(toExpense);
        setExpenses(mappedExpenses);
        setProjectNames(projects.map((p) => p.name));
        setCategoryOptions(
          Array.from(
            new Set([
              ...mappedExpenses.map((e) => e.category).filter(Boolean),
              ...accounts.map((a) => a.name).filter(Boolean),
            ]),
          ),
        );
      })
      .catch(console.error);
  }, []);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "All">(
    "All",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [rejectState, setRejectState] = useState<{
    id: string;
    reason: string;
  } | null>(null);

  const { logChange } = useChangelog();
  const { getNextId } = useNumbering();

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  const filtered = statusFilter !== "All"
    ? expenses.filter((e) => e.status === statusFilter)
    : expenses;

  const columns: Column<Expense>[] = [
    {
      key: "id",
      label: "Expense ID",
      render: (e) => <span className="text-xs font-mono text-gray-500">{e.id}</span>,
      sortable: true,
      filterable: false,
      minWidth: 100,
    },
    {
      key: "project",
      label: "Project",
      render: (e) => <span className="text-sm text-gray-900">{e.project}</span>,
      sortable: true,
      filterable: true,
    },
    {
      key: "category",
      label: "Category",
      render: (e) => <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{e.category}</span>,
      sortable: true,
      filterable: true,
    },
    {
      key: "description",
      label: "Description",
      render: (e) => <span className="text-sm text-gray-600 max-w-xs truncate block">{e.description}</span>,
      sortable: true,
      filterable: true,
      minWidth: 200,
    },
    {
      key: "amount",
      label: "Amount ($)",
      render: (e) => <span className="text-sm font-semibold text-gray-900">{fmt(e.amount)}</span>,
      sortable: true,
      filterable: false,
    },
    {
      key: "status",
      label: "Status",
      render: (e) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[e.status].badge}`}>
          {statusConfig[e.status].icon}{e.status}
        </span>
      ),
      sortable: true,
      filterable: true,
    },
    {
      key: "createdBy",
      label: "Created By",
      render: (e) => <span className="text-sm text-gray-600">{e.createdBy}</span>,
      sortable: true,
      filterable: true,
    },
    {
      key: "date",
      label: "Date",
      render: (e) => <span className="text-sm text-gray-500">{e.date}</span>,
      sortable: true,
      filterable: false,
    },
    {
      key: "actions",
      label: "Actions",
      render: (e) => (
        <button onClick={() => setViewExpense(e)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 ml-auto">
          <Eye className="w-3.5 h-3.5" /> View
        </button>
      ),
      sortable: false,
      filterable: false,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  function addExpense() {
    if (!form.project || !form.amount || !form.description) return;
    const newExp: Expense = {
      id: getNextId("Expense"),
      project: form.project,
      category: form.category || "Other",
      amount: parseFloat(form.amount.replace(/,/g, "")),
      description: form.description,
      createdBy: getAuthUserName() || "Current User",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Draft",
    };
    setExpenses([newExp, ...expenses]);
    logChange({ module: "Finance", action: "Created", entityType: "Expense", entityId: newExp.id, summary: `Expense ${newExp.id} created — ${newExp.description}`, performedBy: "Current User" });
    setShowAddModal(false);
    setForm(emptyForm);
  }

  function approve(id: string) {
    approveExpense(id)
      .then(() => {
        logChange({ module: "Finance", action: "Approved", entityType: "Expense", entityId: id, summary: `Expense ${id} approved`, performedBy: "Current User" });
        fetchExpenses()
          .then((items) => setExpenses(items.map(toExpense)))
          .catch(console.error);
      })
      .catch((err) => {
        alert("Failed to approve expense. Please try again.");
        console.error(err);
      });
    setViewExpense(null);
  }

  function submitReject() {
    if (!rejectState || !rejectState.reason.trim()) return;
    rejectExpense(rejectState.id, rejectState.reason)
      .then(() => {
        logChange({ module: "Finance", action: "Rejected", entityType: "Expense", entityId: rejectState.id, summary: `Expense ${rejectState.id} rejected`, performedBy: "Current User" });
        fetchExpenses()
          .then((items) => setExpenses(items.map(toExpense)))
          .catch(console.error);
      })
      .catch((err) => {
        alert("Failed to reject expense. Please try again.");
        console.error(err);
      });
    setRejectState(null);
    setViewExpense(null);
  }

  function sendToFinance(id: string) {
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "Sent to Finance" } : e));
    logChange({ module: "Finance", action: "Sent to Finance", entityType: "Expense", entityId: id, summary: `Expense ${id} sent to finance`, performedBy: "Current User" });
    setViewExpense(null);
  }

  function markPaid(id: string) {
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "Paid" } : e));
    logChange({ module: "Finance", action: "Paid", entityType: "Expense", entityId: id, summary: `Expense ${id} marked as paid`, performedBy: "Current User" });
    setViewExpense(null);
  }

  function handleExport() {
    exportCSV(
      "expenses",
      [
        "Expense ID",
        "Project",
        "Category",
        "Amount",
        "Status",
        "Created By",
        "Date",
      ],
      expenses.map((e) => [
        e.id,
        e.project,
        e.category,
        fmt(e.amount),
        e.status,
        e.createdBy,
        e.date,
      ]),
    );
  }

  const counts = {
    total: expenses.length,
    pending: expenses.filter((e) => e.status === "Submitted").length,
    approved: expenses.filter(
      (e) => e.status === "Approved" || e.status === "Paid",
    ).length,
    totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Expense Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track, submit, and approve all project expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {counts.total}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {fmt(counts.totalAmount)} total value
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Awaiting Approval</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {counts.pending}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Submitted expenses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Approved & Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {counts.approved}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Completed this month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {expenses.filter((e) => e.status === "Rejected").length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Require resubmission</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
          {STATUS_OPTIONS.map((s) => (
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(e) => e.id}
        searchPlaceholder="Search expenses..."
        searchFields={[(e) => e.id, (e) => e.description, (e) => e.project]}
        emptyMessage="No expenses found"
        headerExtra={
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Add Expense
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Project *
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Expense Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Amount (USD) *
                </label>
                <input
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                  placeholder="Describe the expense in detail..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Receipt Upload
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, PNG, JPG up to 10MB
                  </p>
                </div>
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
                onClick={addExpense}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800"
              >
                <Save className="w-3.5 h-3.5" /> Save as Draft
              </button>
              <button
                onClick={addExpense}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Send className="w-3.5 h-3.5" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {viewExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-gray-500">
                    {viewExpense.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[viewExpense.status].badge}`}
                  >
                    {statusConfig[viewExpense.status].icon}
                    {viewExpense.status}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {viewExpense.description}
                </h2>
              </div>
              <button
                onClick={() => setViewExpense(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {viewExpense.project}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {viewExpense.category}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    {fmt(viewExpense.amount)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {viewExpense.date}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {viewExpense.createdBy}
                </p>
              </div>
              {viewExpense.approvedBy && (
                <div className="bg-emerald-50 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">
                      Approved by {viewExpense.approvedBy}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {viewExpense.approvedAt}
                    </p>
                  </div>
                </div>
              )}
              {viewExpense.rejectedBy && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700">
                    Rejected by {viewExpense.rejectedBy} ·{" "}
                    {viewExpense.rejectedAt}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {viewExpense.rejectionReason}
                  </p>
                </div>
              )}
              {rejectState?.id === viewExpense.id && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectState.reason}
                    onChange={(e) =>
                      setRejectState({ ...rejectState, reason: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    placeholder="State the reason for rejection..."
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              {viewExpense.status === "Submitted" && !rejectState && (
                <>
                  <button
                    onClick={() =>
                      setRejectState({ id: viewExpense.id, reason: "" })
                    }
                    className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve(viewExpense.id)}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </>
              )}
              {rejectState?.id === viewExpense.id && (
                <>
                  <button
                    onClick={() => setRejectState(null)}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReject}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirm Rejection
                  </button>
                </>
              )}
              {viewExpense.status === "Approved" && (
                <button
                  onClick={() => sendToFinance(viewExpense.id)}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Send to Finance
                </button>
              )}
              {viewExpense.status === "Sent to Finance" && (
                <button
                  onClick={() => markPaid(viewExpense.id)}
                  className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Mark as Paid
                </button>
              )}
              {!["Submitted", "Approved", "Sent to Finance"].includes(
                viewExpense.status,
              ) &&
                !rejectState && (
                  <button
                    onClick={() => setViewExpense(null)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
