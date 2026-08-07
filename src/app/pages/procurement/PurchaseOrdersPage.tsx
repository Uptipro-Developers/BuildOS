import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  mapPO,
  sendPOToFinance,
  requestPaymentConfirmation,
  confirmPOPayment,
  cancelPurchaseOrder,
  type MappedPurchaseOrder,
} from "../../api/purchase-orders";
import { getReferenceData } from "../../api/reference-data";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  csvAmountHeader,
  getCurrencySymbol,
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  ShoppingCart,
  Plus,
  Truck,
  CheckCircle,
  X,
  Trash2,
  CreditCard,
  Building2,
  DownloadCloud,
  Eye,
  Ban,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { exportCSV } from "../../utils/exportCSV";
import { useProcurementUnits } from "../../utils/useProcurementUnits";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote, RowActions } from "../../components/RowAction";
import {
  PURCHASE_ORDER_STATUS,
  statusDef,
  type PurchaseOrderStatus,
} from "../../utils/procurementWorkflow";

type POStatus = PurchaseOrderStatus;

/** The shape mapPO returns — the page and the API agree on one row type. */
type PurchaseOrder = MappedPurchaseOrder;

/**
 * The stages a buyer can see, in the order the workflow reaches them.
 *
 * The old tabs offered "Sent" and "Partial Receipt", neither of which any step
 * produced, and had nowhere to show an order sitting with Finance — which is
 * where an order spends most of its life.
 */
