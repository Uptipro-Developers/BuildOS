import { useState, useEffect } from "react";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import { fetchPayments } from "../../api/payments";
import { Download, CreditCard, Clock, CheckCircle, XCircle, Send, Eye, X } from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";

type PaymentType = "Expense" | "Payroll" | "Vendor" | "Contractor";
type PaymentStatus =
  | "Approved Request"
  | "Sent to Finance"
  | "Payment Initiated"
  | "Payment Completed"
  | "Failed";

interface Payment {
  id: string;
  type: PaymentType;
  reference: string;
  recipient: string;
  amount: number;
  method: string;
  bank?: string;
  date: string;
  status: PaymentStatus;
  initiatedBy?: string;
  completedAt?: string;
  note?: string;
}

const statusConfig: Record<
  PaymentStatus,
  { badge: string; icon: React.ReactNode; step: number }
> = {
  "Approved Request": {
    badge: "bg-blue-100 text-blue-700",
    icon: <Clock className="w-3 h-3" />,
    step: 1,
  },
  "Sent to Finance": {
    badge: "bg-purple-100 text-purple-700",
    icon: <Send className="w-3 h-3" />,
    step: 2,
  },
  "Payment Initiated": {
    badge: "bg-amber-100 text-amber-700",
    icon: <CreditCard className="w-3 h-3" />,
    step: 3,
  },
  "Payment Completed": {
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3 h-3" />,
    step: 4,
  },
  Failed: {
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3 h-3" />,
    step: 0,
  },
};

const typeColors: Record<PaymentType, string> = {
  Expense: "bg-orange-100 text-orange-700",
  Payroll: "bg-purple-100 text-purple-700",
  Vendor: "bg-blue-100 text-blue-700",
  Contractor: "bg-teal-100 text-teal-700",
};

const PAYMENT_FLOW: PaymentStatus[] = [
  "Approved Request",
  "Sent to Finance",
  "Payment Initiated",
  "Payment Completed",
];
const TYPE_OPTS: Array<PaymentType | "All"> = [
  "All",
  "Expense",
  "Payroll",
  "Vendor",
  "Contractor",
];
const STATUS_OPTS: Array<PaymentStatus | "All"> = [
  "All",
  "Approved Request",
  "Sent to Finance",
  "Payment Initiated",
  "Payment Completed",
  "Failed",
];

