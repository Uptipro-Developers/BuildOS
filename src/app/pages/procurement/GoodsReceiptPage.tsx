import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PackageCheck,
  Search,
  ChevronDown,
  ChevronRight,
  XCircle,
  X,
  LinkIcon,
  FileEdit,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Send,
  Package,
} from "lucide-react";
import { notifyLoadFailure } from "../../utils/loadFailure";
import { getReferenceData } from "../../api/reference-data";
import {
  getGoodsReceipts,
  updateGoodsReceiptRecord,
  acceptGoodsReceipt,
  raiseGoodsReceiptRejectionNote,
  rejectGoodsReceipt,
  sendGoodsReceiptToFinance,
  notifyGoodsReceiptSupplier,
  type GoodsReceipt,
  type GoodsReceiptItem,
} from "../../api/goods-receipts";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote, RowActions } from "../../components/RowAction";
import { GOODS_RECEIPT_STATUS, statusDef } from "../../utils/procurementWorkflow";

/** Mirrors GoodsReceiptsService.timingBucket on the server. */
function paymentBucket(po?: GoodsReceipt["purchaseOrder"]): "before" | "after" | "both" {
  const tranches = po?.paymentTermSnapshot?.tranches ?? [];
  if (tranches.length === 0) return "after";
  const beforeCount = tranches.filter((t) => t.timing === "on_po_approval").length;
  if (beforeCount === 0) return "after";
  if (beforeCount === tranches.length) return "before";
  return "both";
}

function paymentTermLabel(po?: GoodsReceipt["purchaseOrder"]): string {
  const snap = po?.paymentTermSnapshot;
  const tranches = snap?.tranches ?? [];
  if (tranches.length > 0) return tranches.map((t) => `${t.percent}% ${t.title}`).join(" + ");
  return snap?.name || "—";
}

const DECIDED_STATUSES = ["partial_delivery", "over_supply", "under_supply", "fully_received"];

/** Nothing has been accepted before a decision, and nothing more before delivery. */
function canSendToFinance(grn: GoodsReceipt): boolean {
  if (!DECIDED_STATUSES.includes(grn.status)) return false;
  if (!grn.purchaseOrder || grn.purchaseOrder.sentToFinance) return false;
  return paymentBucket(grn.purchaseOrder) !== "before";
}

function hasOutstanding(grn: GoodsReceipt): boolean {
  return grn.items.some((it) => it.accepted < it.ordered);
}

function hasRejections(grn: GoodsReceipt): boolean {
  return grn.items.some((it) => it.rejected > 0 || (it.pendingRejected ?? 0) > 0);
}

/** What to show for a line — the not-yet-decided draft while one is pending, else the settled cumulative total. */
function displayQty(it: GoodsReceiptItem, usePending: boolean) {
  return usePending
    ? {
      received: it.pendingReceived ?? 0,
      accepted: it.pendingAccepted ?? 0,
      rejected: it.pendingRejected ?? 0,
      reason: it.pendingReason,
    }
    : { received: it.received, accepted: it.accepted, rejected: it.rejected, reason: it.reason };
}

const TABS: { key: string; label: string; match: (g: GoodsReceipt) => boolean }[] = [
  { key: "all", label: "All GRNs", match: () => true },
  { key: "pending", label: "Pending", match: (g) => g.status === "pending" || g.status === "pending_approval" },
  { key: "partial", label: "Partial", match: (g) => g.status === "partial_delivery" },
  { key: "completed", label: "Completed", match: (g) => g.status === "fully_received" },
  { key: "over_supply", label: "Over Supply", match: (g) => g.status === "over_supply" },
  { key: "under_supply", label: "Under Supply", match: (g) => g.status === "under_supply" },
  { key: "rejected", label: "Rejected", match: (g) => g.status === "rejected" },
];

/** One line as it is being keyed in the record form. */
interface ReceiveLineForm {
  material: string;
  unit: string;
  ordered: number;
  outstanding: number;
  received: string;
  accepted: string;
  rejected: string;
  reason: string;
}

