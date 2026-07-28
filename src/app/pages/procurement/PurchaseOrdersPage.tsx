import { useState, useEffect } from "react";
import { fetchPurchaseOrders } from "../../api/purchase-orders";
import { getReferenceData } from "../../api/reference-data";
import {
  getCurrencySymbol,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";
import {
  ShoppingCart,
  Plus,
  FileText,
  Truck,
  CheckCircle,
  XCircle,
  Send,
  X,
  Trash2,
  CreditCard,
  Building2,
  DownloadCloud,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { exportCSV } from "../../utils/exportCSV";
import { useNumbering } from "../../stores/numberingStore";

type POStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "partially_received"
  | "completed"
  | "cancelled";
type PaymentStatus = "unpaid" | "confirmation_requested" | "paid";

interface PurchaseOrder {
  id: string;
  prRef: string;
  mrRef: string;
  supplier: string;
  supplierContact: string;
  status: POStatus;
  paymentStatus: PaymentStatus;
  sentToFinance: boolean;
  financeRef?: string;
  createdBy: string;
  createdDate: string;
  expectedDate: string;
  totalItems: number;
  totalValue: number;
  receivedValue: number;
  items: {
    material: string;
    qty: number;
    unit: string;
    unitCost: number;
    received: number;
  }[];
}

const PAYMENT_STATUS_CFG: Record<
  PaymentStatus,
  { label: string; badge: string }
> = {
  unpaid: { label: "Unpaid", badge: "bg-gray-100 text-gray-500" },
  confirmation_requested: {
    label: "Payment Requested",
    badge: "bg-amber-100 text-amber-700",
  },
  paid: { label: "Paid", badge: "bg-green-100 text-green-700" },
};

const statusConfig: Record<
  POStatus,
  { label: string; badge: string; icon: React.ReactNode; step: number }
> = {
  draft: {
    label: "Draft",
    badge: "bg-gray-100 text-gray-600",
    icon: <FileText className="w-3.5 h-3.5" />,
    step: 1,
  },
  sent: {
    label: "Sent to Supplier",
    badge: "bg-blue-100 text-blue-700",
    icon: <Send className="w-3.5 h-3.5" />,
    step: 2,
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    step: 3,
  },
  partially_received: {
    label: "Partially Received",
    badge: "bg-amber-100 text-amber-700",
    icon: <Truck className="w-3.5 h-3.5" />,
    step: 4,
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    step: 5,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5" />,
    step: 0,
  },
};

const tabs: { key: POStatus | "all"; label: string }[] = [
  { key: "all", label: "All POs" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "confirmed", label: "Confirmed" },
  { key: "partially_received", label: "Partial Receipt" },
  { key: "completed", label: "Completed" },
];

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

const PO_UNITS = [
  "Tonnes",
  "Bags",
  "Metres",
  "Sheets",
  "Rolls",
  "Units",
  "Cartons",
  "Litres",
];

interface POItem {
  material: string;
  qty: string;
  unit: string;
  unitCost: string;
}

function NewPOModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (po: PurchaseOrder) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };

  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [supplier, setSupplier] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [prRef, setPrRef] = useState("");
  const [project, setProject] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const [items, setItems] = useState<POItem[]>([
    { material: "", qty: "", unit: PO_UNITS[0], unitCost: "" },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const supplierNames = data.suppliers.map((s) => s.name);
        const projectNames = data.projects.map((p) => p.name);
        setSuppliers(supplierNames);
        setProjects(projectNames);
        setSupplier((prev) => prev || supplierNames[0] || "");
        setProject((prev) => prev || projectNames[0] || "");
      })
      .catch(() => {});
  }, []);

  const addItem = () =>
    setItems((p) => [
      ...p,
      { material: "", qty: "", unit: PO_UNITS[0], unitCost: "" },
    ]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof POItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const totalValue = items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitCost) || 0),
    0,
  );
  const { getNextId } = useNumbering();
  const valid =
    supplier &&
    items.every(
      (it) => it.material.trim() && it.qty.trim() && it.unitCost.trim(),
    );

  function handleSave() {
    if (!valid) return;
    const nextId = getNextId("PurchaseOrder");
    onSave({
      id: nextId,
      prRef: prRef.trim() || "—",
      mrRef: "—",
      supplier,
      supplierContact: supplierContact.trim() || supplier,
      status: "draft",
      paymentStatus: "unpaid",
      sentToFinance: false,
      createdBy: "Amaka Osei",
      createdDate: fmtDate(today),
      expectedDate: addDays(parseInt(deliveryDays) || 7),
      totalItems: items.length,
      totalValue,
      receivedValue: 0,
      items: items.map((it) => ({
        material: it.material,
        qty: parseFloat(it.qty) || 0,
        unit: it.unit,
        unitCost: parseFloat(it.unitCost) || 0,
        received: 0,
      })),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            New Purchase Order
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
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {suppliers.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Supplier Contact
              </label>
              <input
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder="Name — +234 …"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                PR Reference
              </label>
              <input
                value={prRef}
                onChange={(e) => setPrRef(e.target.value)}
                placeholder="PR-0019"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Project
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Expected Delivery (days)
              </label>
              <input
                type="number"
                min={1}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Expected: {addDays(parseInt(deliveryDays) || 7)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-1.5 items-center"
                >
                  <input
                    value={item.material}
                    onChange={(e) => updateItem(i, "material", e.target.value)}
                    placeholder="Material"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    placeholder="Qty"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PO_UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.unitCost}
                    onChange={(e) => updateItem(i, "unitCost", e.target.value)}
                    placeholder={`Unit ${getCurrencySymbol()}`}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {totalValue > 0 && (
              <div className="flex justify-end mt-2">
                <span className="text-sm font-semibold text-gray-800">
                  Total: {fmt(totalValue)}
                </span>
              </div>
            )}
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
            <ShoppingCart className="w-4 h-4" /> Create Draft PO
          </button>
        </div>
      </div>
    </div>
  );
}

function SendToSupplierModal({
  po,
  onClose,
  onDone,
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Dear ${po.supplier},\n\nPlease find attached Purchase Order ${po.id}. Kindly confirm receipt and expected delivery by ${po.expectedDate}.\n\nRegards,\nProcurement Team`,
  );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Send PO to Supplier
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
            <span className="font-medium text-blue-800">{po.id}</span> →{" "}
            <span className="text-blue-700">{po.supplier}</span> ·{" "}
            {fmt(po.totalValue)}
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
              rows={5}
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
            onClick={onDone}
            disabled={!email.trim()}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Send PO
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordReceiptModal({
  po,
  onClose,
  onDone,
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onDone: (received: number[]) => void;
}) {
  const [received, setReceived] = useState<string[]>(po.items.map(() => ""));
  const [warehouse, setWarehouse] = useState("Main Store");
  const [deliveryNote, setDeliveryNote] = useState("");
  const valid = received.every((v) => v.trim() !== "") && deliveryNote.trim();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            Record Delivery — {po.id}
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
                Warehouse / Location
              </label>
              <input
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
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
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Quantities Received
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left px-3 py-2">Material</th>
                  <th className="text-right px-3 py-2">Ordered</th>
                  <th className="text-right px-3 py-2">Already Rcvd</th>
                  <th className="px-3 py-2">Qty Received Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.items.map((item, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {item.material}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">
                      {item.received} {item.unit}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={item.qty - item.received}
                        value={received[i]}
                        onChange={(e) =>
                          setReceived((p) =>
                            p.map((v, j) => (j === i ? e.target.value : v)),
                          )
                        }
                        placeholder={`Max ${item.qty - item.received}`}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              valid && onDone(received.map((v) => parseFloat(v) || 0))
            }
            disabled={!valid}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Truck className="w-4 h-4" /> Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrdersPage() {
  const { logChange } = useChangelog();
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  useEffect(() => {
    fetchPurchaseOrders().then(setPoList);
  }, []);
  const [activeTab, setActiveTab] = useState<POStatus | "all">("all");
  const [showNewPO, setShowNewPO] = useState(false);
  const [sendPO, setSendPO] = useState<PurchaseOrder | null>(null);
  const [receiptPO, setReceiptPO] = useState<PurchaseOrder | null>(null);

  function sendToFinance(po: PurchaseOrder) {
    const ref = `FIN-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setPoList((prev) =>
      prev.map((p) =>
        p.id === po.id ? { ...p, sentToFinance: true, financeRef: ref } : p,
      ),
    );
    logChange({
      module: "Procurement",
      action: "Sent to Finance",
      entityType: "PurchaseOrder",
      entityId: po.id,
      summary: `PO ${po.id} sent to finance (${ref})`,
      performedBy: "Current User",
    });
  }

  function requestPaymentConfirmation(po: PurchaseOrder) {
    setPoList((prev) =>
      prev.map((p) =>
        p.id === po.id
          ? { ...p, paymentStatus: "confirmation_requested" as PaymentStatus }
          : p,
      ),
    );
    logChange({
      module: "Procurement",
      action: "Payment Confirmation Requested",
      entityType: "PurchaseOrder",
      entityId: po.id,
      summary: `Payment confirmation requested for PO ${po.id}`,
      performedBy: "Current User",
    });
  }

  function markPaid(po: PurchaseOrder) {
    setPoList((prev) =>
      prev.map((p) =>
        p.id === po.id ? { ...p, paymentStatus: "paid" as PaymentStatus } : p,
      ),
    );
    logChange({
      module: "Procurement",
      action: "Paid",
      entityType: "PurchaseOrder",
      entityId: po.id,
      summary: `PO ${po.id} marked as paid`,
      performedBy: "Current User",
    });
  }

  function deletePO(po: PurchaseOrder) {
    if (!window.confirm(`Delete ${po.id}?`)) return;
    setPoList((prev) => prev.filter((p) => p.id !== po.id));
    logChange({
      module: "Procurement",
      action: "Deleted",
      entityType: "PurchaseOrder",
      entityId: po.id,
      summary: `PO ${po.id} deleted`,
      performedBy: "Current User",
    });
  }

  const filtered = poList.filter(
    (po) => activeTab === "all" || po.status === activeTab,
  );

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "id",
      label: "PO ID",
      sortable: true,
      filterable: true,
      render: (po) => (
        <span className="font-mono text-xs font-semibold text-gray-900">
          {po.id}
        </span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier / Vendor",
      sortable: true,
      filterable: true,
      render: (po) => (
        <div>
          <p className="font-medium text-gray-900">{po.supplier}</p>
          <p className="text-xs text-gray-400">{po.supplierContact}</p>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description / Items",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (po) => (
        <div className="text-sm text-gray-600">
          {po.items.length} item{po.items.length > 1 ? "s" : ""}:{" "}
          {po.items.map((it) => it.material).join(", ")}
        </div>
      ),
    },
    {
      key: "totalValue",
      label: "Total ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (po) => (
        <span className="font-semibold text-gray-900">
          {po.totalValue.toLocaleString()}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (po) => (
        <span className="text-gray-600 text-sm">{po.expectedDate}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (po) => {
        const cfg = statusConfig[po.status] ?? {
          badge: "bg-gray-100 text-gray-700",
          icon: null,
          label: String(po.status ?? "Unknown"),
        };
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      sortable: true,
      filterable: true,
      render: (po) => (
        <span
          className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${PAYMENT_STATUS_CFG[po.paymentStatus].badge}`}
        >
          {PAYMENT_STATUS_CFG[po.paymentStatus].label}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      render: (po) => (
        <div className="flex items-center gap-1">
          {po.status === "draft" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSendPO(po);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Send to Supplier"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePO(po);
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Delete PO"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {["confirmed", "partially_received", "completed"].includes(
            po.status,
          ) &&
            !po.sentToFinance && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendToFinance(po);
                }}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="Send to Finance"
              >
                <Building2 className="w-3.5 h-3.5" />
              </button>
            )}
          {po.status === "confirmed" && po.paymentStatus === "unpaid" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                requestPaymentConfirmation(po);
              }}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
              title="Request Payment Confirmation"
            >
              <CreditCard className="w-3.5 h-3.5" />
            </button>
          )}
          {po.status === "confirmed" &&
            po.paymentStatus === "confirmation_requested" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markPaid(po);
                }}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                title="Mark as Paid"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
          {po.status === "partially_received" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReceiptPO(po);
              }}
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
              title="Record Delivery"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
          )}
          {po.status === "sent" && (
            <span className="text-xs text-gray-400 italic">
              Awaiting confirmation
            </span>
          )}
          {po.status === "completed" && po.paymentStatus === "paid" && (
            <span className="text-xs text-green-600 font-medium">
              Completed
            </span>
          )}
        </div>
      ),
    },
  ];

  function handleExport() {
    const headers = [
      "PO ID",
      "PR Ref",
      "Supplier",
      "Contact",
      "Status",
      "Payment Status",
      "Total Value",
      "Expected Date",
      "Items",
    ];
    const rows = filtered.map((po) => [
      po.id,
      po.prRef,
      po.supplier,
      po.supplierContact,
      statusConfig[po.status].label,
      PAYMENT_STATUS_CFG[po.paymentStatus].label,
      String(po.totalValue),
      po.expectedDate,
      po.items
        .map((it) => `${it.material} (${it.qty} ${it.unit} @ ₦${it.unitCost})`)
        .join("; "),
    ]);
    exportCSV("purchase-orders", headers, rows);
  }

  const totalValue = poList
    .filter((po) => po.status !== "cancelled")
    .reduce((a, po) => a + po.totalValue, 0);
  const accrualCandidates = poList.filter(
    (po) =>
      (po.status === "confirmed" || po.status === "partially_received") &&
      po.paymentStatus !== "paid",
  );
  const totalAccrualExposure = accrualCandidates.reduce(
    (s, po) => s + po.totalValue - po.receivedValue,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage PO lifecycle from draft to completed delivery
          </p>
        </div>
        <button
          onClick={() => setShowNewPO(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" /> New Purchase Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total POs",
            value: poList.length,
            sub: "All time",
            color: "bg-gray-50 border-gray-200 text-gray-900",
          },
          {
            label: "Open POs",
            value: poList.filter((p) =>
              ["sent", "confirmed", "partially_received"].includes(p.status),
            ).length,
            sub: "Awaiting delivery",
            color: "bg-blue-50 border-blue-200 text-blue-700",
          },
          {
            label: "Total Open Value",
            value: fmt(totalValue),
            sub: "Outstanding",
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Accrual Exposure",
            value: fmt(totalAccrualExposure),
            sub: `${accrualCandidates.length} POs awaiting invoice`,
            color: "bg-indigo-50 border-indigo-200 text-indigo-700",
          },
          {
            label: "Completed",
            value: poList.filter((p) => p.status === "completed").length,
            sub: "This month",
            color: "bg-green-50 border-green-200 text-green-700",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg border ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
            <p className="text-xs mt-0.5 opacity-60">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? poList.length
              : poList.filter((po) => po.status === tab.key).length;
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

      <DataTable<PurchaseOrder>
        columns={columns}
        data={filtered}
        keyExtractor={(po) => po.id}
        searchPlaceholder="Search by PO ID, supplier, or material..."
        searchFields={[
          (po) => po.id,
          (po) => po.supplier,
          (po) => po.items.map((i) => i.material).join(" "),
        ]}
        headerExtra={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      {showNewPO && (
        <NewPOModal
          onClose={() => setShowNewPO(false)}
          onSave={(po) => {
            setPoList((prev) => [po, ...prev]);
            logChange({
              module: "Procurement",
              action: "Created",
              entityType: "PurchaseOrder",
              entityId: po.id,
              summary: `PO ${po.id} created — ${po.supplier} (${fmt(po.totalValue)})`,
              performedBy: "Current User",
            });
            setShowNewPO(false);
          }}
        />
      )}
      {sendPO && (
        <SendToSupplierModal
          po={sendPO}
          onClose={() => setSendPO(null)}
          onDone={() => {
            setPoList((prev) =>
              prev.map((p) =>
                p.id === sendPO.id ? { ...p, status: "sent" as const } : p,
              ),
            );
            logChange({
              module: "Procurement",
              action: "Sent",
              entityType: "PurchaseOrder",
              entityId: sendPO.id,
              summary: `PO ${sendPO.id} sent to supplier (${sendPO.supplier})`,
              performedBy: "Current User",
            });
            setSendPO(null);
          }}
        />
      )}
      {receiptPO && (
        <RecordReceiptModal
          po={receiptPO}
          onClose={() => setReceiptPO(null)}
          onDone={(received) => {
            setPoList((prev) =>
              prev.map((p) => {
                if (p.id !== receiptPO.id) return p;
                const newItems = p.items.map((it, i) => ({
                  ...it,
                  received: it.received + (received[i] || 0),
                }));
                const newReceivedValue = newItems.reduce(
                  (s, it) => s + it.received * it.unitCost,
                  0,
                );
                const allReceived = newItems.every(
                  (it) => it.received >= it.qty,
                );
                return {
                  ...p,
                  items: newItems,
                  receivedValue: newReceivedValue,
                  status: (allReceived
                    ? "completed"
                    : "partially_received") as typeof p.status,
                };
              }),
            );
            logChange({
              module: "Procurement",
              action: "Delivery Recorded",
              entityType: "PurchaseOrder",
              entityId: receiptPO.id,
              summary: `Delivery recorded for PO ${receiptPO.id}`,
              performedBy: "Current User",
            });
            setReceiptPO(null);
          }}
        />
      )}
    </div>
  );
}
