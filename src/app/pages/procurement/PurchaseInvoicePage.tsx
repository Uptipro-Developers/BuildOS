import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Banknote,
  Ban,
  Eye,
  BookOpen,
  CreditCard,
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
 * opens at `pending_review` — there is no draft, and nothing to "submit". The
 * old set (Draft → Pending Approval → Approved → Paid, plus Overdue) described
 * a document Finance authored itself, which is not where these come from.
 */
type InvoiceStatus = PurchaseInvoiceStatus;

interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
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
}

const STATUS_ORDER: InvoiceStatus[] = [
  "pending_review",
  "accepted",
  "paid",
  "declined",
];

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
  };
}

function lineTotal(lines: InvoiceLine[]) {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

function fmt(n: number) {
  return getCurrencySymbol() + formatNumberByGeneralSettings(n);
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
 * Records the payment and posts it to the ledger, in one step.
 *
 * Paying was a status flip: the invoice went to Paid and nothing reached the
 * Chart of Accounts, so the money left the business without an accounting entry
 * behind it. Settling a payable is always the same double-entry — debit the
 * payable, credit the bank — so the lines open pre-filled and only need
 * changing when the payment is unusual.
 */
function PayInvoiceModal({
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
  const [posting, setPosting] = useState(false);

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
              Pay Invoice — {invoice.invoiceNo}
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
            <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Post this payment to the general ledger
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Recording the payment posts a balanced double-entry to the Chart
                of Accounts, and marks the purchase order paid in Procurement.
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
              onClick={async () => {
                if (!balanced || posting) return;
                setPosting(true);
                try {
                  await onConfirm({ date, method, lines });
                } finally {
                  setPosting(false);
                }
              }}
              disabled={!balanced || posting}
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
  const [declineTarget, setDeclineTarget] = useState<PurchaseInvoice | null>(
    null,
  );
  const [declineReason, setDeclineReason] = useState("");
  /** Id of the invoice being decided, so a decision cannot be double-fired. */
  const [deciding, setDeciding] = useState<string | null>(null);
  /** The invoice being paid, which opens the posting modal. */
  const [payTarget, setPayTarget] = useState<PurchaseInvoice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM, lines: [BLANK_LINE()] });
  const { logChange } = useChangelog();

  useEffect(() => {
    getPurchaseInvoices()
      .then((data) => setInvoices(data.map(fromApi)))
      .catch((err) => notifyLoadFailure("purchase invoices", err))
      .finally(() => setLoading(false));
  }, []);

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
   * The server moves the linked purchase order at the same time — accepted,
   * declined or paid — so the two modules cannot disagree about where the money
   * is. Previously Finance could approve and pay an invoice and the order in
   * Procurement still read "Unpaid" forever, because nothing joined them.
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
      if (newStatus === "accepted")
        toast.success(`Invoice accepted.${reflected}`);
      if (newStatus === "declined")
        toast.success(`Invoice declined.${reflected}`);
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
   * Posts the payment, then marks the invoice paid.
   *
   * In that order, and only in that order: marking it paid is what tells
   * Procurement the money has gone, so it must not happen unless the posting
   * actually reached the ledger.
   */
  async function confirmPay(payload: {
    date: string;
    method: string;
    lines: JournalLineInput[];
  }) {
    const inv = payTarget;
    if (!inv) return;
    try {
      const entry = await postJournalEntry({
        description: `Payment to ${inv.supplier} — ${inv.invoiceNo}`,
        date: payload.date,
        createdBy: getAuthUserName() || "Current User",
        lines: payload.lines,
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
        `Paid via ${payload.method}. Posted to the ledger as ${entry.reference}.`,
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
   * Accept or decline it, then pay it — and each of those writes back to the
   * purchase order in Procurement, so the order stops saying "Unpaid" once the
   * money has gone. Delete used to be the action on a *paid* invoice, which is
   * the one row that must never disappear: it is the record that the payment
   * happened, and removing it leaves the order pointing at nothing. Cancel
   * replaces it, and is refused once the invoice is paid.
   */
  const actionsFor = (inv: PurchaseInvoice) => (
    <RowActions>
      <RowAction
        icon={<Eye className="w-3.5 h-3.5" />}
        label="View"
        tone="primary"
        onClick={() => setExpanded((p) => (p === inv.id ? null : inv.id))}
      />
      {inv.status === "pending_review" && (
        <>
          <RowAction
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label="Accept"
            tone="positive"
            busy={deciding === inv.id}
            busyLabel="Accepting…"
            onClick={() => void updateStatus(inv.id, "accepted")}
          />
          <RowAction
            icon={<XCircle className="w-3.5 h-3.5" />}
            label="Decline"
            tone="negative"
            disabled={deciding === inv.id}
            onClick={() => setDeclineTarget(inv)}
          />
        </>
      )}
      {inv.status === "accepted" && (
        <>
          <RowAction
            icon={<Banknote className="w-3.5 h-3.5" />}
            label="Pay"
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
      {inv.status === "declined" && (
        <RowActionNote>Returned to Procurement</RowActionNote>
      )}
      {inv.status === "paid" && <RowActionNote>Settled</RowActionNote>}
      {inv.status === "cancelled" && <RowActionNote>Cancelled</RowActionNote>}
    </RowActions>
  );

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
      key: "date",
      label: "Due Date",
      sortable: true,
      // Overdue is a fact about the date, not a status somebody sets — the old
      // "Overdue" status had to be assigned by hand and so never was.
      render: (inv) => {
        const overdue =
          inv.status !== "paid" &&
          inv.status !== "cancelled" &&
          Boolean(inv.dueDate) &&
          new Date(inv.dueDate).getTime() < Date.now();
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
      render: (inv) => (
        <StatusBadge {...statusDef(PURCHASE_INVOICE_STATUS, inv.status)} />
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
        {STATUS_ORDER.map((s) => {
          const count = invoices.filter((i) => i.status === s).length;
          const total = invoices
            .filter((i) => i.status === s)
            .reduce((acc, i) => acc + lineTotal(i.lines), 0);
          return (
            <div
              key={s}
              className={`p-4 rounded-xl border ${statusDef(PURCHASE_INVOICE_STATUS, s).badge} border-current/20 bg-white`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5">
                {statusDef(PURCHASE_INVOICE_STATUS, s).label}
              </p>
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
        headerExtra={
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            <FileText className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      {/* Expanded line items */}
      {expanded && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          {invoices.filter(inv => inv.id === expanded).map(inv => (
            <div key={inv.id}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Line Items — {inv.invoiceNo}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                    <th className="pb-2 text-left font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit</th>
                    <th className="pb-2 text-right font-medium">Unit Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inv.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 text-gray-700">{l.description}</td>
                      <td className="py-2 text-right text-gray-600">{l.qty}</td>
                      <td className="py-2 text-right text-gray-500">{l.unit}</td>
                      <td className="py-2 text-right text-gray-600">{fmt(l.unitPrice)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{fmt(l.qty * l.unitPrice)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="pt-3 text-right font-semibold text-gray-700 text-sm">Total</td>
                    <td className="pt-3 text-right font-bold text-gray-900">{fmt(lineTotal(inv.lines))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

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

      {/* Declining sends the order back to Procurement, so it has to say why —
          otherwise the buyer is told "no" with nothing to act on. */}
      {declineTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                Decline {declineTarget.invoiceNo}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {declineTarget.supplier}
                {declineTarget.poRefRaw
                  ? ` · purchase order ${declineTarget.poRefRaw}`
                  : ""}
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="What needs to change before this can be paid?"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeclineTarget(null);
                  setDeclineReason("");
                }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!declineReason.trim()}
                onClick={() => {
                  const target = declineTarget;
                  const reason = declineReason.trim();
                  setDeclineTarget(null);
                  setDeclineReason("");
                  void updateStatus(target.id, "declined", reason);
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40"
              >
                Decline invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <PayInvoiceModal
          invoice={payTarget}
          total={lineTotal(payTarget.lines) || payTarget.total}
          onClose={() => setPayTarget(null)}
          onConfirm={confirmPay}
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
