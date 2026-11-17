import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getChartAccounts,
  getTransactions,
  getProcessMappings,
  saveProcessMappings,
  getProcessCategories,
  saveProcessCategories,
} from "../../api/finance-extras";
import { postJournalEntry } from "../../utils/postJournalEntry";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  csvAmountHeader,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
  getCurrencySymbol,
} from "../../utils/generalSettings";
import {
  Zap,
  Search,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Plus,
  ArrowLeft,
  Building2,
  Users,
  ShoppingCart,
  Package,
  Briefcase,
  FileText,
  ChevronDown,
  AlertTriangle,
  Eye,
  BookOpen,
  Layers,
  GitBranch,
  Edit,
  Trash2,
} from "lucide-react";
import { useChangelog } from "../../stores/changelogStore";
import { DataTable, type Column } from "../../components/DataTable";
import { ConfirmationModal } from "../../components/ConfirmationModal";

/**
 * Amounts a mapping line can post. Mirrors the list in Finance › Process
 * Mapping — the two screens edit the same stored lines, so offering different
 * fields on each would let one create a line the other cannot represent.
 */
const SOURCE_FIELDS = [
  "Amount", "Net Amount", "Gross Amount", "Purchase Value", "Order Amount",
  "Total Payable", "Payment Amount", "Net Payment", "Goods Value",
  "Transfer Cost", "Adjustment Value", "Gross Salary", "Net Pay", "PAYE Tax",
  "Allowance Total", "Advance Amount", "WHT Deducted", "Claim Amount",
  "Reimbursement", "Travel Amount", "Invoice Amount", "Labour Cost",
  "Expense Amount", "VAT", "Tax", "Fee", "Penalty", "Discount",
  "Retention Amount", "Milestone Value", "Contract Value",
];

// ── Types
type TxnStatus = "pending" | "approved" | "rejected" | "posted";
type SourceApp =
  | "HR"
  | "Procurement"
  | "ESS"
  | "Storefront"
  | "Projects"
  | "Finance";

interface ProcessCategory {
  id: string;
  name: string;
  description: string;
  sourceApp: SourceApp;
  linkedProcess: string;
  debitAccount: string;
  creditAccount: string;
}

interface Transaction {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  sourceApp: SourceApp;
  reference: string;
  date: string;
  submittedBy: string;
  status: TxnStatus;
  reviewedBy?: string;
  reviewedDate?: string;
  notes?: string;
  ledgerRef?: string;
}

// ── Config maps ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  TxnStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    badge: "bg-gray-100 text-gray-600",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  posted: {
    label: "Posted to Ledger",
    badge: "bg-purple-100 text-purple-700",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
};

const APP_CFG: Record<SourceApp, { icon: React.ReactNode; badge: string }> = {
  HR: {
    icon: <Users className="w-3.5 h-3.5" />,
    badge: "bg-violet-100 text-violet-700",
  },
  Procurement: {
    icon: <ShoppingCart className="w-3.5 h-3.5" />,
    badge: "bg-blue-100 text-blue-700",
  },
  ESS: {
    icon: <Briefcase className="w-3.5 h-3.5" />,
    badge: "bg-teal-100 text-teal-700",
  },
  Storefront: {
    icon: <Package className="w-3.5 h-3.5" />,
    badge: "bg-orange-100 text-orange-700",
  },
  Projects: {
    icon: <Building2 className="w-3.5 h-3.5" />,
    badge: "bg-sky-100 text-sky-700",
  },
  Finance: {
    icon: <FileText className="w-3.5 h-3.5" />,
    badge: "bg-emerald-100 text-emerald-700",
  },
};