export function PaymentManagementPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  function toPayment(p: any): Payment {
    const status: PaymentStatus =
      p.status === "Approved Request" ||
      p.status === "Sent to Finance" ||
      p.status === "Payment Initiated" ||
      p.status === "Payment Completed" ||
      p.status === "Failed"
        ? p.status
        : "Approved Request";
    const type: PaymentType =
      p.type === "Expense" ||
      p.type === "Payroll" ||
      p.type === "Vendor" ||
      p.type === "Contractor"
        ? p.type
        : "Expense";
    return {
      id: p.id,
      type,
      reference: p.reference ?? "",
      recipient: p.recipient ?? "",
      amount: Number(p.amount ?? 0),
      method: p.method ?? "",
      bank: p.bank ?? "",
      date: p.date ?? "",
      status,
      initiatedBy: p.initiatedBy ?? "",
      completedAt: p.completedAt,
      note: p.note,
    };
  }

  useEffect(() => {
    fetchPayments().then((items) => setPayments(items.map(toPayment)));
  }, []);
  const [typeFilter, setTypeFilter] = useState<PaymentType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "All">(
    "All",
  );
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const { logChange } = useChangelog();

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  const filtered = payments.filter((p) => {
    if (typeFilter !== "All" && p.type !== typeFilter) return false;
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    return true;
  });

  function advancePayment(id: string) {
    const payment = payments.find(p => p.id === id);
    if (!payment) return;
    const idx = PAYMENT_FLOW.indexOf(payment.status);
    if (idx < 0 || idx >= PAYMENT_FLOW.length - 1) return;
    const next = PAYMENT_FLOW[idx + 1];

    setPayments((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        status: next,
        initiatedBy: next === "Payment Initiated" ? (getAuthUserName() || "Current User") : p.initiatedBy,
        completedAt: next === "Payment Completed"
          ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : p.completedAt,
      };
    }));

    logChange({
      module: "Finance",
      action: next,
      entityType: "Payment",
      entityId: id,
      summary: `Payment ${id} advanced to ${next}`,
      performedBy: "Current User",
    });

    setViewPayment(null);
  }

  function handleExport() {
    exportCSV(
      "payments",
      [
        "Payment ID",
        "Type",
        "Reference",
        "Recipient",
        "Amount",
        "Method",
        "Date",
        "Status",
      ],
      payments.map((p) => [
        p.id,
        p.type,
        p.reference,
        p.recipient,
        fmt(p.amount),
        p.method,
        p.date,
        p.status,
      ]),
    );
  }

  const totalCompleted = payments
    .filter((p) => p.status === "Payment Completed")
    .reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(
    (p) => !["Payment Completed", "Failed"].includes(p.status),
  ).length;

  const columns: Column<Payment>[] = [
    {
      key: "id",
      label: "Payment ID",
      sortable: true,
      filterable: true,
      render: (p) => <span className="font-mono text-xs text-gray-500">{p.id}</span>,
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      filterable: true,
      render: (p) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeColors[p.type]}`}>{p.type}</span>
      ),
    },
    {
      key: "recipient",
      label: "Payee",
      sortable: true,
      filterable: true,
      render: (p) => <span className="text-sm text-gray-900">{p.recipient}</span>,
    },
    {
      key: "reference",
      label: "Description",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (p) => <span className="text-xs font-mono text-gray-500">{p.reference}</span>,
    },
    {
      key: "amount",
      label: "Amount ($)",
      sortable: true,
      filterable: false,
      className: "text-right",
      headerClassName: "text-right",
      render: (p) => <span className="text-sm font-semibold text-gray-900">{fmt(p.amount)}</span>,
    },
    {
      key: "method",
      label: "Method",
      sortable: true,
      filterable: true,
      render: (p) => <span className="text-sm text-gray-600">{p.method}</span>,
    },
    {
      key: "bank",
      label: "Bank",
      sortable: true,
      filterable: true,
      render: (p) => (
        <span className={`text-sm ${p.bank ? "text-gray-600" : "text-gray-400 italic"}`}>
          {p.bank ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (p) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[p.status].badge}`}>
          {statusConfig[p.status].icon}{p.status}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      filterable: false,
      render: (p) => <span className="text-sm text-gray-500">{p.date}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      className: "text-right",
      headerClassName: "text-right",
      render: (p) => (
        <button onClick={() => setViewPayment(p)} className="text-emerald-600 hover:text-emerald-700">
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Payment Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Process and track all outgoing payments
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {fmt(totalCompleted)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pending}</p>
          <p className="text-xs text-gray-400 mt-0.5">Awaiting processing</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {payments.filter((p) => p.status === "Failed").length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Require attention</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">
            Total Transactions
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {payments.length}
          </p>
        </div>
      </div>

      {/* Payment Flow Banner */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">
          Payment Workflow
        </p>
        <div className="flex items-center gap-2">
          {PAYMENT_FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${statusConfig[step].badge}`}
              >
                {statusConfig[step].icon}
                <span>{step}</span>
              </div>
              {i < PAYMENT_FLOW.length - 1 && (
                <div className="shrink-0 text-gray-300 text-xs">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {TYPE_OPTS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${typeFilter === t ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PaymentStatus | "All")
          }
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(p) => p.id}
        searchPlaceholder="Search payments..."
        searchFields={[(p) => p.id, (p) => p.recipient, (p) => p.reference]}
        headerExtra={
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />

      {/* View/Process Modal */}
      {viewPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-gray-500">
                    {viewPayment.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[viewPayment.status].badge}`}
                  >
                    {statusConfig[viewPayment.status].icon}
                    {viewPayment.status}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {viewPayment.recipient}
                </h2>
              </div>
              <button
                onClick={() => setViewPayment(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium mt-0.5">
                    {viewPayment.type}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Reference</p>
                  <p className="text-sm font-mono text-gray-700 mt-0.5">
                    {viewPayment.reference}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">
                    {fmt(viewPayment.amount)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm font-medium mt-0.5">
                    {viewPayment.method}
                  </p>
                </div>
                {viewPayment.bank && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Bank</p>
                    <p className="text-sm font-medium mt-0.5">
                      {viewPayment.bank}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium mt-0.5">
                    {viewPayment.date}
                  </p>
                </div>
              </div>
              {viewPayment.completedAt && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">
                    Payment completed on {viewPayment.completedAt}
                  </p>
                </div>
              )}
              {viewPayment.note && (
                <div className="flex items-center gap-2 bg-red-50 rounded-lg p-3">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-red-700">{viewPayment.note}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              {viewPayment.status === "Approved Request" && (
                <button
                  onClick={() => advancePayment(viewPayment.id)}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Send to Finance
                </button>
              )}
              {viewPayment.status === "Sent to Finance" && (
                <button
                  onClick={() => advancePayment(viewPayment.id)}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Initiate Payment
                </button>
              )}
              {viewPayment.status === "Payment Initiated" && (
                <button
                  onClick={() => advancePayment(viewPayment.id)}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Mark as Completed
                </button>
              )}
              <button
                onClick={() => setViewPayment(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
