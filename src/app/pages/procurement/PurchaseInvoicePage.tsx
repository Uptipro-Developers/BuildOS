import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Banknote,
  Ban,
  BookOpen,
  CreditCard,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useChangelog } from "../../stores/changelogStore";
import {
  getPurchaseInvoices,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  cancelPurchaseInvoice,
  sendPurchaseInvoiceForApproval,
  PurchaseInvoice as ApiPurchaseInvoice,
} from "../../api/procurement-requests";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote, RowActions } from "../../components/RowAction";
import {
  PURCHASE_INVOICE_STATUS,
  statusDef,
  type PurchaseInvoiceStatus,
} from "../../utils/procurementWorkflow";
import {
  JournalLinesEditor,
  journalTotals,
  type JournalLineInput,
} from "../../components/JournalLinesEditor";
import {
  findAccount,
  loadPostableAccounts,
  postJournalEntry,
} from "../../utils/postJournalEntry";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  csvAmountHeader,
  getCurrencySymbol,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

/**
 * The finance side of a purchase order.
 *
 * An invoice arrives here because Procurement sent the order to Finance, so it
 * opens at `pending_review` — there is no draft, and nothing to "submit". From
 * there it moves through the Purchase Invoices approval workflow
 * (`pending_approval` → `approved`/`rejected`) before it can be posted, and
 * posting is what takes it to `paid`.
 */
type InvoiceStatus = PurchaseInvoiceStatus;

interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

/** The accounting treatment decided when an invoice is sent for approval. */
interface PostingDraft {
  date: string;
  method: string;
  lines: JournalLineInput[];
}

interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  supplier: string;
  poRef: string;
  poRefRaw: string;
  total: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  /** Set once the invoice is sent for approval; read-only once posted. */
  postingDraft: PostingDraft | null;
}

