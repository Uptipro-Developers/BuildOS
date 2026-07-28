import { useEffect, useState } from "react";
import {
  PackageCheck,
  Search,
  Truck,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  XCircle,
  X,
  Plus,
  Trash2,
  LinkIcon,
} from "lucide-react";
import { getReferenceData } from "../../api/reference-data";
import { fetchPurchaseOrders } from "../../api/purchase-orders";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { useNumbering } from "../../stores/numberingStore";

type GRNStatus = "pending" | "partial" | "completed" | "over_supply";

type GRNRecord = {
  id: string;
  poRef: string;
  mrRef: string;
  supplier: string;
  receivedBy: string;
  receivedDate: string;
  status: GRNStatus;
  warehouse: string;
  deliveryNote: string;
  items: {
    material: string;
    ordered: number;
    received: number;
    accepted: number;
    rejected: number;
    unit: string;
    reason?: string;
  }[];
};

const tabs: { key: GRNStatus | "all"; label: string }[] = [
  { key: "all", label: "All GRNs" },
  { key: "pending", label: "Pending" },
  { key: "partial", label: "Partial" },
  { key: "completed", label: "Completed" },
  { key: "over_supply", label: "Over Supply" },
];

const statusConfig: Record<
  GRNStatus,
  { label: string; badge: string; border: string; icon: string }
> = {
  pending: {
    label: "Pending",
    badge: "bg-amber-100 text-amber-700",
    border: "border-amber-200",
    icon: "Clock",
  },
  partial: {
    label: "Partial",
    badge: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
    icon: "Package",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
    icon: "CheckCircle2",
  },
  over_supply: {
    label: "Over Supply",
    badge: "bg-red-100 text-red-700",
    border: "border-red-200",
    icon: "AlertTriangle",
  },
};

const GRN_UNITS = [
  "Bags",
  "Units",
  "Metres",
  "Tonnes",
  "Sheets",
  "Rolls",
  "Litres",
  "Cartons",
];

interface GRNItem {
  material: string;
  ordered: string;
  received: string;
  accepted: string;
  rejected: string;
  unit: string;
  reason: string;
}