const SOURCE_APPS: SourceApp[] = [
  "HR",
  "Procurement",
  "ESS",
  "Storefront",
  "Projects",
  "Finance",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${formatNumberByGeneralSettings(n)}`;
}
function todayStr() {
  return formatDateByGeneralSettings(new Date());
}

// ── New Category Modal ────────────────────────────────────────────────────────
function NewCategoryModal({ onClose, onSave, accounts }: {
  onClose: () => void;
  onSave: (c: ProcessCategory) => void;
  accounts: { code: string; name: string }[];
}) {
  const accountOptions = accounts.map(a => `${a.code} ${a.name}`);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sourceApp: "HR" as SourceApp,
    linkedProcess: "",
    debitAccount: "",
    creditAccount: "",
  });
  useEffect(() => {
    setForm((prev) => {
      const debitAccount = prev.debitAccount || accountOptions[0] || "";
      const creditAccount = prev.creditAccount || accountOptions[1] || "";
      if (debitAccount === prev.debitAccount && creditAccount === prev.creditAccount) return prev;
      return { ...prev, debitAccount, creditAccount };
    });
  }, [accountOptions]);
  const canSubmit =
    form.name.trim() &&
    form.linkedProcess.trim() &&
    form.debitAccount !== form.creditAccount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              New Process Category
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define a category to group similar financial transactions
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Payroll Disbursement"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={2}
              placeholder="Brief description of the transactions grouped under this category"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Source Application <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.sourceApp}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sourceApp: e.target.value as SourceApp,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none pr-7"
                >
                  {SOURCE_APPS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Linked Process <span className="text-red-500">*</span>
              </label>
              <input
                value={form.linkedProcess}
                onChange={(e) =>
                  setForm((p) => ({ ...p, linkedProcess: e.target.value }))
                }
                placeholder="e.g. Payroll Run"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Process-to-Account Mapping
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-bold mr-1.5">
                    DR
                  </span>
                  Debit Account
                </label>
                <div className="relative">
                  <select
                    value={form.debitAccount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, debitAccount: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none pr-7"
                  >
                    {accountOptions.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-bold mr-1.5">
                    CR
                  </span>
                  Credit Account
                </label>
                <div className="relative">
                  <select
                    value={form.creditAccount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, creditAccount: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none pr-7"
                  >
                    {accountOptions.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {form.debitAccount === form.creditAccount && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Debit and credit
                  accounts must differ.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => {
              onSave({ id: `cat-${Date.now()}`, ...form });
              onClose();
            }}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Category
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transaction Detail Modal ──────────────────────────────────────────────────
function TransactionDetailModal({
  txn,
  category,
  onClose,
  onApprove,
  onReject,
  onPost,
}: {
  txn: Transaction;
  category: ProcessCategory;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  onPost: (id: string) => void;
}) {
  const sc = STATUS_CFG[txn.status];
  const ac = APP_CFG[txn.sourceApp];
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs text-gray-500 font-mono">{txn.id}</p>
            <h2 className="text-base font-semibold text-gray-900 max-w-sm truncate">
              {txn.description}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Status */}
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl ${sc.badge}`}
          >
            {sc.icon}
            <span className="text-sm font-semibold">{sc.label}</span>
            {txn.ledgerRef && (
              <span className="ml-auto text-xs font-mono bg-white/60 px-2 py-0.5 rounded">
                Ledger: {txn.ledgerRef}
              </span>
            )}
          </div>
          {/* Details */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Transaction Details
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: "Category", value: category.name },
                {
                  label: "Process",
                  value: `${txn.sourceApp} → ${category.linkedProcess}`,
                },
                { label: "Amount", value: fmt(txn.amount) },
                { label: "Reference", value: txn.reference },
                { label: "Date", value: txn.date },
                { label: "Submitted By", value: txn.submittedBy },
                ...(txn.reviewedBy
                  ? [
                      { label: "Reviewed By", value: txn.reviewedBy },
                      { label: "Reviewed", value: txn.reviewedDate! },
                    ]
                  : []),
                ...(txn.notes ? [{ label: "Notes", value: txn.notes }] : []),
              ].map((row) => (
                <div key={row.label} className="flex px-4 py-2.5 gap-4">
                  <span className="text-xs text-gray-500 w-28 flex-shrink-0">
                    {row.label}
                  </span>
                  <span className="text-xs font-medium text-gray-800">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* DR/CR entries */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Financial Entries
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Account</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                      DR
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {category.debitAccount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                    {fmt(txn.amount)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                      CR
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {category.creditAccount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                    {fmt(txn.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Source */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${ac.badge}`}
            >
              {ac.icon} {txn.sourceApp}
            </span>
            <span className="text-xs text-gray-500">
              {category.linkedProcess}
            </span>
          </div>
          {/* Reject form */}
          {showRejectForm && (
            <div className="border border-red-200 rounded-xl p-4 space-y-3 bg-red-50">
              <p className="text-xs font-semibold text-red-800">
                Rejection Reason
              </p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={2}
                placeholder="Provide reason for rejection…"
                className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm outline-none resize-none bg-white focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onReject(txn.id, rejectNotes);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
          {/* Actions */}
          {txn.status === "pending" && !showRejectForm && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={() => {
                  onApprove(txn.id);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            </div>
          )}
          {txn.status === "approved" && (
            <button
              onClick={() => {
                onPost(txn.id);
                onClose();
              }}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> Post to Ledger
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Detail (drill-down) ──────────────────────────────────────────────
function CategoryDetailView({
  category,
  transactions,
  onBack,
  onApprove,
  onReject,
  onPost,
}: {
  category: ProcessCategory;
  transactions: Transaction[];
  onBack: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  onPost: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TxnStatus | "all">("all");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.description.toLowerCase().includes(q) ||
      t.reference.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    approved: transactions.filter((t) => t.status === "approved").length,
    rejected: transactions.filter((t) => t.status === "rejected").length,
    posted: transactions.filter((t) => t.status === "posted").length,
  };
  const pendingAmt = transactions
    .filter((t) => t.status === "pending")
    .reduce((s, t) => s + t.amount, 0);
  const approvedAmt = transactions
    .filter((t) => t.status === "approved")
    .reduce((s, t) => s + t.amount, 0);
  const postedAmt = transactions
    .filter((t) => t.status === "posted")
    .reduce((s, t) => s + t.amount, 0);
  const ac = APP_CFG[category.sourceApp];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">
              {category.name}
            </h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${ac.badge}`}
            >
              {ac.icon} {category.sourceApp}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
        </div>
      </div>

      {/* Category info */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              {
                label: "Linked Process",
                value: category.linkedProcess,
                cls: "text-gray-800",
              },
              {
                label: "Source",
                value: category.sourceApp,
                cls: "text-gray-800",
              },
              {
                label: "Debit Account",
                value: category.debitAccount,
                cls: "text-blue-700 font-mono",
              },
              {
                label: "Credit Account",
                value: category.creditAccount,
                cls: "text-green-700 font-mono",
              },
            ] as const
          ).map((r) => (
            <div key={r.label}>
              <p className="text-xs text-gray-500 mb-0.5">{r.label}</p>
              <p className={`text-sm font-medium ${r.cls}`}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xl font-bold text-gray-700">{counts.pending}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending</p>
          {pendingAmt > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{fmt(pendingAmt)}</p>
          )}
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xl font-bold text-emerald-700">
            {counts.approved}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">Approved</p>
          {approvedAmt > 0 && (
            <p className="text-xs text-emerald-500 mt-0.5">
              {fmt(approvedAmt)}
            </p>
          )}
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xl font-bold text-purple-700">{counts.posted}</p>
          <p className="text-xs text-purple-600 mt-0.5">Posted</p>
          {postedAmt > 0 && (
            <p className="text-xs text-purple-500 mt-0.5">{fmt(postedAmt)}</p>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-xs text-red-500 mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search transactions, references…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected", "posted"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${statusFilter === s ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
              >
                {s === "all"
                  ? `All (${counts.all})`
                  : `${STATUS_CFG[s].label} (${counts[s]})`}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Transaction table */}
      <DataTable columns={[
        { key: "id", label: "Transaction ID", render: t => <span className="font-mono text-xs text-gray-500">{t.id}</span>, sortable: true, filterable: true, minWidth: 100 },
        { key: "description", label: "Description", render: t => <div><p className="font-medium text-gray-900 max-w-xs truncate">{t.description}</p><p className="text-xs text-gray-400 font-mono">{t.reference}</p></div>, sortable: true, filterable: true, minWidth: 200 },
        { key: "amount", label: csvAmountHeader("Amount"), render: t => <span className="text-sm font-semibold text-gray-800">{fmt(t.amount)}</span>, sortable: true, filterable: false, className: "text-right", headerClassName: "text-right" },
        { key: "date", label: "Date", render: t => <span className="text-xs text-gray-500">{t.date}</span>, sortable: true, filterable: false },
        { key: "submittedBy", label: "Submitted By", render: t => <span className="text-xs text-gray-600">{t.submittedBy}</span>, sortable: true, filterable: true },
        { key: "status", label: "Status", render: t => { const sc = STATUS_CFG[t.status]; return <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sc.badge}`}>{sc.icon} {sc.label}</span>; }, sortable: true, filterable: true },
        { key: "actions", label: "Actions", render: t => (
          <div className="flex items-center gap-1">
            <button onClick={() => setSelectedTxn(t)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50" title="View Details"><Eye className="w-3.5 h-3.5" /></button>
            {t.status === "pending" && (
              <>
                <button onClick={() => onApprove(t.id)} className="p-1.5 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                <button onClick={() => setSelectedTxn(t)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
              </>
            )}
            {t.status === "approved" && (
              <button onClick={() => onPost(t.id)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50" title="Post to Ledger"><Zap className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ), sortable: false, filterable: false, className: "text-right", headerClassName: "text-right" },
      ]} data={filtered} keyExtractor={t => t.id}
        searchPlaceholder="Search transactions..."
        searchFields={[t => t.description, t => t.reference, t => t.id]}
        emptyMessage="No transactions found." />

      {selectedTxn && (
        <TransactionDetailModal
          txn={selectedTxn}
          category={category}
          onClose={() => setSelectedTxn(null)}
          onApprove={(id) => {
            onApprove(id);
            setSelectedTxn(null);
          }}
          onReject={(id, notes) => {
            onReject(id, notes);
            setSelectedTxn(null);
          }}
          onPost={(id) => {
            onPost(id);
            setSelectedTxn(null);
          }}
        />
      )}
    </div>
  );
}

// ── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  transactions,
  onClick,
}: {
  category: ProcessCategory;
  transactions: Transaction[];
  onClick: () => void;
}) {
  const pending = transactions.filter((t) => t.status === "pending").length;
  const approved = transactions.filter((t) => t.status === "approved").length;
  const posted = transactions.filter((t) => t.status === "posted").length;
  const pendingAmt = transactions
    .filter((t) => t.status === "pending")
    .reduce((s, t) => s + t.amount, 0);
  const ac = APP_CFG[category.sourceApp];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-800 transition-colors leading-tight">
            {category.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {category.description}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${ac.badge}`}
        >
          {ac.icon} {category.sourceApp}
        </span>
      </div>
      {pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">
              {pending} pending
            </span>
          </div>
          <span className="text-xs font-bold text-amber-700">
            {fmt(pendingAmt)}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" /> {approved}{" "}
          approved
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-purple-500" /> {posted} posted
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-gray-400" /> {transactions.length}{" "}
          total
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 text-xs">
        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono truncate flex-1">
          DR: {category.debitAccount}
        </span>
        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono truncate flex-1">
          CR: {category.creditAccount}
        </span>
      </div>
    </button>
  );
}

/**
 * One account line of a process mapping, flattened.
 *
 * Process Mapping stores a mapping per process with its lines nested inside;
 * this view lists the lines themselves, which is the level at which somebody
 * asks "what does Payroll Disbursement debit?". Both screens read and write the
 * same stored mappings, so an edit here shows up there and vice versa — the
 * alternative, a second copy of the configuration, is how the two would
 * disagree about how a process posts.
 */
interface MappingRow {
  /** Id of the owning mapping, so a line can be written back into it. */
  mappingId: string;
  lineId: string;
  application: string;
  process: string;
  account: string;
  glCode: string;
  action: "debit" | "credit";
  field: string;
}

function flattenMappings(mappings: any[]): MappingRow[] {
  return (mappings ?? []).flatMap((m: any) =>
    (Array.isArray(m?.lines) ? m.lines : []).map((l: any) => ({
      mappingId: String(m.id),
      lineId: String(l.id),
      application: String(m.application ?? ""),
      process: String(m.process ?? ""),
      account: String(l.account ?? ""),
      glCode: String(l.glCode ?? ""),
      action: l.action === "credit" ? "credit" : "debit",
      field: String(l.field ?? ""),
    })),
  );
}

function PostingConfigModal({
  initial,
  processes,
  accounts,
  fields,
  onClose,
  onSave,
}: {
  initial?: MappingRow;
  processes: { mappingId: string; application: string; process: string }[];
  accounts: { code: string; name: string; type?: string }[];
  fields: string[];
  onClose: () => void;
  onSave: (row: MappingRow) => void;
}) {
  const [mappingId, setMappingId] = useState(
    initial?.mappingId ?? processes[0]?.mappingId ?? "",
  );
  const [glCode, setGlCode] = useState(initial?.glCode ?? "");
  const [action, setAction] = useState<"debit" | "credit">(
    initial?.action ?? "debit",
  );
  const [field, setField] = useState(initial?.field ?? fields[0] ?? "");
  const [accountType, setAccountType] = useState("All");

  const types = Array.from(
    new Set(accounts.map((a) => a.type).filter(Boolean) as string[]),
  );
  const visible =
    accountType === "All"
      ? accounts
      : accounts.filter((a) => a.type === accountType);
  const chosenAccount = accounts.find((a) => a.code === glCode);
  const target = processes.find((p) => p.mappingId === mappingId);
  const canSubmit = mappingId && glCode && field;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {initial ? "Edit posting configuration" : "New posting configuration"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              How a business process posts to the Chart of Accounts
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Process <span className="text-red-500">*</span>
            </label>
            <select
              value={mappingId}
              onChange={(e) => setMappingId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">
                {processes.length === 0
                  ? "No processes configured in Process Mapping"
                  : "Select a process…"}
              </option>
              {processes.map((p) => (
                <option key={p.mappingId} value={p.mappingId}>
                  {p.application} — {p.process}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Account type
              </label>
              <select
                value={accountType}
                onChange={(e) => {
                  setAccountType(e.target.value);
                  setGlCode("");
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {["All", ...types].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Account no <span className="text-red-500">*</span>
              </label>
              <select
                value={glCode}
                onChange={(e) => setGlCode(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select account…</option>
                {visible.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} – {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Account name
            </label>
            {/* Derived, never typed: a name that disagrees with its code is a
                posting nobody can trace back to an account. */}
            <input
              value={chosenAccount?.name ?? ""}
              readOnly
              placeholder="Appears automatically"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-600 pointer-events-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Action <span className="text-red-500">*</span>
              </label>
              <select
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as "debit" | "credit")
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {fields.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              A posting built from this configuration still has to balance —
              total debits must equal total credits — before it reaches the
              ledger.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => {
              onSave({
                mappingId,
                lineId: initial?.lineId ?? `ln-${Date.now()}`,
                application: target?.application ?? "",
                process: target?.process ?? "",
                account: chosenAccount?.name ?? "",
                glCode,
                action,
                field,
              });
              onClose();
            }}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {initial ? "Save changes" : "Save configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function PostingEnginePage() {
  const { logChange } = useChangelog();
  const [categories, setCategories] = useState<ProcessCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<
    { code: string; name: string; type?: string }[]
  >([]);
  /** The stored process mappings, shared with Finance › Process Mapping. */
  const [mappings, setMappings] = useState<any[]>([]);
  const [view, setView] = useState<"categories" | "mappings">("categories");
  const [mappingEdit, setMappingEdit] = useState<MappingRow | undefined>();
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [deleteMappingRow, setDeleteMappingRow] = useState<MappingRow | null>(
    null,
  );

  useEffect(() => {
    getProcessMappings()
      .then(setMappings)
      .catch((err) => notifyLoadFailure("process mappings", err));
    // Categories were component state seeded with an empty array, so the list
    // was empty on every load and posting — which looks its category up first —
    // could never run.
    getProcessCategories()
      .then((rows) => setCategories(rows as ProcessCategory[]))
      .catch((err) => notifyLoadFailure("process categories", err));
  }, []);

  useEffect(() => {
    Promise.all([getTransactions(), getChartAccounts()])
      .then(([data, accountData]) => {
        setAccounts(
          accountData.map((a) => ({ code: a.code, name: a.name, type: a.type })),
        );
        setTransactions(
          data.map((t) => ({
            id: t.id,
            categoryId: t.category ?? "",
            description: t.description,
            amount: t.amount,
            sourceApp: "Finance" as SourceApp,
            reference: t.reference ?? "",
            date: t.date,
            submittedBy: t.createdBy ?? "",
            status: (t.status as TxnStatus) ?? "pending",
            notes: t.notes,
          })),
        );
      })
      .catch((err) => notifyLoadFailure("chart of accounts", err));
  }, []);
  const [activeCategory, setActiveCategory] = useState<ProcessCategory | null>(
    null,
  );
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState<SourceApp | "all">("all");

  const now = todayStr();

  const mappingRows = flattenMappings(mappings);
  /** Processes a line can be attached to, from the stored mappings. */
  const mappingProcesses = mappings.map((m: any) => ({
    mappingId: String(m.id),
    application: String(m.application ?? ""),
    process: String(m.process ?? ""),
  }));
  const mappedProcessCount = new Set(
    mappingRows.map((r) => `${r.application}/${r.process}`),
  ).size;

  /**
   * Creates a process category, and the account mapping it posts by.
   *
   * The two are written together on purpose: a category with no mapping is a
   * bucket that cannot post, and a mapping with no category is configuration
   * for a process nothing routes to. The category's own debit and credit
   * accounts *are* the mapping — this just records them where the posting
   * builder and Finance › Process Mapping can both see them.
   */
  async function saveCategory(c: ProcessCategory) {
    const nextCategories = [...categories, c];
    setCategories(nextCategories);

    const debit = accounts.find((a) => `${a.code} ${a.name}` === c.debitAccount);
    const credit = accounts.find((a) => `${a.code} ${a.name}` === c.creditAccount);
    const stamp = Date.now();
    const nextMappings = [
      ...mappings,
      {
        id: `pm-${stamp}`,
        application: c.sourceApp,
        process: c.name,
        status: "mapped",
        lastUpdated: new Date().toISOString(),
        updatedBy: getAuthUserName() || "Current User",
        lines: [
          {
            id: `ln-${stamp}-dr`,
            account: debit?.name ?? c.debitAccount,
            glCode: debit?.code ?? "",
            action: "debit",
            field: SOURCE_FIELDS[0],
          },
          {
            id: `ln-${stamp}-cr`,
            account: credit?.name ?? c.creditAccount,
            glCode: credit?.code ?? "",
            action: "credit",
            field: SOURCE_FIELDS[0],
          },
        ],
      },
    ];
    setMappings(nextMappings);

    try {
      await Promise.all([
        saveProcessCategories(nextCategories),
        saveProcessMappings(nextMappings),
      ]);
      toast.success(`Process category "${c.name}" created.`, {
        description: "Its debit and credit lines are on the Process Account Mapping tab.",
      });
      logChange({
        module: "Finance",
        action: "Created",
        entityType: "ProcessCategory",
        entityId: c.id,
        summary: `Created process category "${c.name}" (DR ${c.debitAccount} / CR ${c.creditAccount})`,
        performedBy: getAuthUserName() || "Current User",
      });
    } catch (err) {
      setCategories(categories);
      setMappings(mappings);
      toast.error(
        err instanceof Error ? err.message : "Could not save the category.",
      );
    }
  }

  /** Writes the mappings back, and reports a failure rather than swallowing it. */
  function persistMappings(next: any[], message: string) {
    const previous = mappings;
    setMappings(next);
    saveProcessMappings(next)
      .then(() => toast.success(message))
      .catch((err) => {
        setMappings(previous);
        toast.error(
          err instanceof Error ? err.message : "Could not save the mapping.",
        );
      });
  }

  function saveMappingRow(row: MappingRow) {
    const next = mappings.map((m: any) => {
      if (String(m.id) !== row.mappingId) return m;
      const lines = Array.isArray(m.lines) ? m.lines : [];
      const exists = lines.some((l: any) => String(l.id) === row.lineId);
      const line = {
        id: row.lineId,
        account: row.account,
        glCode: row.glCode,
        action: row.action,
        field: row.field,
      };
      return {
        ...m,
        lines: exists
          ? lines.map((l: any) => (String(l.id) === row.lineId ? line : l))
          : [...lines, line],
        // A process with lines is mapped; that is what the status means.
        status: "mapped",
        lastUpdated: new Date().toISOString(),
        updatedBy: getAuthUserName() || "Current User",
      };
    });
    persistMappings(next, "Posting configuration saved.");
    logChange({
      module: "finance",
      action: "updated",
      entityType: "process_mapping",
      entityId: row.mappingId,
      summary: `${row.process}: ${row.action} ${row.glCode} ${row.account} on ${row.field}`,
      performedBy: getAuthUserName() || "Current User",
    });
  }

  function removeMappingRow(row: MappingRow) {
    const next = mappings.map((m: any) => {
      if (String(m.id) !== row.mappingId) return m;
      const lines = (Array.isArray(m.lines) ? m.lines : []).filter(
        (l: any) => String(l.id) !== row.lineId,
      );
      return {
        ...m,
        lines,
        status: lines.length > 0 ? "mapped" : "unmapped",
        lastUpdated: new Date().toISOString(),
        updatedBy: getAuthUserName() || "Current User",
      };
    });
    persistMappings(next, "Posting configuration removed.");
  }

  const mappingColumns: Column<MappingRow>[] = [
    {
      key: "process",
      label: "Process",
      sortable: true,
      filterable: true,
      render: (m) => (
        <div>
          <p className="font-medium text-gray-900">{m.process}</p>
          <p className="text-xs text-gray-400">{m.application}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Account type",
      sortable: true,
      filterable: true,
      render: (m) => (
        <span className="text-xs text-gray-500">
          {accounts.find((a) => a.code === m.glCode)?.type ?? "—"}
        </span>
      ),
    },
    {
      key: "glCode",
      label: "No",
      sortable: true,
      filterable: true,
      render: (m) => (
        <span className="font-mono text-xs text-gray-500">{m.glCode}</span>
      ),
    },
    {
      key: "account",
      label: "Name",
      sortable: true,
      filterable: true,
      render: (m) => <span className="text-sm text-gray-700">{m.account}</span>,
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      filterable: true,
      render: (m) => (
        <span
          className={`px-2 py-0.5 text-xs rounded-full font-bold ${m.action === "debit" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
        >
          {m.action === "debit" ? "Debit" : "Credit"}
        </span>
      ),
    },
    {
      key: "field",
      label: "Amount",
      sortable: true,
      filterable: true,
      render: (m) => <span className="text-xs text-gray-500">{m.field}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      headerClassName: "text-right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setMappingEdit(m);
              setShowMappingModal(true);
            }}
            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
            title="Edit posting configuration"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteMappingRow(m)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
            title="Delete posting configuration"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  function approveTransaction(id: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: "approved", reviewedBy: "Sola Adeleke", reviewedDate: now } : t));
    const txn = transactions.find(t => t.id === id);
    if (txn) logChange({ module: "Finance", action: "Approved", entityType: "PostingEngineTxn", entityId: id, summary: `Posting Engine: "${txn.description}" approved`, performedBy: "Sola Adeleke" });
    toast.success("Transaction approved.");
  }
  function rejectTransaction(id: string, notes: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: "rejected", reviewedBy: "Sola Adeleke", reviewedDate: now, notes: notes || undefined } : t));
    const txn = transactions.find(t => t.id === id);
    if (txn) logChange({ module: "Finance", action: "Rejected", entityType: "PostingEngineTxn", entityId: id, summary: `Posting Engine: "${txn.description}" rejected`, performedBy: "Sola Adeleke" });
    toast.success("Transaction rejected.");
  }
  /**
   * Posts an approved transaction to the general ledger.
   *
   * This used to invent an `LGR-####` reference with Math.random and push a
   * single debit/credit pair into the in-memory finance context — which meant
   * the posting existed only in the browser, never reached the Chart of
   * Accounts, and did not appear on the General Ledger. It writes a real
   * journal entry now, which is the same thing every other posting site
   * produces, so all of them land in one ledger.
   */
  async function postToLedger(id: string) {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    const cat = categories.find(c => c.id === txn.categoryId);
    if (!cat) return;

    const debit = accounts.find((a) => `${a.code} ${a.name}` === cat.debitAccount)
      ?? accounts.find((a) => cat.debitAccount.startsWith(a.code));
    const credit = accounts.find((a) => `${a.code} ${a.name}` === cat.creditAccount)
      ?? accounts.find((a) => cat.creditAccount.startsWith(a.code));
    if (!debit || !credit) {
      toast.error(`${cat.name} is not mapped to accounts that exist.`, {
        description: "Check its debit and credit accounts against the Chart of Accounts.",
      });
      return;
    }

    try {
      const entry = await postJournalEntry({
        description: `${cat.name}: ${txn.description}`,
        date: new Date().toISOString(),
        createdBy: txn.reviewedBy || getAuthUserName() || "Posting Engine",
        reference: txn.reference || undefined,
        lines: [
          {
            id: `${txn.id}-dr`,
            glCode: debit.code,
            account: debit.name,
            debit: txn.amount,
            credit: 0,
            description: cat.linkedProcess,
          },
          {
            id: `${txn.id}-cr`,
            glCode: credit.code,
            account: credit.name,
            debit: 0,
            credit: txn.amount,
            description: cat.linkedProcess,
          },
        ],
      });
      setTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: "posted", ledgerRef: entry.reference } : t));
      logChange({
        module: "Finance",
        action: "Posted",
        entityType: "PostingEngineTxn",
        entityId: id,
        summary: `Posting Engine: "${txn.description}" → ledger (${entry.reference})`,
        performedBy: getAuthUserName() || "Current User",
      });
      toast.success(`Posted to the general ledger as ${entry.reference}.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not post to the ledger.",
      );
    }
  }

  const filteredCategories = categories.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.linkedProcess.toLowerCase().includes(q);
    const matchApp = appFilter === "all" || c.sourceApp === appFilter;
    return matchSearch && matchApp;
  });

  const totalPending = transactions.filter(
    (t) => t.status === "pending",
  ).length;
  const totalApproved = transactions.filter(
    (t) => t.status === "approved",
  ).length;
  const totalPosted = transactions.filter((t) => t.status === "posted").length;
  const totalPendingAmt = transactions
    .filter((t) => t.status === "pending")
    .reduce((s, t) => s + t.amount, 0);

  if (activeCategory) {
    return (
      <CategoryDetailView
        category={activeCategory}
        transactions={transactions.filter(
          (t) => t.categoryId === activeCategory.id,
        )}
        onBack={() => setActiveCategory(null)}
        onApprove={approveTransaction}
        onReject={rejectTransaction}
        onPost={postToLedger}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Posting Engine
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-12">
            Process-based financial posting — select a category, review
            transactions, approve and post to ledger.
          </p>
        </div>
        <button
          onClick={() => setShowNewCatModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {/* The two things this page governs: the categories transactions arrive
          under, and the account configuration those postings are built from.
          The mapping lines are the same ones Finance › Process Mapping edits —
          one store, two ways in, so they cannot drift apart. */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button
          onClick={() => setView("categories")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === "categories" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Process Categories
        </button>
        <button
          onClick={() => setView("mappings")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === "mappings" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <GitBranch className="w-3.5 h-3.5" /> Process Account Mapping
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${view === "mappings" ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}
          >
            {mappingRows.length}
          </span>
        </button>
      </div>

      {view === "mappings" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-gray-500">
              {mappingRows.length} account line
              {mappingRows.length === 1 ? "" : "s"} across{" "}
              <strong>{mappedProcessCount}</strong> process
              {mappedProcessCount === 1 ? "" : "es"} — postings are built from
              these lines when a process fires.
            </p>
            <button
              onClick={() => {
                setMappingEdit(undefined);
                setShowMappingModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" /> New posting configuration
            </button>
          </div>

          <DataTable<MappingRow>
            columns={mappingColumns}
            data={mappingRows}
            keyExtractor={(m) => `${m.mappingId}-${m.lineId}`}
            searchPlaceholder="Search postings…"
            searchFields={[
              (m) => m.process,
              (m) => m.account,
              (m) => m.glCode,
              (m) => m.field,
            ]}
            emptyMessage="No posting configurations yet. Add one to control how a process posts to the Chart of Accounts."
          />

          {showMappingModal && (
            <PostingConfigModal
              initial={mappingEdit}
              processes={mappingProcesses}
              accounts={accounts}
              fields={SOURCE_FIELDS}
              onClose={() => {
                setShowMappingModal(false);
                setMappingEdit(undefined);
              }}
              onSave={saveMappingRow}
            />
          )}

          <ConfirmationModal
            isOpen={Boolean(deleteMappingRow)}
            title="Delete posting configuration"
            description={
              deleteMappingRow
                ? `Remove the ${deleteMappingRow.action} to ${deleteMappingRow.glCode} ${deleteMappingRow.account} from ${deleteMappingRow.process}? Postings for that process will no longer include this line.`
                : ""
            }
            confirmLabel="Delete"
            isDangerous
            onConfirm={() => {
              if (deleteMappingRow) removeMappingRow(deleteMappingRow);
              setDeleteMappingRow(null);
            }}
            onCancel={() => setDeleteMappingRow(null)}
          />
        </div>
      ) : (
      <>
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-800">
            {categories.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Process Categories</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-700">{totalPending}</p>
          <p className="text-xs text-amber-600 mt-0.5">Pending Transactions</p>
          {totalPendingAmt > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">
              {fmt(totalPendingAmt)}
            </p>
          )}
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-700">{totalApproved}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Ready to Post</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-700">{totalPosted}</p>
          <p className="text-xs text-purple-600 mt-0.5">Posted to Ledger</p>
        </div>
      </div>

      {/* Approved callout */}
      {totalApproved > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Send className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800">
            <strong>
              {totalApproved} approved transaction{totalApproved > 1 ? "s" : ""}
            </strong>{" "}
            ready to be posted to the ledger. Open the relevant category to
            complete posting.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search categories or processes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", ...SOURCE_APPS] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAppFilter(a)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${appFilter === a ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {a === "all" ? "All Apps" : a}
            </button>
          ))}
        </div>
        {(search || appFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setAppFilter("all");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Category grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No process categories found.</p>
          <button
            onClick={() => setShowNewCatModal(true)}
            className="mt-3 text-xs text-emerald-600 hover:underline"
          >
            Create a new category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              transactions={transactions.filter((t) => t.categoryId === cat.id)}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>
      )}

      </>
      )}

      {showNewCatModal && (
        <NewCategoryModal
          onClose={() => setShowNewCatModal(false)}
          onSave={saveCategory}
          accounts={accounts}
        />
      )}
    </div>
  );
}