const tabs: { key: POStatus | "all"; label: string }[] = [
  { key: "all", label: "All POs" },
  { key: "draft", label: "Draft" },
  { key: "sent_to_finance", label: "With Finance" },
  { key: "finance_accepted", label: "Accepted" },
  { key: "paid", label: "Paid" },
  { key: "confirmation_requested", label: "Awaiting Confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "goods_received", label: "Goods Received" },
];

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

interface POItem {
  material: string;
  qty: string;
  unit: string;
  unitCost: string;
}

interface NewPOPayload {
  supplierId: string;
  prRef?: string;
  createdBy: string;
  expectedDate: string;
  totalValue: number;
  items: { material: string; qty: number; unit: string; unitCost: number }[];
}

function NewPOModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: NewPOPayload) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };
  /** ISO variant of addDays, since addDays's display format can't be sent to the backend. */
  const addDaysIso = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    d2.setHours(0, 0, 0, 0);
    return d2.toISOString();
  };

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [projects, setProjects] = useState<string[]>([]);
  // The material catalogue, so a PO line can only reference a material that
  // already exists rather than a free-typed name.
  const [materialOptions, setMaterialOptions] = useState<
    { name: string; unit: string }[]
  >([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [prRef, setPrRef] = useState("");
  const [project, setProject] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const units = useProcurementUnits();
  const [items, setItems] = useState<POItem[]>([
    { material: "", qty: "", unit: units[0], unitCost: "" },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const supplierList = data.suppliers.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        const projectNames = data.projects.map((p) => p.name);
        setSuppliers(supplierList);
        setProjects(projectNames);
        setSupplierId((prev) => prev || supplierList[0]?.id || "");
        setProject((prev) => prev || projectNames[0] || "");
        setMaterialOptions(
          (data.materials ?? [])
            .map((m) => ({ name: m.name, unit: m.unit ?? "" }))
            .filter((m) => m.name),
        );
      })
      .catch(() => {});
  }, []);

  const addItem = () =>
    setItems((p) => [
      ...p,
      { material: "", qty: "", unit: units[0], unitCost: "" },
    ]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof POItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const totalValue = items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitCost) || 0),
    0,
  );
  const valid =
    supplierId &&
    items.every(
      (it) => it.material.trim() && it.qty.trim() && it.unitCost.trim(),
    );

  async function handleSave() {
    if (!valid) return;
    try {
      // The reference is allocated server-side on create. Taking one here as
      // well burned two numbers per order and stored neither.
      onSave({
        supplierId,
        prRef: prRef.trim() || undefined,
        createdBy: getAuthUserName() || "Current User",
        expectedDate: addDaysIso(parseInt(deliveryDays) || 7),
        totalValue,
        items: items.map((it) => ({
          material: it.material,
          qty: parseFloat(it.qty) || 0,
          unit: it.unit,
          unitCost: parseFloat(it.unitCost) || 0,
        })),
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create the purchase order.",
      );
    }
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
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
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
                  <select
                    value={item.material}
                    onChange={(e) => {
                      const name = e.target.value;
                      updateItem(i, "material", name);
                      // Adopt the catalogue's unit for the chosen material.
                      const chosen = materialOptions.find((m) => m.name === name);
                      if (chosen?.unit) updateItem(i, "unit", chosen.unit);
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {materialOptions.length === 0
                        ? "No materials in the catalogue"
                        : "Select material…"}
                    </option>
                    {materialOptions.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
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
                    {Array.from(
                      new Set([...units, item.unit].filter(Boolean)),
                    ).map((u) => (
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

export function PurchaseOrdersPage() {
  const { logChange } = useChangelog();
  // Suppliers → View Order History / Create PO with Supplier arrive here with
  // the supplier in the query string, so honour it rather than landing on an
  // unfiltered list.
  const [searchParams] = useSearchParams();
  const supplierParam = searchParams.get("supplier") ?? "";
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  useEffect(() => {
    fetchPurchaseOrders().then(setPoList);
  }, []);
  const [activeTab, setActiveTab] = useState<POStatus | "all">("all");
  const [showNewPO, setShowNewPO] = useState(
    () => searchParams.get("new") === "1",
  );
  /** Id of the order currently mid-transition, so an action can't double-fire. */
  const [working, setWorking] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const navigate = useNavigate();

  /**
   * Runs one workflow step against the server and replaces the row with what
   * came back.
   *
   * Every one of these used to be a `setPoList` call and nothing else: the order
   * advanced in the browser, no request was made, a refresh put it back, and
   * "Send to Finance" invented a `FIN-####` reference with Math.random that
   * Finance had never heard of. The server owns the transition now — including
   * refusing one taken out of order — so the row is only updated once it has
   * actually happened.
   */
  async function step(
    po: PurchaseOrder,
    run: () => Promise<PurchaseOrder>,
    action: string,
    summary: string,
    success: string,
    description?: string,
  ) {
    if (working) return;
    setWorking(po.id);
    try {
      const updated = await run();
      setPoList((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
      logChange({
        module: "Procurement",
        action,
        entityType: "PurchaseOrder",
        entityId: po.id,
        summary,
        performedBy: getAuthUserName() || "Current User",
      });
      toast.success(success, description ? { description } : undefined);
      return updated;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update the purchase order.",
      );
    } finally {
      setWorking(null);
    }
  }

  const sendToFinance = (po: PurchaseOrder) =>
    step(
      po,
      () => sendPOToFinance(po.id, getAuthUserName() || undefined),
      "Sent to Finance",
      `PO ${po.poRef} sent to Finance`,
      `${po.poRef} sent to Finance.`,
      "It is now on Finance › Purchase Invoices, awaiting accept or decline.",
    );

  const askForConfirmation = (po: PurchaseOrder) =>
    step(
      po,
      () => requestPaymentConfirmation(po.id),
      "Payment Confirmation Requested",
      `Payment confirmation requested for PO ${po.poRef}`,
      `Confirmation requested from ${po.supplier}.`,
    );

  const confirmPayment = (po: PurchaseOrder) =>
    step(
      po,
      () => confirmPOPayment(po.id),
      "Payment Confirmed",
      `Payment confirmed for PO ${po.poRef}`,
      `${po.poRef} confirmed.`,
      "A goods receipt has been opened for it on Goods Receipt.",
    );

  async function confirmCancel() {
    const po = cancelTarget;
    if (!po) return;
    setCancelTarget(null);
    await step(
      po,
      () => cancelPurchaseOrder(po.id),
      "Cancelled",
      `PO ${po.poRef} cancelled`,
      `${po.poRef} cancelled.`,
    );
  }

  const filtered = poList.filter(
    (po) =>
      (activeTab === "all" || po.status === activeTab) &&
      (!supplierParam || po.supplier === supplierParam),
  );

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poRef",
      label: "PO Ref",
      sortable: true,
      filterable: true,
      render: (po) => (
        <div>
          <span className="font-mono text-xs font-semibold text-gray-900">
            {po.poRef}
          </span>
          {po.prRef && (
            <p className="text-xs text-gray-400">from {po.prRef}</p>
          )}
        </div>
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
          {po.items.map((it: { material: string }) => it.material).join(", ")}
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
          {formatNumberByGeneralSettings(po.totalValue)}
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
      render: (po) => (
        <div className="space-y-1">
          <StatusBadge {...statusDef(PURCHASE_ORDER_STATUS, po.status)} />
          {po.financeRef && (
            <p className="text-xs text-gray-400 font-mono">{po.financeRef}</p>
          )}
          {po.status === "finance_declined" && po.declineReason && (
            <p className="text-xs text-red-600 max-w-48">{po.declineReason}</p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      headerClassName: "text-right",
      /**
       * One action per row, because at any point exactly one party owns the
       * order — and where that party is Finance or the supplier, the row says
       * so rather than showing nothing.
       *
       * The old cell had six buttons keyed on two independent status columns,
       * including "Send to Supplier" and "Record Delivery" for steps this
       * workflow does not have, and "Mark as Paid" — which let Procurement
       * declare a payment Finance had not made.
       */
      render: (po) => (
        <RowActions>
          <RowAction
            icon={<Eye className="w-3.5 h-3.5" />}
            label="View"
            tone="primary"
            onClick={() => setViewPO(po)}
          />
          {(po.status === "draft" || po.status === "finance_declined") && (
            <>
              <RowAction
                icon={<Building2 className="w-3.5 h-3.5" />}
                label={
                  po.status === "finance_declined"
                    ? "Resend to Finance"
                    : "Send to Finance"
                }
                tone="primary"
                busy={working === po.id}
                busyLabel="Sending…"
                onClick={() => void sendToFinance(po)}
              />
              <RowAction
                icon={<Ban className="w-3.5 h-3.5" />}
                label="Cancel"
                tone="negative"
                disabled={working === po.id}
                onClick={() => setCancelTarget(po)}
              />
            </>
          )}
          {po.status === "sent_to_finance" && (
            <RowActionNote>Awaiting Finance</RowActionNote>
          )}
          {po.status === "finance_accepted" && (
            <RowActionNote>Awaiting payment by Finance</RowActionNote>
          )}
          {po.status === "paid" && (
            <RowAction
              icon={<CreditCard className="w-3.5 h-3.5" />}
              label="Request Payment Confirmation"
              tone="warning"
              busy={working === po.id}
              busyLabel="Requesting…"
              onClick={() => void askForConfirmation(po)}
            />
          )}
          {po.status === "confirmation_requested" && (
            <RowAction
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              label="Mark Confirmed"
              tone="positive"
              title="Record that the supplier confirmed the payment"
              busy={working === po.id}
              busyLabel="Confirming…"
              onClick={() => void confirmPayment(po)}
            />
          )}
          {po.status === "confirmed" && (
            <RowAction
              icon={<Truck className="w-3.5 h-3.5" />}
              label="Goods Receipt"
              tone="primary"
              onClick={() => navigate("/apps/procurement/goods-receipt")}
            />
          )}
          {po.status === "goods_received" && (
            <RowActionNote>Complete</RowActionNote>
          )}
        </RowActions>
      ),
    },
  ];

  function handleExport() {
    const headers = [
      "PO Ref",
      "PR Ref",
      "Supplier",
      "Contact",
      "Status",
      "Finance Ref",
      csvAmountHeader("Total Value"),
      "Expected Date",
      "Items",
    ];
    const rows = filtered.map((po) => [
      po.poRef,
      po.prRef,
      po.supplier,
      po.supplierContact,
      statusDef(PURCHASE_ORDER_STATUS, po.status).label,
      po.financeRef,
      po.totalValue,
      po.expectedDate,
      po.items
        .map(
          (it: { material: string; qty: number; unit: string; unitCost: number }) =>
            `${it.material} (${it.qty} ${it.unit} @ ${formatCurrencyByGeneralSettings(it.unitCost)})`,
        )
        .join("; "),
    ]);
    exportCSV("purchase-orders", headers, rows);
  }

  const totalValue = poList
    .filter((po) => po.status !== "cancelled")
    .reduce((a, po) => a + po.totalValue, 0);
  // Committed spend that Finance has not yet paid — the orders an accrual has
  // to cover at period end.
  const accrualCandidates = poList.filter((po) =>
    ["draft", "sent_to_finance", "finance_accepted", "finance_declined"].includes(
      po.status,
    ),
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
            Draft → Finance → paid → confirmed → goods received
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
            label: "With Finance",
            value: poList.filter((p) =>
              ["sent_to_finance", "finance_accepted"].includes(p.status),
            ).length,
            sub: "Awaiting payment",
            color: "bg-indigo-50 border-indigo-200 text-indigo-700",
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
            sub: `${accrualCandidates.length} POs not yet paid`,
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Goods Received",
            value: poList.filter((p) => p.status === "goods_received").length,
            sub: "Chain complete",
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
          (po) => po.poRef,
          (po) => po.prRef,
          (po) => po.supplier,
          (po) => po.items.map((i: { material: string }) => i.material).join(" "),
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
          onSave={async (payload) => {
            try {
              const created = await createPurchaseOrder(payload);
              const po = mapPO(created);
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
            } catch (e) {
              toast.error(
                e instanceof Error
                  ? e.message
                  : "Failed to create the purchase order.",
              );
            }
          }}
        />
      )}
      {viewPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {viewPO.poRef}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewPO.supplier} · raised by {viewPO.createdBy}
                </p>
              </div>
              <button
                onClick={() => setViewPO(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              <StatusBadge {...statusDef(PURCHASE_ORDER_STATUS, viewPO.status)} />
              {/* The dates behind the status, so the order says when each step
                  happened rather than only which step it is on. */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Purchase request", value: viewPO.prRef || "—" },
                  { label: "Material request", value: viewPO.mrRef || "—" },
                  { label: "Finance invoice", value: viewPO.financeRef || "—" },
                  { label: "Expected delivery", value: viewPO.expectedDate },
                  {
                    label: "Sent to Finance",
                    value: viewPO.sentToFinanceAt || "—",
                  },
                  {
                    label: "Finance decided",
                    value: viewPO.financeDecidedAt || "—",
                  },
                  { label: "Paid", value: viewPO.paidAt || "—" },
                  { label: "Confirmed", value: viewPO.confirmedAt || "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
              {viewPO.declineReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-red-700">
                    Declined by Finance
                  </p>
                  <p className="text-sm text-red-600 mt-0.5">
                    {viewPO.declineReason}
                  </p>
                </div>
              )}
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="min-w-[560px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Material
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        Unit cost
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        Received
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewPO.items.map(
                      (
                        it: {
                          material: string;
                          qty: number;
                          unit: string;
                          unitCost: number;
                          received: number;
                        },
                        i: number,
                      ) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700">
                            {it.material}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {it.qty} {it.unit}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatCurrencyByGeneralSettings(it.unitCost)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {it.received} {it.unit}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setViewPO(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled, not deleted: deleting an order takes the quote it was
          awarded from, the invoice Finance raised for it and the payment with
          it. */}
      <ConfirmationModal
        isOpen={Boolean(cancelTarget)}
        title="Cancel purchase order"
        description={
          cancelTarget
            ? `Cancel ${cancelTarget.poRef} for ${cancelTarget.supplier}? It stays on record, and any unpaid invoice raised for it in Finance is cancelled too.`
            : ""
        }
        confirmLabel="Cancel order"
        isDangerous
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
