import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PackageCheck,
  Search,
  ChevronDown,
  ChevronRight,
  XCircle,
  X,
  Plus,
  LinkIcon,
} from "lucide-react";
import { notifyLoadFailure } from "../../utils/loadFailure";
import { getReferenceData } from "../../api/reference-data";
import { fetchPurchaseOrders } from "../../api/purchase-orders";
import {
  getGoodsReceipts,
  openGoodsReceipt,
  receiveGoods,
  rejectGoodsReceipt,
  type GoodsReceipt,
} from "../../api/goods-receipts";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote, RowActions } from "../../components/RowAction";
import {
  GOODS_RECEIPT_STATUS,
  statusDef,
} from "../../utils/procurementWorkflow";

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "All GRNs" },
  { key: "pending", label: "Awaiting Receipt" },
  { key: "received", label: "Received" },
  { key: "rejected", label: "Rejected" },
];

/** One line as it is being keyed in the receive form. */
interface ReceiveLineForm {
  material: string;
  unit: string;
  ordered: number;
  received: string;
  accepted: string;
  rejected: string;
  reason: string;
}

/**
 * Records what arrived and posts it to stock.
 *
 * The quantities are keyed against the lines of the purchase order the receipt
 * was opened for, so a receipt can only ever be for something that was actually
 * ordered — the old form let a delivery be typed in from scratch, against a
 * free-text material and a hand-entered "ordered" figure, and then stored none
 * of it anywhere.
 */