type RecordMode = "record" | "edit" | "remaining";

/**
 * Records what arrived. Nothing here touches stock — Update Record, Edit
 * Record and Record Remaining Delivery all post to the same draft, decided
 * later by Accept & Update Stock.
 */
function RecordDeliveryModal({
  grn,
  mode,
  onClose,
  onDone,
}: {
  grn: GoodsReceipt;
  mode: RecordMode;
  onClose: () => void;
  onDone: (updated: GoodsReceipt) => void;
}) {
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState(grn.storeId ?? "");
  const [deliveryNote, setDeliveryNote] = useState(grn.deliveryNote ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<ReceiveLineForm[]>(() =>
    grn.items.map((it) => {
      const outstanding = Math.max(it.ordered - it.accepted, 0);
      const defaults =
        mode === "edit"
          ? {
            received: it.pendingReceived ?? 0,
            accepted: it.pendingAccepted ?? 0,
            rejected: it.pendingRejected ?? 0,
            reason: it.pendingReason ?? "",
          }
          : mode === "remaining"
            ? { received: outstanding, accepted: outstanding, rejected: 0, reason: "" }
            : { received: it.ordered, accepted: it.ordered, rejected: 0, reason: "" };
      return {
        material: it.material,
        unit: it.unit,
        ordered: it.ordered,
        outstanding,
        received: String(defaults.received),
        accepted: String(defaults.accepted),
        rejected: String(defaults.rejected),
        reason: defaults.reason,
      };
    }),
  );

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const list = (data.stores ?? []).map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
        }));
        setStores(list);
        setStoreId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => { });
  }, []);

  function update(i: number, key: keyof ReceiveLineForm, value: string) {
    setLines((prev) =>
      prev.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, [key]: value };
        if (key === "received" || key === "rejected") {
          const received = parseFloat(next.received) || 0;
          const rejected = parseFloat(next.rejected) || 0;
          next.accepted = String(Math.max(received - rejected, 0));
        }
        return next;
      }),
    );
  }

  const problems = lines.flatMap((l) => {
    const received = parseFloat(l.received) || 0;
    const accepted = parseFloat(l.accepted) || 0;
    const rejected = parseFloat(l.rejected) || 0;
    if (accepted + rejected > received)
      return [`${l.material}: accepted plus rejected exceeds what was received.`];
    if (rejected > 0 && !l.reason.trim())
      return [`${l.material}: give a reason for the rejected quantity.`];
    return [];
  });
  const anyReceived = lines.some((l) => (parseFloat(l.received) || 0) > 0);
  const valid = Boolean(storeId) && anyReceived && problems.length === 0;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const updated = await updateGoodsReceiptRecord(grn.id, {
        storeId,
        storeName: stores.find((s) => s.id === storeId)?.name ?? "",
        deliveryNote: deliveryNote.trim() || undefined,
        receivedBy: getAuthUserName() || "Current User",
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          material: l.material,
          unit: l.unit,
          received: parseFloat(l.received) || 0,
          accepted: parseFloat(l.accepted) || 0,
          rejected: parseFloat(l.rejected) || 0,
          reason: l.reason.trim() || undefined,
        })),
      });
      onDone(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the record.");
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === "edit" ? "Edit Record" : mode === "remaining" ? "Record Remaining Delivery" : "Update Record";
  const confirmLabel = saving
    ? "Saving…"
    : mode === "edit"
      ? "Save Changes"
      : mode === "remaining"
        ? "Record Delivery"
        : "Save Record";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {title} — {grn.reference}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {grn.supplierName} · purchase order {grn.poRef}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Receiving store <span className="text-red-500">*</span>
              </label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a store…</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Delivery note no.</label>
              <input
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="DN-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left px-3 py-2">Material</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2">Accepted</th>
                  <th className="px-3 py-2">Rejected</th>
                  <th className="px-3 py-2">Rejection reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l, i) => (
                  <tr key={`${l.material}-${i}`}>
                    <td className="px-3 py-1.5 font-medium text-gray-800">
                      {l.material}
                      <span className="text-gray-400 font-normal"> ({l.unit})</span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-600">
                      {l.ordered}
                      {mode === "remaining" && (
                        <p className="text-[11px] text-blue-600">{l.outstanding} outstanding</p>
                      )}
                    </td>
                    {(["received", "accepted", "rejected"] as const).map((k) => (
                      <td key={k} className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={l[k]}
                          onChange={(e) => update(i, k, e.target.value)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <input
                        value={l.reason}
                        onChange={(e) => update(i, "reason", e.target.value)}
                        placeholder={(parseFloat(l.rejected) || 0) > 0 ? "Required" : "If any rejections"}
                        className="w-40 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording about this delivery…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {problems.length > 0 && (
            <ul className="text-xs text-red-600 space-y-0.5">
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400">
            This only records what arrived — nothing is posted to stock until it is accepted.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={!valid || saving}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sends a pending record back for correction — the reject side of the decision. */
function RejectionNoteModal({
  grn,
  onClose,
  onDone,
}: {
  grn: GoodsReceipt;
  onClose: () => void;
  onDone: (updated: GoodsReceipt) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!reason.trim() || saving) return;
    setSaving(true);
    try {
      onDone(await raiseGoodsReceiptRejectionNote(grn.id, reason.trim()));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not raise the rejection note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Raise Rejection Note — {grn.reference}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-gray-500">
            Sends the record back to whoever recorded it, so it can be corrected. Nothing is posted to
            stock.
          </p>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What needs to be corrected?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={!reason.trim() || saving}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {saving ? "Sending…" : "Raise Rejection Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Notifies the supplier of an over- or under-supply, with an editable prefilled message. */
function NotifySupplierModal({
  grn,
  onClose,
  onDone,
}: {
  grn: GoodsReceipt;
  onClose: () => void;
  onDone: (updated: GoodsReceipt) => void;
}) {
  const kind = grn.status === "over_supply" ? "Over Supply" : grn.status === "under_supply" ? "Under Supply" : "Delivery Notice";
  const [email, setEmail] = useState(grn.purchaseOrder?.supplier?.email ?? "");
  const defaultMessage = useMemo(() => {
    const variances = grn.items
      .filter((it) => it.received !== it.ordered)
      .map((it) => {
        const variance = it.received - it.ordered;
        return `• ${it.material}: ordered ${it.ordered}, received ${it.received} (${variance > 0 ? "+" : ""}${variance})`;
      });
    return [
      `Dear ${grn.supplierName},`,
      "",
      `We are writing regarding ${grn.reference} against purchase order ${grn.poRef ?? ""} — we noted the following ${kind.toLowerCase()}:`,
      "",
      ...variances,
      "",
      "Kindly advise on how you wish to proceed.",
      "",
      "Regards,",
      "Procurement Team",
    ].join("\n");
  }, [grn, kind]);
  const [message, setMessage] = useState(defaultMessage);
  const [saving, setSaving] = useState(false);

  async function send() {
    if (!email.trim() || !message.trim() || saving) return;
    setSaving(true);
    try {
      onDone(await notifyGoodsReceiptSupplier(grn.id, { email: email.trim(), message: message.trim() }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the notification.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Notify Supplier — {kind}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 text-sm text-purple-700 font-medium">
            {grn.reference} · {grn.supplierName}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Supplier Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="procurement@supplier.ng"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void send()}
            disabled={!email.trim() || !message.trim() || saving}
            className="px-4 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-40 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {saving ? "Sending…" : "Send Notification"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A read-only view of the record — what arrived, against what was ordered. */
function GoodsReceiptDocumentModal({ grn, onClose }: { grn: GoodsReceipt; onClose: () => void }) {
  const usePending = grn.status === "pending_approval";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">Goods Received Note — {grn.reference}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: "Supplier", value: grn.supplierName },
              { label: "Purchase Order", value: grn.poRef || "—" },
              { label: "Material Request", value: grn.mrRef || "—" },
              { label: "Delivery Note", value: grn.deliveryNote || "—" },
              { label: "Store", value: grn.storeName || "—" },
              { label: "Payment Term", value: paymentTermLabel(grn.purchaseOrder) },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-gray-400">{f.label}</p>
                <p className="font-medium text-gray-900 mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[560px] w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {["Material", "Ordered", "Received", "Accepted", "Rejected", "Variance"].map((h) => (
                    <th key={h} className="px-3 py-2 text-xs font-medium text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grn.items.map((item) => {
                  const q = displayQty(item, usePending);
                  const variance = q.received - item.ordered;
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-gray-900">{item.material}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {item.ordered} {item.unit}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {q.received} {item.unit}
                      </td>
                      <td className="px-3 py-2 text-green-700 font-medium">
                        {q.accepted} {item.unit}
                      </td>
                      <td className="px-3 py-2">
                        {q.rejected > 0 ? (
                          <span className="text-red-600 font-medium">
                            {q.rejected} {item.unit}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {variance === 0 ? (
                          <span className="text-gray-400">Exact</span>
                        ) : variance > 0 ? (
                          <span className="text-purple-600 font-medium">+{variance} over</span>
                        ) : (
                          <span className="text-amber-600 font-medium">{variance} short</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {grn.notes && <p className="text-xs text-gray-500 whitespace-pre-line">{grn.notes}</p>}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoodsReceiptPage() {
  const [grnList, setGrnList] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [recordTarget, setRecordTarget] = useState<{ grn: GoodsReceipt; mode: RecordMode } | null>(null);
  const [rejectNoteTarget, setRejectNoteTarget] = useState<GoodsReceipt | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<GoodsReceipt | null>(null);
  const [documentTarget, setDocumentTarget] = useState<GoodsReceipt | null>(null);
  const [outrightRejectTarget, setOutrightRejectTarget] = useState<GoodsReceipt | null>(null);
  const [outrightRejectReason, setOutrightRejectReason] = useState("");

  const [accepting, setAccepting] = useState<string | null>(null);
  const [sendingToFinance, setSendingToFinance] = useState<string | null>(null);

  useEffect(() => {
    getGoodsReceipts()
      .then(setGrnList)
      .catch((err) => notifyLoadFailure("goods receipts", err))
      .finally(() => setLoading(false));
  }, []);

  function replace(updated: GoodsReceipt) {
    setGrnList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    return grnList.filter((g) => {
      const matchTab = tab.match(g);
      const matchSearch =
        !q ||
        g.reference.toLowerCase().includes(q) ||
        g.supplierName.toLowerCase().includes(q) ||
        (g.poRef ?? "").toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [grnList, activeTab, search]);

  async function handleAccept(grn: GoodsReceipt) {
    if (accepting) return;
    setAccepting(grn.id);
    try {
      const updated = await acceptGoodsReceipt(grn.id);
      replace(updated);
      toast.success(`${updated.reference} accepted and posted to stock.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept the record.");
    } finally {
      setAccepting(null);
    }
  }

  async function handleSendToFinance(grn: GoodsReceipt) {
    if (sendingToFinance) return;
    setSendingToFinance(grn.id);
    try {
      const updated = await sendGoodsReceiptToFinance(grn.id);
      replace(updated);
      toast.success(`${updated.poRef ?? grn.reference} sent to Finance.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send to Finance.");
    } finally {
      setSendingToFinance(null);
    }
  }

  async function confirmOutrightReject() {
    const grn = outrightRejectTarget;
    if (!grn) return;
    const reason = outrightRejectReason.trim();
    setOutrightRejectTarget(null);
    setOutrightRejectReason("");
    try {
      const updated = await rejectGoodsReceipt(grn.id, reason);
      replace(updated);
      toast.success(`${grn.reference} rejected. Nothing was added to stock.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reject the delivery.");
    }
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;

  const actionsFor = (grn: GoodsReceipt) => {
    const outstanding = hasOutstanding(grn);
    return (
      <RowActions>
        <RowAction
          icon={<FileText className="w-3.5 h-3.5" />}
          label="View Document"
          tone="neutral"
          onClick={() => setDocumentTarget(grn)}
        />
        {grn.status === "pending" && (
          <>
            <RowAction
              icon={<PackageCheck className="w-3.5 h-3.5" />}
              label="Update Record"
              tone="primary"
              onClick={() => setRecordTarget({ grn, mode: "record" })}
            />
            <RowAction
              icon={<XCircle className="w-3.5 h-3.5" />}
              label="Reject"
              tone="negative"
              onClick={() => setOutrightRejectTarget(grn)}
            />
          </>
        )}
        {grn.status === "pending_approval" && (
          <>
            <RowAction
              icon={<FileEdit className="w-3.5 h-3.5" />}
              label="Edit Record"
              tone="neutral"
              onClick={() => setRecordTarget({ grn, mode: "edit" })}
            />
            <RowAction
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="Raise Rejection Note"
              tone="negative"
              disabled={!grn.canDecide}
              title={grn.canDecide ? undefined : "Only the configured Goods Receipt approver may decide this record"}
              onClick={() => setRejectNoteTarget(grn)}
            />
            <RowAction
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Accept & Update Stock"
              tone="positive"
              disabled={!grn.canDecide}
              title={grn.canDecide ? undefined : "Only the configured Goods Receipt approver may decide this record"}
              busy={accepting === grn.id}
              busyLabel="Accepting…"
              onClick={() => void handleAccept(grn)}
            />
          </>
        )}
        {DECIDED_STATUSES.includes(grn.status) && (
          <>
            {outstanding && (
              <RowAction
                icon={<Package className="w-3.5 h-3.5" />}
                label="Record Remaining Delivery"
                tone="primary"
                onClick={() => setRecordTarget({ grn, mode: "remaining" })}
              />
            )}
            {(grn.status === "over_supply" || grn.status === "under_supply") && (
              <RowAction
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Notify Supplier"
                tone="warning"
                onClick={() => setNotifyTarget(grn)}
              />
            )}
            {grn.purchaseOrder?.sentToFinance ? (
              <RowActionNote>Sent to Finance</RowActionNote>
            ) : (
              canSendToFinance(grn) && (
                <RowAction
                  icon={<Send className="w-3.5 h-3.5" />}
                  label="Send to Finance"
                  tone="primary"
                  busy={sendingToFinance === grn.id}
                  busyLabel="Sending…"
                  onClick={() => void handleSendToFinance(grn)}
                />
              )
            )}
          </>
        )}
        {grn.status === "rejected" && <RowActionNote>Rejected</RowActionNote>}
      </RowActions>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Goods Receipt</h1>
        <p className="text-sm text-gray-500 mt-0.5">Receive confirmed purchase orders into stock</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const count = grnList.filter(tab.match).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}{" "}
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search GRNs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((grn) => {
          const cfg = statusDef(GOODS_RECEIPT_STATUS, grn.status);
          const isExpanded = expanded === grn.id;
          const usePending = grn.status === "pending_approval";
          return (
            <div key={grn.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExpanded ? null : grn.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{grn.reference}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      PO: {grn.poRef}
                    </span>
                    {grn.mrRef && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        MR: {grn.mrRef}
                      </span>
                    )}
                    <StatusBadge {...cfg} />
                    {grn.purchaseOrder?.sentToFinance && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        <Send className="w-3 h-3" /> Sent to Finance
                      </span>
                    )}
                    {hasRejections(grn) && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        <XCircle className="w-3 h-3" /> Rejections
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-1">{grn.supplierName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {grn.items.length} line item
                    {grn.items.length === 1 ? "" : "s"}
                    {grn.receivedBy ? ` · received by ${grn.receivedBy}` : ""}
                    {grn.deliveryNote ? ` · DN: ${grn.deliveryNote}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{grn.storeName || "—"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {grn.stockPostedAt
                      ? formatDateByGeneralSettings(grn.stockPostedAt)
                      : "Not yet received"}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>{actionsFor(grn)}</div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                    {[
                      { label: "GRN Number", value: grn.reference },
                      { label: "Purchase Order", value: grn.poRef || "—" },
                      { label: "Material Request", value: grn.mrRef || "—" },
                      { label: "Payment Term", value: paymentTermLabel(grn.purchaseOrder) },
                      { label: "Delivery Note", value: grn.deliveryNote || "—" },
                      { label: "Store", value: grn.storeName || "—" },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-500">{f.label}</p>
                        <p className="font-medium text-gray-900 mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-sm bg-white rounded-md border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left">
                          {["Material", "Ordered", "Received", "Accepted", "Rejected", "Variance", "Notes"].map(
                            (h) => (
                              <th key={h} className="px-3 py-2 text-xs font-medium text-gray-500">
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {grn.items.map((item) => {
                          const q = displayQty(item, usePending);
                          const variance = q.received - item.ordered;
                          return (
                            <tr key={item.id} className={q.rejected > 0 ? "bg-red-50/40" : ""}>
                              <td className="px-3 py-2 font-medium text-gray-900">{item.material}</td>
                              <td className="px-3 py-2 text-gray-600">
                                {item.ordered} {item.unit}
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {q.received} {item.unit}
                              </td>
                              <td className="px-3 py-2 text-green-700 font-medium">
                                {q.accepted} {item.unit}
                              </td>
                              <td className="px-3 py-2">
                                {q.rejected > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {q.rejected} {item.unit}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {grn.status === "pending" ? (
                                  <span className="text-gray-300 text-xs">—</span>
                                ) : variance === 0 ? (
                                  <span className="text-gray-400 text-xs">Exact</span>
                                ) : variance > 0 ? (
                                  <span className="text-purple-600 text-xs font-medium">
                                    +{variance} over
                                  </span>
                                ) : (
                                  <span className="text-amber-600 text-xs font-medium">
                                    {variance} short
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-400">{q.reason || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {grn.notes && (
                    <p className="text-xs text-gray-500 mt-3 whitespace-pre-line">{grn.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No goods receipts yet. Confirming a purchase order opens one.</p>
          </div>
        )}
      </div>

      {recordTarget && (
        <RecordDeliveryModal
          grn={recordTarget.grn}
          mode={recordTarget.mode}
          onClose={() => setRecordTarget(null)}
          onDone={(updated) => {
            replace(updated);
            setRecordTarget(null);
            toast.success(`${updated.reference} recorded — awaiting a decision.`);
          }}
        />
      )}

      {rejectNoteTarget && (
        <RejectionNoteModal
          grn={rejectNoteTarget}
          onClose={() => setRejectNoteTarget(null)}
          onDone={(updated) => {
            replace(updated);
            setRejectNoteTarget(null);
            toast.success(`${updated.reference} sent back for correction.`);
          }}
        />
      )}

      {notifyTarget && (
        <NotifySupplierModal
          grn={notifyTarget}
          onClose={() => setNotifyTarget(null)}
          onDone={(updated) => {
            replace(updated);
            setNotifyTarget(null);
            toast.success("Supplier notified.");
          }}
        />
      )}

      {documentTarget && (
        <GoodsReceiptDocumentModal grn={documentTarget} onClose={() => setDocumentTarget(null)} />
      )}

      {outrightRejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                Reject delivery — {outrightRejectTarget.reference}
              </h2>
              <button
                onClick={() => setOutrightRejectTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500">
                Nothing will be added to stock. The receipt stays on record against{" "}
                {outrightRejectTarget.poRef}.
              </p>
              <textarea
                rows={3}
                value={outrightRejectReason}
                onChange={(e) => setOutrightRejectReason(e.target.value)}
                placeholder="Why is this delivery being rejected?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setOutrightRejectTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmOutrightReject()}
                disabled={!outrightRejectReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
