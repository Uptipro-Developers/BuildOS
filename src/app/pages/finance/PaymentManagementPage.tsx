import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  csvAmountHeader,
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  fetchPayments,
  initiatePayment,
  completePayment,
  updatePayment,
} from "../../api/payments";
import {
  findAccount,
  loadPostableAccounts,
  postJournalEntry,
} from "../../utils/postJournalEntry";
import {
  JournalLinesEditor,
  journalTotals,
  newJournalLine,
  type JournalLineInput,
} from "../../components/JournalLinesEditor";
import { Download, CreditCard, Clock, CheckCircle, XCircle, Send, Eye, X, BookOpen } from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { RowAction, RowActions } from "../../components/RowAction";
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

/**
 * Where each kind of payment is expensed. Only a hint: the actual account is
 * matched by name against this organisation's own Chart of Accounts, so a
 * BuildOS install that names its accounts differently still posts somewhere
 * sensible rather than to a hardcoded code that does not exist.
 */
const EXPENSE_ACCOUNT_HINT: Record<PaymentType, string> = {
  Expense: "operating expense",
  Payroll: "salaries",
  Vendor: "cost of sales",
  Contractor: "subcontract",
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
/**
 * Reads a status in whichever form it arrives in.
 *
 * The API serves the Prisma enum ("PaymentInitiated"); this screen and its
 * workflow are written in the spaced labels ("Payment Initiated"). Comparing
 * without the spaces makes both forms the same value, so a payment shows the
 * stage it is actually at.
 */
const ALL_STATUSES: PaymentStatus[] = [...PAYMENT_FLOW, "Failed"];

function toStatus(raw: unknown): PaymentStatus {
  const key = String(raw ?? "").replace(/[\s_-]+/g, "").toLowerCase();
  const hit = ALL_STATUSES.find(
    (s) => s.replace(/\s+/g, "").toLowerCase() === key,
  );
  return hit ?? "Approved Request";
}

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
    // The database stores the PaymentStatus enum unspaced — "PaymentInitiated"
    // — while this screen works in the spaced labels it displays. Only the
    // spaced form was recognised on the way in, so *every* payment fell through
    // to the "Approved Request" default no matter what stage it was really at:
    // the workflow appeared stuck at step one, and Complete — the step that
    // posts to the ledger — was never offered on any row. The write path
    // already strips the spaces back out when it saves.
    const status = toStatus(p.status);
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
  /** Id of the payment mid-advance, so the action cannot be double-fired. */
  const [advancing, setAdvancing] = useState<string | null>(null);
  /** The payment being completed, which opens the posting modal. */
  const [postTarget, setPostTarget] = useState<Payment | null>(null);
  const [postLines, setPostLines] = useState<JournalLineInput[]>([]);
  const [postAccounts, setPostAccounts] = useState<{ code: string; name: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const { logChange } = useChangelog();

  /**
   * Opens the posting modal with a sensible starting pair.
   *
   * A payment used to post exactly two lines derived by keyword-matching the
   * Chart of Accounts, with no way to see or change them — fine for a simple
   * expense, wrong for anything carrying tax withheld, a part-settlement or a
   * split across cost centres, all of which need more than two lines. The guess
   * is still made, because it is right most of the time; it is now a starting
   * point rather than the whole posting.
   */
  async function openPostModal(payment: Payment) {
    setPostTarget(payment);
    setPostLines([]);
    setLoadingAccounts(true);
    try {
      const accounts = await loadPostableAccounts();
      setPostAccounts(accounts);
      const expense =
        findAccount(
          accounts,
          EXPENSE_ACCOUNT_HINT[payment.type],
          "expense",
          "overhead",
        ) ?? accounts[0];
      const cash = findAccount(accounts, "cash & bank", "bank", "cash");
      setPostLines([
        {
          id: `${payment.id}-dr`,
          glCode: expense?.code ?? "",
          account: expense?.name ?? "",
          debit: payment.amount,
          credit: 0,
          description: payment.recipient,
        },
        {
          id: `${payment.id}-cr`,
          glCode: cash?.code ?? "",
          account: cash?.name ?? "",
          debit: 0,
          credit: payment.amount,
          description: `Paid via ${payment.method}`,
        },
      ]);
    } catch {
      toast.error("Could not load the Chart of Accounts.");
      // Left with two blank lines rather than none, so the posting can still be
      // keyed by hand if the accounts list is what failed.
      setPostLines([newJournalLine(), newJournalLine()]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  function closePostModal() {
    setPostTarget(null);
    setPostLines([]);
  }

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  const filtered = payments.filter((p) => {
    if (typeFilter !== "All" && p.type !== typeFilter) return false;
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    return true;
  });

  /**
   * Moves a payment to the next stage.
   *
   * The stage change used to be a `setPayments` call and nothing else, so the
   * payment advanced in the browser and the next reload put it back.
   *
   * Completing a payment is the one step that posts, and it does not run
   * through here — it opens the posting modal instead, because the accounting
   * for a payment is not always the two lines a heuristic would guess. Once the
   * user has settled the lines, `completePayment` below finishes the job.
   */
  async function advancePayment(id: string, lines?: JournalLineInput[]) {
    const payment = payments.find((p) => p.id === id);
    if (!payment || advancing) return;
    const idx = PAYMENT_FLOW.indexOf(payment.status);
    if (idx < 0 || idx >= PAYMENT_FLOW.length - 1) return;
    const next = PAYMENT_FLOW[idx + 1];

    // Completing needs lines. Asked for here rather than guessed, unless the
    // caller has already been through the modal and brought them.
    if (next === "Payment Completed" && !lines) {
      void openPostModal(payment);
      return;
    }

    setAdvancing(id);
    const previous = payments;
    try {
      let postedRef: string | undefined;

      if (next === "Payment Completed" && lines) {
        // The posting happens first: a payment marked complete without one is a
        // payment with no accounting behind it, which is the harder error to
        // find later.
        const entry = await postJournalEntry({
          description: `Payment ${payment.reference || payment.id} — ${payment.recipient} (${payment.type})`,
          date: new Date().toISOString(),
          createdBy: getAuthUserName() || "Current User",
          lines,
          // So the General Ledger can name what moved the money and link back
          // to it, rather than showing a posting with no origin.
          reference: payment.reference || undefined,
          sourceModule: "Payment",
          sourceType: "Payment",
          sourceId: payment.id,
        });
        postedRef = entry.reference;
      }

      if (next === "Payment Initiated") await initiatePayment(id);
      else if (next === "Payment Completed") await completePayment(id);
      else await updatePayment(id, { status: next.replace(/\s+/g, "") });

      setPayments((prev) =>
        prev.map((p) =>
          p.id !== id
            ? p
            : {
                ...p,
                status: next,
                initiatedBy:
                  next === "Payment Initiated"
                    ? getAuthUserName() || "Current User"
                    : p.initiatedBy,
                completedAt:
                  next === "Payment Completed"
                    ? formatDateByGeneralSettings(new Date())
                    : p.completedAt,
              },
        ),
      );

      logChange({
        module: "Finance",
        action: next,
        entityType: "Payment",
        entityId: id,
        summary: postedRef
          ? `Payment ${id} completed and posted as ${postedRef}`
          : `Payment ${id} advanced to ${next}`,
        performedBy: getAuthUserName() || "Current User",
      });

      setViewPayment(null);
      closePostModal();
      toast.success(
        next === "Payment Completed" ? "Payment recorded." : `Payment moved to ${next}.`,
        postedRef
          ? { description: `Posted to the general ledger as ${postedRef}.` }
          : undefined,
      );
    } catch (e) {
      setPayments(previous);
      toast.error(
        e instanceof Error ? e.message : "Could not advance the payment.",
      );
    } finally {
      setAdvancing(null);
    }
  }

  function handleExport() {
    exportCSV(
      "payments",
      [
        "Payment ID",
        "Type",
        "Reference",
        "Recipient",
        csvAmountHeader("Amount"),
        "Method",
        "Date",
        "Status",
      ],
      payments.map((p) => [
        p.id,
        p.type,
        p.reference,
        p.recipient,
        p.amount,
        p.method,
        p.date,
        p.status,
      ]),
    );
    toast.success(`Exported ${payments.length} payments.`);
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
      // Icon *and* label, through the shared component, like every other row
      // action in the app. A naked eye icon carries no accessible name, so it
      // was unreachable by name to a screen reader — and it is the only way in
      // to the stage actions, which is a lot to hang on an unlabelled glyph.
      render: (p) => (
        <RowActions>
          <RowAction
            icon={<Eye className="w-3.5 h-3.5" />}
            label="View"
            tone="positive"
            onClick={() => setViewPayment(p)}
          />
        </RowActions>
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

      {postTarget && (
        <PostPaymentModal
          payment={postTarget}
          lines={postLines}
          accounts={postAccounts}
          loading={loadingAccounts}
          posting={advancing === postTarget.id}
          onLinesChange={setPostLines}
          onClose={closePostModal}
          onConfirm={() => void advancePayment(postTarget.id, postLines)}
        />
      )}
    </div>
  );
}

/**
 * The accounting behind a completed payment.
 *
 * Opens on the two lines a payment usually needs and lets them be changed or
 * added to, because plenty of payments are not two lines: withholding tax split
 * out of a vendor payment, a bank charge on the same transfer, one payment
 * settling several cost centres. Completing used to post a fixed pair with none
 * of that visible, so any payment that was not the simple case was recorded
 * wrongly and silently.
 */
function PostPaymentModal({
  payment,
  lines,
  accounts,
  loading,
  posting,
  onLinesChange,
  onClose,
  onConfirm,
}: {
  payment: Payment;
  lines: JournalLineInput[];
  accounts: { code: string; name: string }[];
  loading: boolean;
  posting: boolean;
  onLinesChange: (lines: JournalLineInput[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { balanced, totalDebits } = journalTotals(lines);
  // The posting must settle the payment in full — a balanced entry for the
  // wrong amount still leaves the payment and the ledger disagreeing.
  const matchesAmount = Math.round((totalDebits - payment.amount) * 100) === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Complete Payment — {payment.reference || payment.id}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {payment.recipient} · {payment.type} ·{" "}
              {formatCurrencyByGeneralSettings(payment.amount)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Post this payment to the general ledger
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Opened on the usual two lines. Add lines for anything else this
                payment carries — withholding tax, bank charges, a split across
                accounts.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">
                Posting Lines
              </label>
              <span className="text-xs text-gray-400">
                Debits must equal credits to post.
              </span>
            </div>
            {loading ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                Loading the Chart of Accounts…
              </p>
            ) : (
              <JournalLinesEditor
                lines={lines}
                onChange={onLinesChange}
                accounts={accounts}
              />
            )}
          </div>

          {balanced && !matchesAmount && (
            <p className="text-xs text-amber-600">
              This posting totals{" "}
              {formatCurrencyByGeneralSettings(totalDebits)} but the payment is{" "}
              {formatCurrencyByGeneralSettings(payment.amount)}. Post it only if
              the difference is deliberate.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Only a balanced posting updates the Chart of Accounts.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!balanced || posting || loading}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {posting ? "Posting…" : "Confirm & Post Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