function RecordDeliveryModal({
  onClose,
  onSave,
  existingGrn,
}: {
  onClose: () => void;
  onSave: (grn: GRNRecord) => void;
  existingGrn?: GRNRecord;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const isAdditional = !!existingGrn;

  const [poRef, setPoRef] = useState(existingGrn?.poRef || "");
  const [poRefs, setPoRefs] = useState<string[]>([]);
  const [supplier, setSupplier] = useState(existingGrn?.supplier || "");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState(existingGrn?.warehouse || "");
  const [deliveryNote, setDeliveryNote] = useState("");

  // Load open purchase orders for the PO reference dropdown.
  useEffect(() => {
    fetchPurchaseOrders()
      .then((orders) => {
        const refs = (orders as any[])
          .map((o) => String(o.poNumber ?? o.reference ?? o.id ?? ""))
          .filter(Boolean);
        setPoRefs(refs);
        setPoRef((prev) => prev || refs[0] || "");
      })
      .catch(() => {
        /* leave dropdown empty on failure */
      });
  }, []);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const storeNames = data.stores.map((s) => s.name);
        setWarehouses(storeNames);
        setWarehouse(
          (prev) => prev || existingGrn?.warehouse || storeNames[0] || "",
        );
      })
      .catch(() => {});
  }, [existingGrn?.warehouse]);

  const [items, setItems] = useState<GRNItem[]>(
    existingGrn
      ? existingGrn.items
          .filter((it) => it.received < it.ordered)
          .map((it) => ({
            material: it.material,
            ordered: String(it.ordered),
            received: "",
            accepted: "",
            rejected: "0",
            unit: it.unit,
            reason: "",
          }))
      : [
          {
            material: "",
            ordered: "",
            received: "",
            accepted: "",
            rejected: "0",
            unit: GRN_UNITS[0],
            reason: "",
          },
        ],
  );

  const addItem = () =>
    setItems((p) => [
      ...p,
      {
        material: "",
        ordered: "",
        received: "",
        accepted: "",
        rejected: "0",
        unit: GRN_UNITS[0],
        reason: "",
      },
    ]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof GRNItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const { getNextId } = useNumbering();
  const valid =
    poRef &&
    deliveryNote.trim() &&
    items.every((it) => it.material.trim() && it.received.trim());

  function handleSave() {
    if (!valid) return;
    const nextId = getNextId("GoodsReceipt");
    const builtItems = items.map((it) => ({
      material: it.material,
      ordered: parseFloat(it.ordered) || 0,
      received: parseFloat(it.received) || 0,
      accepted: parseFloat(it.accepted || it.received) || 0,
      rejected: parseFloat(it.rejected) || 0,
      unit: it.unit,
      ...(it.reason.trim() ? { reason: it.reason.trim() } : {}),
    }));
    const allComplete = builtItems.every((it) => it.received >= it.ordered);
    const hasOver = builtItems.some((it) => it.received > it.ordered);
    const status: GRNStatus = hasOver
      ? "over_supply"
      : allComplete
        ? "completed"
        : "partial";
    onSave({
      id: nextId,
      poRef,
      mrRef: "",
      supplier: supplier.trim() || poRef,
      receivedBy: "Chukwudi Eze",
      receivedDate: fmtDate(today),
      status,
      warehouse,
      deliveryNote: deliveryNote.trim(),
      items: builtItems,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {isAdditional
              ? `Additional Delivery — ${existingGrn!.id}`
              : "Record New Delivery"}
          </h2>
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
                Purchase Order Ref <span className="text-red-500">*</span>
              </label>
              {isAdditional ? (
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  {poRef}
                </div>
              ) : (
                <select
                  value={poRef}
                  onChange={(e) => setPoRef(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select PO…</option>
                  {poRefs.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Supplier
              </label>
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Auto-filled from PO"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Delivery Note No. <span className="text-red-500">*</span>
              </label>
              <input
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="DN-XXXX-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Warehouse / Location
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {warehouses.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Delivery Items <span className="text-red-500">*</span>
              </label>
              {!isAdditional && (
                <button
                  onClick={addItem}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left px-3 py-2">Material</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Ordered</th>
                    <th className="px-3 py-2">Received</th>
                    <th className="px-3 py-2">Accepted</th>
                    <th className="px-3 py-2">Rejected</th>
                    <th className="px-3 py-2">Rejection Reason</th>
                    {!isAdditional && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">
                        {isAdditional ? (
                          <span className="text-sm font-medium text-gray-800">
                            {item.material}
                          </span>
                        ) : (
                          <input
                            value={item.material}
                            onChange={(e) =>
                              updateItem(i, "material", e.target.value)
                            }
                            placeholder="Material name"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(i, "unit", e.target.value)
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {GRN_UNITS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.ordered}
                          onChange={(e) =>
                            updateItem(i, "ordered", e.target.value)
                          }
                          placeholder="0"
                          readOnly={isAdditional}
                          className={`w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${isAdditional ? "bg-gray-50" : ""}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.received}
                          onChange={(e) =>
                            updateItem(i, "received", e.target.value)
                          }
                          placeholder="0"
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.accepted}
                          onChange={(e) =>
                            updateItem(i, "accepted", e.target.value)
                          }
                          placeholder={item.received || "0"}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.rejected}
                          onChange={(e) =>
                            updateItem(i, "rejected", e.target.value)
                          }
                          placeholder="0"
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.reason}
                          onChange={(e) =>
                            updateItem(i, "reason", e.target.value)
                          }
                          placeholder="If any rejections"
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      {!isAdditional && (
                        <td className="px-2 py-1.5">
                          {items.length > 1 && (
                            <button
                              onClick={() => removeItem(i)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4" /> Save Delivery Record
          </button>
        </div>
      </div>
    </div>
  );
}

function RaiseRejectionModal({
  grn,
  onClose,
  onDone,
}: {
  grn: GRNRecord;
  onClose: () => void;
  onDone: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [returnMethod, setReturnMethod] = useState("Supplier Pickup");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Raise Rejection Note — {grn.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
            <span className="font-medium text-red-800">{grn.id}</span> ·{" "}
            <span className="text-red-700">{grn.supplier}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Rejected Items
            </p>
            {grn.items
              .filter((it) => it.rejected > 0)
              .map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-gray-800">
                    {it.material}
                  </span>
                  <span className="text-red-600">
                    {it.rejected} {it.unit}
                  </span>
                  {it.reason && (
                    <span className="text-gray-400">— {it.reason}</span>
                  )}
                </div>
              ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Return Method
            </label>
            <select
              value={returnMethod}
              onChange={(e) => setReturnMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[
                "Supplier Pickup",
                "Credit Note Requested",
                "Replacement Requested",
                "Disposed On-Site",
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Additional Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Additional details about the rejection…"
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
            onClick={() =>
              reason.trim() && onDone(`${returnMethod}: ${reason.trim()}`)
            }
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Raise Note
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifySupplierModal({
  grn,
  onClose,
  onDone,
}: {
  grn: GRNRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const overItems = grn.items.filter((it) => it.received > it.ordered);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Dear ${grn.supplier},\n\nWe received your delivery (${grn.deliveryNote}) and noted the following over-supply:\n\n${overItems.map((it) => `• ${it.material}: ordered ${it.ordered}, received ${it.received} ${it.unit} (+${it.received - it.ordered})`).join("\n")}\n\nKindly advise on how you wish to proceed.\n\nRegards,\nProcurement Team`,
  );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Notify Supplier — Over Supply
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm">
            <span className="font-medium text-purple-800">{grn.id}</span> ·{" "}
            <span className="text-purple-700">{grn.supplier}</span>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
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
            onClick={() => email.trim() && onDone()}
            disabled={!email.trim()}
            className="px-4 py-2 text-sm bg-purple-700 text-white rounded-xl hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> Send Notification
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoodsReceiptPage() {
  const [grnList, setGrnList] = useState<GRNRecord[]>([]);
  const [activeTab, setActiveTab] = useState<GRNStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [additionalDelivery, setAdditionalDelivery] =
    useState<GRNRecord | null>(null);
  const [rejectGrn, setRejectGrn] = useState<GRNRecord | null>(null);
  const [notifyGrn, setNotifyGrn] = useState<GRNRecord | null>(null);

  const filtered = grnList.filter((g) => {
    const matchTab = activeTab === "all" || g.status === activeTab;
    const matchSearch =
      g.id.toLowerCase().includes(search.toLowerCase()) ||
      g.supplier.toLowerCase().includes(search.toLowerCase()) ||
      g.poRef.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Goods Receipt
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Receive, inspect, and record deliveries against Purchase Orders
          </p>
        </div>
        <button
          onClick={() => setShowNewDelivery(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <PackageCheck className="w-3.5 h-3.5" /> Record New Delivery
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total GRNs",
            value: grnList.length,
            color: "bg-gray-50 border-gray-200 text-gray-900",
          },
          {
            label: "Pending Inspection",
            value: grnList.filter((g) => g.status === "pending").length,
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Partial Deliveries",
            value: grnList.filter((g) => g.status === "partial").length,
            color: "bg-blue-50 border-blue-200 text-blue-700",
          },
          {
            label: "Completed",
            value: grnList.filter((g) => g.status === "completed").length,
            color: "bg-green-50 border-green-200 text-green-700",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg border ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? grnList.length
              : grnList.filter((g) => g.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
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
          placeholder="Search GRNs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* GRN Cards */}
      <div className="space-y-3">
        {filtered.map((grn) => {
          const cfg = statusConfig[grn.status] ?? {
            badge: "bg-gray-100 text-gray-700",
            icon: null,
            label: String(grn.status ?? "Unknown"),
          };
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
                      {grn.id}
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
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    {hasRejections && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                        <XCircle className="w-3 h-3" /> Rejections
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    {grn.supplier}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Received by {grn.receivedBy} · {grn.items.length} line item
                    {grn.items.length > 1 ? "s" : ""} · DN: {grn.deliveryNote}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {grn.warehouse}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {grn.receivedDate}
                  </p>
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
                      { label: "GRN Number", value: grn.id },
                      { label: "Purchase Order", value: grn.poRef },
                      { label: "Material Request", value: grn.mrRef || "—" },
                      { label: "Delivery Note", value: grn.deliveryNote },
                      { label: "Warehouse", value: grn.warehouse },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-500">{f.label}</p>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <table className="w-full text-sm bg-white rounded-md border border-gray-200 mb-4">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-left">
                        <th className="px-3 py-2 text-xs font-medium text-gray-500">
                          Material
                        </th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                          Ordered
                        </th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                          Received
                        </th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                          Accepted
                        </th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                          Rejected
                        </th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500">
                          Variance
                        </th>
                        <th className="px-3 py-2 text-xs font-medium text-gray-500">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {grn.items.map((item, i) => {
                        const variance = item.received - item.ordered;
                        return (
                          <tr
                            key={i}
                            className={`hover:bg-gray-50 ${item.rejected > 0 ? "bg-red-50/40" : ""}`}
                          >
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {item.material}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {item.ordered} {item.unit}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {item.received} {item.unit}
                            </td>
                            <td className="px-3 py-2 text-right text-green-700 font-medium">
                              {item.accepted} {item.unit}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {item.rejected > 0 ? (
                                <span className="text-red-600 font-medium">
                                  {item.rejected} {item.unit}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {variance === 0 ? (
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
                  <div className="flex justify-end gap-2">
                    {grn.status === "pending" && (
                      <>
                        <button
                          onClick={() => setRejectGrn(grn)}
                          className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                        >
                          Raise Rejection Note
                        </button>
                        <button
                          onClick={() =>
                            setGrnList((prev) =>
                              prev.map((g) =>
                                g.id === grn.id
                                  ? { ...g, status: "completed" as const }
                                  : g,
                              ),
                            )
                          }
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Accept &
                          Update Stock
                        </button>
                      </>
                    )}
                    {grn.status === "partial" && (
                      <button
                        onClick={() => setAdditionalDelivery(grn)}
                        className="px-4 py-2 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800 flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Record Remaining
                        Delivery
                      </button>
                    )}
                    {grn.status === "over_supply" && (
                      <button
                        onClick={() => setNotifyGrn(grn)}
                        className="px-4 py-2 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600"
                      >
                        Notify Supplier
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNewDelivery && (
        <RecordDeliveryModal
          onClose={() => setShowNewDelivery(false)}
          onSave={(grn) => {
            setGrnList((prev) => [grn, ...prev]);
            setShowNewDelivery(false);
          }}
        />
      )}
      {additionalDelivery && (
        <RecordDeliveryModal
          existingGrn={additionalDelivery}
          onClose={() => setAdditionalDelivery(null)}
          onSave={(grn) => {
            setGrnList((prev) => [grn, ...prev]);
            setAdditionalDelivery(null);
          }}
        />
      )}
      {rejectGrn && (
        <RaiseRejectionModal
          grn={rejectGrn}
          onClose={() => setRejectGrn(null)}
          onDone={(_reason) => {
            setGrnList((prev) =>
              prev.map((g) =>
                g.id === rejectGrn.id
                  ? { ...g, status: "completed" as const }
                  : g,
              ),
            );
            setRejectGrn(null);
          }}
        />
      )}
      {notifyGrn && (
        <NotifySupplierModal
          grn={notifyGrn}
          onClose={() => setNotifyGrn(null)}
          onDone={() => setNotifyGrn(null)}
        />
      )}
    </div>
  );
}