function fromApi(r: ApiPurchaseInvoice): PurchaseInvoice {
  return {
    id: r.id,
    invoiceNo: r.invoiceNo,
    supplier: r.supplierName,
    poRef: r.poRef ?? "",
    issueDate: r.invoiceDate,
    dueDate: r.dueDate,
    status: (String(r.status ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_") || "pending_review") as InvoiceStatus,
    /** Set when the invoice came from a purchase order, which is the normal case. */
    poRefRaw: r.poRef ?? "",
    total: r.total ?? 0,
    lines: Array.isArray(r.lines)
      ? (
        r.lines as {
          id?: string;
          description?: string;
          qty?: number;
          unit?: string;
          unitPrice?: number;
        }[]
      ).map((l) => ({
        id: l.id ?? Math.random().toString(36).slice(2),
        description: l.description ?? "",
        qty: l.qty ?? 0,
        unit: l.unit ?? "Units",
        unitPrice: l.unitPrice ?? 0,
      }))
      : [],
    postingDraft:
      r.postingDraft && Array.isArray(r.postingDraft.lines)
        ? {
          date: r.postingDraft.date ?? "",
          method: r.postingDraft.method ?? "",
          lines: (
            r.postingDraft.lines as {
              id?: string;
              glCode?: string;
              account?: string;
              debit?: number;
              credit?: number;
              description?: string;
            }[]
          ).map((l) => ({
            id: l.id ?? Math.random().toString(36).slice(2),
            glCode: l.glCode ?? "",
            account: l.account ?? "",
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            description: l.description ?? "",
          })),
        }
        : null,
  };
}

function lineTotal(lines: InvoiceLine[]) {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

function fmt(n: number) {
  return getCurrencySymbol() + formatNumberByGeneralSettings(n);
}

// Overdue is a fact about the date, not a status somebody sets.
function isOverdue(inv: PurchaseInvoice) {
  return (
    inv.status !== "paid" &&
    inv.status !== "cancelled" &&
    Boolean(inv.dueDate) &&
    new Date(inv.dueDate).getTime() < Date.now()
  );
}

/**
 * What Finance owes the supplier right now.
 *
 * Nothing is due until an invoice clears approval — before that it is still
 * under review and could come back rejected, so it cannot yet be treated as
 * money owed. Once approved (or paid, which implies it was), the full amount
 * is due; a payment records against it but does not partially settle it, so
 * the balance clears to zero the same moment it becomes due.
 */
function amountDue(inv: PurchaseInvoice) {
  const total = lineTotal(inv.lines);
  return inv.status === "approved" || inv.status === "paid" ? total : 0;
}

function balanceOf(inv: PurchaseInvoice) {
  const total = lineTotal(inv.lines);
  return inv.status === "approved" || inv.status === "paid" ? 0 : total;
}

/** A line's share of the invoice's Amount Due, following the same rule. */
function lineDue(line: InvoiceLine, inv: PurchaseInvoice) {
  return inv.status === "approved" || inv.status === "paid"
    ? line.qty * line.unitPrice
    : 0;
}

const BLANK_LINE = (): InvoiceLine => ({
  id: Math.random().toString(36).slice(2),
  description: "",
  qty: 1,
  unit: "Units",
  unitPrice: 0,
});

const BLANK_FORM = {
  invoiceNo: "",
  supplier: "",
  poRef: "",
  issueDate: "",
  dueDate: "",
  status: "pending_review" as InvoiceStatus,
  lines: [BLANK_LINE()],
};

/**
 * Decides the accounting treatment, then sends the invoice for approval.
 *
 * The approver is approving the actual journal entry this will become, not
 * just the invoice — so the treatment is fixed here, before approval, and
 * posting later only executes it. Settling a payable is always the same
 * double-entry — debit the payable, credit the bank — so the lines open
 * pre-filled and only need changing when the payment is unusual.
 */
function PostingDraftModal({
  invoice,
  total,
  onClose,
  onConfirm,
}: {
  invoice: PurchaseInvoice;
  total: number;
  onClose: () => void;
  onConfirm: (payload: {
    date: string;
    method: string;
    lines: JournalLineInput[];
  }) => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<{ code: string; name: string }[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Bank Transfer");
  const [lines, setLines] = useState<JournalLineInput[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadPostableAccounts()
      .then((list) => {
        setAccounts(list);
        // Seeded from the organisation's own Chart of Accounts, by name — the
        // codes are whatever was configured here, not the ones in seed data.
        const payable = findAccount(list, "accounts payable", "payable");
        const cash = findAccount(list, "cash & bank", "bank", "cash");
        setLines([
          {
            id: "pay-dr",
            glCode: payable?.code ?? "",
            account: payable?.name ?? "",
            debit: total,
            credit: 0,
            description: `Settle ${invoice.invoiceNo} — ${invoice.supplier}`,
          },
          {
            id: "pay-cr",
            glCode: cash?.code ?? "",
            account: cash?.name ?? "",
            debit: 0,
            credit: total,
            description: `Payment to ${invoice.supplier}`,
          },
        ]);
      })
      .catch(() => {
        toast.error("Could not load the Chart of Accounts.");
      });
  }, [invoice.invoiceNo, invoice.supplier, total]);

  const { balanced } = journalTotals(lines);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Send for Approval — {invoice.invoiceNo}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoice.supplier} ·{" "}
              {invoice.dueDate
                ? `Due ${formatDateByGeneralSettings(invoice.dueDate)}`
                : "No due date"}{" "}
              · {fmt(total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Send className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Decide the accounting treatment, then send for approval
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Whoever the Purchase Invoices workflow names as approver will
                see and approve this exact journal entry. Posting later only
                executes it — it cannot be changed once approved.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {["Bank Transfer", "Cheque", "Cash", "Mobile Payment"].map(
                  (m) => (
                    <option key={m}>{m}</option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Reference
              </label>
              {/* Locked to the invoice: a payment that cites a different
                  reference cannot be matched back to what it settled. */}
              <input
                value={invoice.invoiceNo}
                readOnly
                tabIndex={-1}
                className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-default focus:outline-none"
              />
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
            <JournalLinesEditor
              lines={lines}
              onChange={setLines}
              accounts={accounts}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Only a balanced entry can be sent for approval.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!balanced || sending) return;
                setSending(true);
                try {
                  await onConfirm({ date, method, lines });
                } finally {
                  setSending(false);
                }
              }}
              disabled={!balanced || sending}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-40 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending…" : "Send for Approval"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Previews the treatment already decided at Send for Approval, then posts it.
 *
 * Normally nothing is editable here — the journal entry was fixed and
 * approved before this invoice ever reached "approved". But an invoice can
 * reach "approved" with no draft on file (it predates this flow, or was
 * approved by a path that never asked for one), and there is no way back to
 * Send for Approval from here — so when that happens, this falls back to the
 * same editable entry the old Post modal offered, rather than a dead end.
 */
function PostPreviewModal({
  invoice,
  total,
  posting,
  onClose,
  onConfirm,
}: {
  invoice: PurchaseInvoice;
  total: number;
  posting: boolean;
  onClose: () => void;
  onConfirm: (payload?: { date: string; method: string; lines: JournalLineInput[] }) => void;
}) {
  const draft = invoice.postingDraft;

  const [accounts, setAccounts] = useState<{ code: string; name: string }[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Bank Transfer");
  const [lines, setLines] = useState<JournalLineInput[]>([]);

  useEffect(() => {
    if (draft) return;
    loadPostableAccounts()
      .then((list) => {
        setAccounts(list);
        const payable = findAccount(list, "accounts payable", "payable");
        const cash = findAccount(list, "cash & bank", "bank", "cash");
        setLines([
          {
            id: "pay-dr",
            glCode: payable?.code ?? "",
            account: payable?.name ?? "",
            debit: total,
            credit: 0,
            description: `Settle ${invoice.invoiceNo} — ${invoice.supplier}`,
          },
          {
            id: "pay-cr",
            glCode: cash?.code ?? "",
            account: cash?.name ?? "",
            debit: 0,
            credit: total,
            description: `Payment to ${invoice.supplier}`,
          },
        ]);
      })
      .catch(() => {
        toast.error("Could not load the Chart of Accounts.");
      });
    // Only the fallback (no-draft) path needs accounts/default lines at all.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, invoice.invoiceNo, invoice.supplier, total]);

  const { balanced } = journalTotals(lines);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Post Invoice — {invoice.invoiceNo}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoice.supplier} ·{" "}
              {invoice.dueDate
                ? `Due ${formatDateByGeneralSettings(invoice.dueDate)}`
                : "No due date"}{" "}
              · {fmt(total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {draft ? (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Posting the treatment approved with this invoice
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    This is the accounting treatment decided when the invoice
                    was sent for approval. It cannot be changed here — posting
                    it updates the Chart of Accounts and marks the purchase
                    order paid in Procurement.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Payment Date
                  </label>
                  <p className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                    {formatDateByGeneralSettings(draft.date) || draft.date || "—"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Payment Method
                  </label>
                  <p className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                    {draft.method || "—"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Reference
                  </label>
                  <p className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-500">
                    {invoice.invoiceNo}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Posting Lines
                </label>
                <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-medium">Account</th>
                        <th className="px-3 py-2 text-right font-medium">Debit</th>
                        <th className="px-3 py-2 text-right font-medium">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {draft.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 text-gray-700">{l.account || "—"}</td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {l.debit ? fmt(l.debit) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {l.credit ? fmt(l.credit) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    No posting treatment on file
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This invoice was approved without going through Send for
                    Approval's posting step, so nothing was decided in
                    advance. Fill it in here to post.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {["Bank Transfer", "Cheque", "Cash", "Mobile Payment"].map(
                      (m) => (
                        <option key={m}>{m}</option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Reference
                  </label>
                  <input
                    value={invoice.invoiceNo}
                    readOnly
                    tabIndex={-1}
                    className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-default focus:outline-none"
                  />
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
                <JournalLinesEditor
                  lines={lines}
                  onChange={setLines}
                  accounts={accounts}
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Posting updates the Chart of Accounts and marks the purchase order paid.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(draft ? undefined : { date, method, lines })}
              disabled={posting || (!draft && !balanced)}
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

export function PurchaseInvoicePage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">(
    "All",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseInvoice | null>(null);
  /** The invoice about to be sent for approval, which opens the posting-draft modal. */
  const [approvalTarget, setApprovalTarget] = useState<PurchaseInvoice | null>(
    null,
  );
  /** Id of the invoice being decided, so a decision cannot be double-fired. */
  const [deciding, setDeciding] = useState<string | null>(null);
  /** The invoice being paid, which opens the posting modal. */
  const [payTarget, setPayTarget] = useState<PurchaseInvoice | null>(null);
  /** Whether a post is in flight, so the confirm button can't double-fire. */
  const [posting, setPosting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM, lines: [BLANK_LINE()] });
  /**
   * A working copy of the expanded invoice's lines, editable only while it is
   * still Pending Review — once it is sent for approval the figures behind
   * that approval must not move under it.
   */
  const [editingLines, setEditingLines] = useState<InvoiceLine[] | null>(null);
  const [savingLines, setSavingLines] = useState<string | null>(null);
  const { logChange } = useChangelog();

  useEffect(() => {
    getPurchaseInvoices()
      .then((data) => setInvoices(data.map(fromApi)))
      .catch((err) => notifyLoadFailure("purchase invoices", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!expanded) {
      setEditingLines(null);
      return;
    }
    const inv = invoices.find((i) => i.id === expanded);
    setEditingLines(
      inv && inv.status === "pending_review"
        ? inv.lines.map((l) => ({ ...l }))
        : null,
    );
    // Re-seeding on every `invoices` change would stomp in-progress edits the
    // instant an unrelated row updates; the expanded invoice's own lines only
    // change here as a result of a save this effect itself should re-seed
    // from, so keying on `expanded` alone is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplier.toLowerCase().includes(search.toLowerCase()) ||
      inv.poRef.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, BLANK_LINE()] }));
  }

  function removeLine(id: string) {
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.id !== id) }));
  }

  function updateLine(
    id: string,
    key: keyof InvoiceLine,
    value: string | number,
  ) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => (l.id === id ? { ...l, [key]: value } : l)),
    }));
  }

  async function saveInvoice() {
    try {
      const created = await createPurchaseInvoice({
        invoiceNo: form.invoiceNo,
        supplierName: form.supplier,
        poRef: form.poRef,
        invoiceDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        lines: form.lines,
      });
      setInvoices((prev) => [fromApi(created), ...prev]);
      logChange({ module: "Procurement", action: "Created", entityType: "PurchaseInvoice", entityId: created.id, summary: `Invoice ${form.invoiceNo} created — ${form.supplier}`, performedBy: "Current User" });
      toast.success(`Invoice ${form.invoiceNo} created.`);
    } catch (e) {
      // Only console.error before: the modal closed on failure and the invoice
      // was simply absent from the list.
      toast.error(
        e instanceof Error ? e.message : "Could not create the invoice.",
      );
      return;
    }
    setShowModal(false);
    setForm({ ...BLANK_FORM, lines: [BLANK_LINE()] });
  }

  /**
   * Records the decision and keeps Procurement in step.
   *
   * Only "paid" is set through here now — accept/reject happens through the
   * Purchase Invoices approval workflow, not this page. The server still moves
   * the linked purchase order at the same time, so the two modules cannot
   * disagree about where the money is.
   */
  async function updateStatus(
    id: string,
    newStatus: InvoiceStatus,
    notes?: string,
  ) {
    if (deciding) return;
    const previous = invoices;
    setDeciding(id);
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv)),
    );
    try {
      await updatePurchaseInvoice(id, { status: newStatus, notes });
      const invoice = previous.find((inv) => inv.id === id);
      logChange({
        module: "Finance",
        action: "StatusChanged",
        entityType: "PurchaseInvoice",
        entityId: id,
        summary: `Invoice ${invoice?.invoiceNo ?? id} ${newStatus.replace("_", " ")}`,
        performedBy: "Current User",
      });
      const reflected = invoice?.poRefRaw
        ? ` Purchase order ${invoice.poRefRaw} updated in Procurement.`
        : "";
      if (newStatus === "paid") toast.success(`Payment recorded.${reflected}`);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not update the invoice. Please try again.",
      );
      setInvoices(previous);
    } finally {
      setDeciding(null);
    }
  }

  /**
   * Saves the chosen accounting treatment and moves the invoice into the
   * approval workflow.
   *
   * No decision is made here — this only puts the invoice, and the journal
   * entry it will become, in front of whoever the Purchase Invoices workflow
   * names as approver. Posting stays disabled until that approval lands, and
   * then only replays this same treatment rather than letting it be redecided.
   */
  async function sendForApproval(
    id: string,
    draft: { date: string; method: string; lines: JournalLineInput[] },
  ) {
    if (deciding) return;
    setDeciding(id);
    try {
      const updated = await sendPurchaseInvoiceForApproval(id, draft);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? fromApi(updated) : inv)),
      );
      logChange({
        module: "Finance",
        action: "StatusChanged",
        entityType: "PurchaseInvoice",
        entityId: id,
        summary: `Invoice ${updated.invoiceNo} sent for approval`,
        performedBy: "Current User",
      });
      toast.success("Invoice sent for approval.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not send the invoice for approval.",
      );
    } finally {
      setDeciding(null);
    }
  }

  /** Persists the edited unit prices for the expanded, still-Pending-Review invoice. */
  async function saveLineEdits(id: string) {
    if (!editingLines) return;
    setSavingLines(id);
    const newTotal = lineTotal(editingLines);
    try {
      const updated = await updatePurchaseInvoice(id, {
        lines: editingLines,
        subtotal: newTotal,
        total: newTotal,
      });
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? fromApi(updated) : inv)),
      );
      toast.success("Unit prices updated.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save the changes.",
      );
    } finally {
      setSavingLines(null);
    }
  }

  /**
   * Posts the treatment already approved with this invoice, then marks it paid.
   *
   * In that order, and only in that order: marking it paid is what tells
   * Procurement the money has gone, so it must not happen unless the posting
   * actually reached the ledger. Normally the date/method/lines are whatever
   * was decided and approved at Send for Approval; `override` is only ever
   * set for an invoice that reached "approved" with no draft on file, whose
   * modal fell back to letting the user fill it in there instead.
   */
  async function confirmPay(override?: {
    date: string;
    method: string;
    lines: JournalLineInput[];
  }) {
    const inv = payTarget;
    const draft = override ?? inv?.postingDraft;
    if (!inv || !draft || posting) return;
    setPosting(true);
    try {
      const entry = await postJournalEntry({
        description: `Payment to ${inv.supplier} — ${inv.invoiceNo}`,
        date: draft.date,
        createdBy: getAuthUserName() || "Current User",
        lines: draft.lines,
        // The invoice number is the payment reference throughout: it is what
        // the General Ledger cites, and what a ledger line traces back through
        // to reach this invoice.
        reference: inv.invoiceNo,
        sourceModule: "Purchase",
        sourceType: "PurchaseInvoice",
        sourceId: inv.id,
      });
      setPayTarget(null);
      await updateStatus(
        inv.id,
        "paid",
        `Paid via ${draft.method}. Posted to the ledger as ${entry.reference}.`,
      );
      logChange({
        module: "Finance",
        action: "Posted",
        entityType: "JournalEntry",
        entityId: entry.id,
        summary: `Payment for ${inv.invoiceNo} posted as ${entry.reference}`,
        performedBy: getAuthUserName() || "Current User",
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not post the payment.",
      );
    } finally {
      setPosting(false);
    }
  }

  async function confirmCancel() {
    const inv = cancelTarget;
    if (!inv) return;
    setCancelTarget(null);
    const previous = invoices;
    setInvoices((prev) =>
      prev.map((x) =>
        x.id === inv.id ? { ...x, status: "cancelled" as InvoiceStatus } : x,
      ),
    );
    try {
      await cancelPurchaseInvoice(inv.id, "Cancelled in Finance.");
      logChange({
        module: "Finance",
        action: "Cancelled",
        entityType: "PurchaseInvoice",
        entityId: inv.id,
        summary: `Invoice ${inv.invoiceNo} cancelled`,
        performedBy: "Current User",
      });
      toast.success(`Invoice ${inv.invoiceNo} cancelled.`);
    } catch (e) {
      setInvoices(previous);
      toast.error(
        e instanceof Error ? e.message : "Could not cancel the invoice.",
      );
    }
  }

  function handleExport() {
    exportCSV(
      "purchase-invoices",
      [
        "Invoice No",
        "Supplier",
        "PO Ref",
        "Issue Date",
        "Due Date",
        csvAmountHeader("Amount"),
        "Status",
      ],
      invoices.map((inv) => [
        inv.invoiceNo,
        inv.supplier,
        inv.poRef,
        formatDateByGeneralSettings(inv.issueDate),
        formatDateByGeneralSettings(inv.dueDate),
        lineTotal(inv.lines),
        inv.status,
      ]),
    );
  }

  /**
   * The decisions Finance actually makes on a supplier invoice.
   *
   * Send it for approval, then — once approved — post it. Posting writes back
   * to the purchase order in Procurement, so the order stops saying "Unpaid"
   * once the money has gone. Delete used to be the action on a *paid* invoice,
   * which is the one row that must never disappear: it is the record that the
   * payment happened, and removing it leaves the order pointing at nothing.
   * Cancel replaces it, and is refused once the invoice is paid.
   */
  const actionsFor = (inv: PurchaseInvoice) => (
    <RowActions>
      {inv.status === "pending_review" && (
        <RowAction
          icon={<Send className="w-3.5 h-3.5" />}
          label="Send for approval"
          tone="primary"
          disabled={deciding === inv.id}
          onClick={() => setApprovalTarget(inv)}
        />
      )}
      {inv.status === "pending_approval" && (
        <>
          <RowAction
            icon={<Banknote className="w-3.5 h-3.5" />}
            label="Post"
            tone="positive"
            disabled
            title="Waiting on approval"
            onClick={() => { }}
          />
          <RowActionNote>Awaiting approval</RowActionNote>
        </>
      )}
      {inv.status === "approved" && (
        <>
          <RowAction
            icon={<Banknote className="w-3.5 h-3.5" />}
            label="Post"
            tone="positive"
            disabled={deciding === inv.id}
            onClick={() => setPayTarget(inv)}
          />
          <RowAction
            icon={<Ban className="w-3.5 h-3.5" />}
            label="Cancel"
            tone="negative"
            disabled={deciding === inv.id}
            onClick={() => setCancelTarget(inv)}
          />
        </>
      )}
      {inv.status === "rejected" && (
        <RowActionNote>Returned to Procurement</RowActionNote>
      )}
      {inv.status === "paid" && <RowActionNote>Settled</RowActionNote>}
      {inv.status === "cancelled" && <RowActionNote>Cancelled</RowActionNote>}
    </RowActions>
  );

  /** The line items panel shown beneath a row once its Lines chevron is opened. */
  function renderLineItemsPanel(inv: PurchaseInvoice) {
    const editable = Boolean(editingLines) && inv.status === "pending_review";
    const displayLines = editable ? editingLines! : inv.lines;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Line Items — {inv.invoiceNo}
          </h3>
          <span className="text-xs text-gray-400">
            {inv.dueDate ? `Due ${formatDateByGeneralSettings(inv.dueDate)}` : ""}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <th className="pb-2 text-left font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit</th>
              <th className="pb-2 text-right font-medium">
                Finance Unit Price{editable ? " *" : ""}
              </th>
              <th className="pb-2 text-right font-medium">Line Total</th>
              <th className="pb-2 text-right font-medium">Line Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayLines.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-gray-700">{l.description}</td>
                <td className="py-2 text-right text-gray-600">{l.qty}</td>
                <td className="py-2 text-right text-gray-500">{l.unit}</td>
                <td className="py-2 text-right text-gray-600">
                  {editable ? (
                    <input
                      type="number"
                      min={0}
                      value={l.unitPrice}
                      onChange={(e) =>
                        setEditingLines((prev) =>
                          prev
                            ? prev.map((pl) =>
                              pl.id === l.id
                                ? { ...pl, unitPrice: Number(e.target.value) }
                                : pl,
                            )
                            : prev,
                        )
                      }
                      className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    fmt(l.unitPrice)
                  )}
                </td>
                <td className="py-2 text-right font-medium text-gray-900">
                  {fmt(l.qty * l.unitPrice)}
                </td>
                <td className="py-2 text-right font-medium text-red-600">
                  {fmt(lineDue(l, inv))}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="pt-3 text-right font-semibold text-gray-700 text-sm">
                Total
              </td>
              <td className="pt-3 text-right font-bold text-gray-900">
                {fmt(lineTotal(displayLines))}
              </td>
              <td className="pt-3 text-right font-bold text-red-600">
                {fmt(amountDue({ ...inv, lines: displayLines }))}
              </td>
            </tr>
          </tbody>
        </table>
        {editable ? (
          <div className="flex items-center justify-between pt-3">
            <p className="text-xs text-gray-400">
              Finance adjusts the unit price here to impute the payment per
              item; totals, Amount Due and Balance update live.
            </p>
            <button
              onClick={() => void saveLineEdits(inv.id)}
              disabled={savingLines === inv.id}
              className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 shrink-0"
            >
              {savingLines === inv.id ? "Saving…" : "Save Prices"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const columns: Column<PurchaseInvoice>[] = [
    {
      key: "invoiceNo",
      label: "Invoice No",
      sortable: true,
      filterable: true,
      // The supplier numbers their own invoices, so an invoice number says
      // nothing about which order it bills for. The purchase order reference
      // goes underneath it, in the same "from <upstream ref>" form the purchase
      // order column uses for its purchase request and the purchase request
      // column uses for its material request.
      render: (inv) => (
        <div>
          <span className="font-mono text-xs text-gray-700">
            {inv.invoiceNo}
          </span>
          {inv.poRef && (
            <p className="text-xs text-gray-400">from {inv.poRef}</p>
          )}
        </div>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      sortable: true,
      filterable: true,
      render: (inv) => <span className="font-medium text-gray-900">{inv.supplier}</span>,
    },
    {
      key: "description",
      label: "Description",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (inv) => <span className="text-sm text-gray-600">{inv.lines.map(l => l.description).join(", ")}</span>,
    },
    {
      key: "amount",
      label: "Amount ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (inv) => <span className="font-semibold text-gray-900">{fmt(lineTotal(inv.lines))}</span>,
    },
    {
      key: "amountDue",
      label: "Amount Due",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (inv) => <span className="text-gray-700">{fmt(amountDue(inv))}</span>,
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (inv) => <span className="text-gray-500">{fmt(balanceOf(inv))}</span>,
    },
    {
      key: "date",
      label: "Due Date",
      sortable: true,
      // Overdue is a fact about the date, not a status somebody sets — the old
      // "Overdue" status had to be assigned by hand and so never was.
      render: (inv) => {
        const overdue = isOverdue(inv);
        return (
          <span
            className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}
            title={overdue ? "Past its due date" : undefined}
          >
            {/* The API serves these as ISO timestamps; rendering one raw put
                "2026-03-01T00:00:00.000Z" in the column while every sibling
                page showed the configured date format. */}
            {formatDateByGeneralSettings(inv.dueDate) || "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      // Overdue overrides whatever the invoice's own status is — it is a fact
      // about the date, not a state Finance chose to leave it in.
      render: (inv) =>
        isOverdue(inv) ? (
          <StatusBadge
            label="Overdue"
            badge="bg-red-100 text-red-700"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
        ) : (
          <StatusBadge {...statusDef(PURCHASE_INVOICE_STATUS, inv.status)} />
        ),
    },
    {
      key: "lines",
      label: "Lines",
      sortable: false,
      filterable: false,
      className: "text-center",
      headerClassName: "text-center",
      render: (inv) => (
        <button
          type="button"
          onClick={() => setExpanded((p) => (p === inv.id ? null : inv.id))}
          title={expanded === inv.id ? "Hide line items" : "Show line items"}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          {expanded === inv.id ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      headerClassName: "text-right",
      render: (inv) => actionsFor(inv),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage supplier invoices
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setForm({ ...BLANK_FORM, lines: [BLANK_LINE()] }); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-xl text-sm hover:bg-blue-800">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(
          [
            {
              key: "pending_review",
              label: statusDef(PURCHASE_INVOICE_STATUS, "pending_review").label,
              badge: statusDef(PURCHASE_INVOICE_STATUS, "pending_review").badge,
              match: (i: PurchaseInvoice) => i.status === "pending_review",
            },
            {
              key: "pending_approval",
              label: statusDef(PURCHASE_INVOICE_STATUS, "pending_approval").label,
              badge: statusDef(PURCHASE_INVOICE_STATUS, "pending_approval").badge,
              match: (i: PurchaseInvoice) => i.status === "pending_approval",
            },
            {
              key: "approved",
              label: statusDef(PURCHASE_INVOICE_STATUS, "approved").label,
              badge: statusDef(PURCHASE_INVOICE_STATUS, "approved").badge,
              match: (i: PurchaseInvoice) => i.status === "approved",
            },
            {
              key: "overdue",
              label: "Overdue",
              badge: "bg-red-100 text-red-700",
              match: isOverdue,
            },
          ] as const
        ).map((tile) => {
          const matching = invoices.filter(tile.match);
          const total = matching.reduce((acc, i) => acc + lineTotal(i.lines), 0);
          return (
            <div
              key={tile.key}
              className={`p-4 rounded-xl border ${tile.badge} border-current/20 bg-white`}
            >
              <p className="text-2xl font-bold">{matching.length}</p>
              <p className="text-xs font-medium mt-0.5">{tile.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{fmt(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["All", ...Object.keys(PURCHASE_INVOICE_STATUS)] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as InvoiceStatus | "All")}
                className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${statusFilter === f ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
              >
                {f === "All"
                  ? "All"
                  : statusDef(PURCHASE_INVOICE_STATUS, f).label}
              </button>
            ),
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={inv => inv.id}
        searchPlaceholder="Search invoices..."
        searchFields={[inv => inv.invoiceNo, inv => inv.supplier, inv => inv.poRef]}
        emptyMessage="No invoices found"
        isExpanded={(inv) => inv.id === expanded}
        renderExpanded={renderLineItemsPanel}
        headerExtra={
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            <FileText className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                New Purchase Invoice
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Invoice Number
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="INV-XXXX-0001"
                    value={form.invoiceNo}
                    onChange={(e) =>
                      setForm({ ...form, invoiceNo: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Supplier
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Supplier name"
                    value={form.supplier}
                    onChange={(e) =>
                      setForm({ ...form, supplier: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    PO Reference
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PO-2025-XXX"
                    value={form.poRef}
                    onChange={(e) =>
                      setForm({ ...form, poRef: e.target.value })
                    }
                  />
                </div>
                {/* No status picker: an invoice keyed here is one a supplier
                    sent in, so it opens Pending Review like every other. The
                    dropdown let it be created already Approved, skipping the
                    review it exists to receive. */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.issueDate}
                    onChange={(e) =>
                      setForm({ ...form, issueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Line Items
                  </p>
                  <button
                    onClick={addLine}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((l) => (
                    <div
                      key={l.id}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <input
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Description"
                          value={l.description}
                          onChange={(e) =>
                            updateLine(l.id, "description", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Qty"
                          value={l.qty}
                          onChange={(e) =>
                            updateLine(l.id, "qty", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Unit"
                          value={l.unit}
                          onChange={(e) =>
                            updateLine(l.id, "unit", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={0}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Price"
                          value={l.unitPrice}
                          onChange={(e) =>
                            updateLine(
                              l.id,
                              "unitPrice",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          disabled={form.lines.length === 1}
                          onClick={() => removeLine(l.id)}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <span className="text-sm font-semibold text-gray-700">
                    Total:{" "}
                    {fmt(
                      form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveInvoice}
                disabled={!form.invoiceNo.trim() || !form.supplier.trim()}
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50"
              >
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalTarget && (
        <PostingDraftModal
          invoice={approvalTarget}
          total={lineTotal(approvalTarget.lines) || approvalTarget.total}
          onClose={() => setApprovalTarget(null)}
          onConfirm={async (payload) => {
            const target = approvalTarget;
            setApprovalTarget(null);
            await sendForApproval(target.id, payload);
          }}
        />
      )}

      {payTarget && (
        <PostPreviewModal
          invoice={payTarget}
          total={lineTotal(payTarget.lines) || payTarget.total}
          posting={posting}
          onClose={() => setPayTarget(null)}
          onConfirm={(override) => void confirmPay(override)}
        />
      )}

      <ConfirmationModal
        isOpen={!!cancelTarget}
        title="Cancel invoice?"
        description={`Cancel invoice "${cancelTarget?.invoiceNo ?? ""}"? It stays on record and the purchase order goes back to Procurement. A paid invoice cannot be cancelled.`}
        confirmLabel="Cancel invoice"
        isDangerous
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