function ReceiveDeliveryModal({
  grn,
  onClose,
  onDone,
}: {
  grn: GoodsReceipt;
  onClose: () => void;
  onDone: (updated: GoodsReceipt) => void;
}) {
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState(grn.storeId ?? "");
  const [deliveryNote, setDeliveryNote] = useState(grn.deliveryNote ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<ReceiveLineForm[]>(
    grn.items.map((it) => ({
      material: it.material,
      unit: it.unit,
      ordered: it.ordered,
      // Defaults to the full order, which is what usually turns up; anything
      // short or damaged is corrected line by line.
      received: String(it.ordered),
      accepted: String(it.ordered),
      rejected: "0",
      reason: "",
    })),
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
      .catch(() => {});
  }, []);

  function update(i: number, key: keyof ReceiveLineForm, value: string) {
    setLines((prev) =>
      prev.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, [key]: value };
        // Accepted follows received minus rejected unless it is being edited
        // directly, so the common case needs one number rather than three.
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
      const updated = await receiveGoods(grn.id, {
        storeId,
        storeName: stores.find((s) => s.id === storeId)?.name ?? "",
        deliveryNote: deliveryNote.trim() || undefined,
        receivedBy: getAuthUserName() || "Current User",
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          material: l.material,
          unit: l.unit,
          ordered: l.ordered,
          received: parseFloat(l.received) || 0,
          accepted: parseFloat(l.accepted) || 0,
          rejected: parseFloat(l.rejected) || 0,
          reason: l.reason.trim() || undefined,
        })),
      });
      onDone(updated);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not record the delivery.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Receive Delivery — {grn.reference}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {grn.supplierName} · purchase order {grn.poRef}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Receiving store <span className="text-red-500">*</span>
              </label>
              {/* Stock has to land somewhere specific: this store is what the
                  movement, the shelf quantity and the storefront all update
                  against. */}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Delivery note no.
              </label>
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
                        placeholder={
                          (parseFloat(l.rejected) || 0) > 0
                            ? "Required"
                            : "If any rejections"
                        }
                        className="w-40 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
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
            Accepted quantities are added to the chosen store and to the material
            catalogue, and recorded as an incoming stock movement against{" "}
            {grn.reference}. Rejected quantities are recorded but not added to
            stock.
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
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            {saving ? "Posting to stock…" : "Receive & Update Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Opens a receipt for a confirmed order that does not have one yet. */
function OpenReceiptModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (grn: GoodsReceipt) => void;
}) {
  const [orders, setOrders] = useState<
    { id: string; poRef: string; supplier: string }[]
  >([]);
  const [orderId, setOrderId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only confirmed orders: the goods are paid for and on their way, which is
    // the point at which a delivery can be expected.
    fetchPurchaseOrders({ status: "confirmed" })
      .then((rows) => {
        const list = rows.map((o) => ({
          id: o.id,
          poRef: o.poRef,
          supplier: o.supplier,
        }));
        setOrders(list);
        setOrderId((prev) => prev || list[0]?.id || "");
      })
      .catch((err) => notifyLoadFailure("purchase orders", err));
  }, []);

  async function save() {
    if (!orderId || saving) return;
    setSaving(true);
    try {
      onDone(await openGoodsReceipt(orderId));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not open the goods receipt.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Open a goods receipt
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-gray-500">
            Confirming a purchase order opens its receipt automatically. This is
            here for orders confirmed before that was the case.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Confirmed purchase order
            </label>
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {orders.length === 0
                  ? "No confirmed orders awaiting delivery"
                  : "Select an order…"}
              </option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.poRef} — {o.supplier}
                </option>
              ))}
            </select>
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
            onClick={() => void save()}
            disabled={!orderId || saving}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Opening…" : "Open receipt"}
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
  const [receiveGrn, setReceiveGrn] = useState<GoodsReceipt | null>(null);
  const [rejectGrn, setRejectGrn] = useState<GoodsReceipt | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showOpen, setShowOpen] = useState(false);

  useEffect(() => {
    getGoodsReceipts()
      .then(setGrnList)
      .catch((err) => notifyLoadFailure("goods receipts", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return grnList.filter((g) => {
      const matchTab = activeTab === "all" || g.status === activeTab;
      const matchSearch =
        !q ||
        g.reference.toLowerCase().includes(q) ||
        g.supplierName.toLowerCase().includes(q) ||
        (g.poRef ?? "").toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [grnList, activeTab, search]);

  async function confirmReject() {
    const grn = rejectGrn;
    if (!grn) return;
    const reason = rejectReason.trim();
    setRejectGrn(null);
    setRejectReason("");
    try {
      const updated = await rejectGoodsReceipt(grn.id, reason);
      setGrnList((prev) => prev.map((g) => (g.id === grn.id ? updated : g)));
      toast.success(`${grn.reference} rejected. Nothing was added to stock.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not reject the delivery.",
      );
    }
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Goods Receipt</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Receive confirmed purchase orders into stock
          </p>
        </div>
        <button
          onClick={() => setShowOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" /> Open Receipt
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total GRNs",
            value: grnList.length,
            color: "bg-gray-50 border-gray-200 text-gray-900",
          },
          {
            label: "Awaiting Receipt",
            value: grnList.filter((g) => g.status === "pending").length,
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Received",
            value: grnList.filter((g) => g.status === "received").length,
            color: "bg-emerald-50 border-emerald-200 text-emerald-700",
          },
          {
            label: "Rejected",
            value: grnList.filter((g) => g.status === "rejected").length,
            color: "bg-red-50 border-red-200 text-red-700",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg border ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? grnList.length
              : grnList.filter((g) => g.status === tab.key).length;
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
          const hasRejections = grn.items.some((i) => i.rejected > 0);
          return (
            <div
              key={grn.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExpanded ? null : grn.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {grn.reference}
                    </span>
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
                    {hasRejections && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        <XCircle className="w-3 h-3" /> Rejections
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    {grn.supplierName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {grn.items.length} line item
                    {grn.items.length === 1 ? "" : "s"}
                    {grn.receivedBy ? ` · received by ${grn.receivedBy}` : ""}
                    {grn.deliveryNote ? ` · DN: ${grn.deliveryNote}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {grn.storeName || "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {grn.stockPostedAt
                      ? formatDateByGeneralSettings(grn.stockPostedAt)
                      : "Not yet received"}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  {/* Receive or reject — nothing else. "Accept & Update Stock"
                      used to set a status in React state and touch no stock at
                      all; this posts the movement, the store shelf and the
                      material catalogue in one go. */}
                  <RowActions>
                    {grn.status === "pending" ? (
                      <>
                        <RowAction
                          icon={<PackageCheck className="w-3.5 h-3.5" />}
                          label="Receive & Update Stock"
                          tone="positive"
                          onClick={() => setReceiveGrn(grn)}
                        />
                        <RowAction
                          icon={<XCircle className="w-3.5 h-3.5" />}
                          label="Reject"
                          tone="negative"
                          onClick={() => setRejectGrn(grn)}
                        />
                      </>
                    ) : grn.status === "received" ? (
                      <RowActionNote>Posted to {grn.storeName}</RowActionNote>
                    ) : (
                      <RowActionNote>Rejected</RowActionNote>
                    )}
                  </RowActions>
                </div>
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
                      { label: "Delivery Note", value: grn.deliveryNote || "—" },
                      { label: "Store", value: grn.storeName || "—" },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-500">{f.label}</p>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-sm bg-white rounded-md border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left">
                          {[
                            "Material",
                            "Ordered",
                            "Received",
                            "Accepted",
                            "Rejected",
                            "Variance",
                            "Notes",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-xs font-medium text-gray-500"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {grn.items.map((item) => {
                          const variance = item.received - item.ordered;
                          return (
                            <tr
                              key={item.id}
                              className={item.rejected > 0 ? "bg-red-50/40" : ""}
                            >
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {item.material}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {item.ordered} {item.unit}
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {item.received} {item.unit}
                              </td>
                              <td className="px-3 py-2 text-green-700 font-medium">
                                {item.accepted} {item.unit}
                              </td>
                              <td className="px-3 py-2">
                                {item.rejected > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {item.rejected} {item.unit}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {grn.status === "pending" ? (
                                  <span className="text-gray-300 text-xs">—</span>
                                ) : variance === 0 ? (
                                  <span className="text-gray-400 text-xs">
                                    Exact
                                  </span>
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
                              <td className="px-3 py-2 text-xs text-gray-400">
                                {item.reason || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {grn.notes && (
                    <p className="text-xs text-gray-500 mt-3 whitespace-pre-line">
                      {grn.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              No goods receipts yet. Confirming a purchase order opens one.
            </p>
          </div>
        )}
      </div>

      {receiveGrn && (
        <ReceiveDeliveryModal
          grn={receiveGrn}
          onClose={() => setReceiveGrn(null)}
          onDone={(updated) => {
            setGrnList((prev) =>
              prev.map((g) => (g.id === updated.id ? updated : g)),
            );
            setReceiveGrn(null);
            toast.success(`${updated.reference} received into ${updated.storeName}.`, {
              description:
                "Stock movement recorded, and the material is now available in inventory.",
            });
          }}
        />
      )}

      {showOpen && (
        <OpenReceiptModal
          onClose={() => setShowOpen(false)}
          onDone={(grn) => {
            setGrnList((prev) =>
              prev.some((g) => g.id === grn.id) ? prev : [grn, ...prev],
            );
            setShowOpen(false);
          }}
        />
      )}

      {rejectGrn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                Reject delivery — {rejectGrn.reference}
              </h2>
              <button
                onClick={() => setRejectGrn(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500">
                Nothing will be added to stock. The receipt stays on record
                against {rejectGrn.poRef}.
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this delivery being rejected?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setRejectGrn(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmReject()}
                disabled={!rejectReason.trim()}
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
