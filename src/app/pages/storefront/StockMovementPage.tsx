import { useState, useEffect } from "react";
import { exportCSV } from "../../utils/exportCSV";
import { toast } from "sonner";
import {
  Search,
  Download,
  Filter,
  ArrowRight,
  Plus,
  LayoutList,
  Building2,
  Inbox,
  CheckCircle,
  FileText,
  X,
} from "lucide-react";
import {
  getStockMovements,
  createStockMovement,
  getMaterials,
  getStores,
  getStockTransfers,
  updateStockTransfer,
  type StockTransfer,
} from "../../api/materials";
import {
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

type MovementType = "Transfer" | "Issue" | "Receipt" | "Return" | "Adjustment";

interface Movement {
  id: string;
  date: string;
  material: string;
  category: string;
  fromStore: string;
  toStore: string;
  quantity: number;
  unit: string;
  type: MovementType;
  reference: string;
  remarks: string;
  qtyBefore?: number;
  qtyAfter?: number;
  status?: string;
  storeId?: string;
  toStoreId?: string;
}

function movementLabel(type: string): MovementType {
  const value = type.toLowerCase();
  if (value.includes("transfer")) return "Transfer";
  if (value.includes("issue") || value.includes("outgoing") || value.includes("consumption")) return "Issue";
  if (value.includes("receipt") || value.includes("incoming")) return "Receipt";
  if (value.includes("return")) return "Return";
  return "Adjustment";
}

const TYPE_STYLE: Record<MovementType, string> = {
  Transfer: "bg-blue-50 text-blue-700",
  Issue: "bg-purple-50 text-purple-700",
  Receipt: "bg-green-50 text-green-700",
  Return: "bg-yellow-50 text-yellow-700",
  Adjustment: "bg-gray-100 text-gray-700",
};

const TYPES: (MovementType | "All")[] = [
  "All",
  "Transfer",
  "Issue",
  "Receipt",
  "Return",
  "Adjustment",
];

const BLANK_FORM = {
  material: "",
  category: "",
  fromStore: "",
  toStore: "",
  quantity: 1,
  unit: "Units",
  type: "Adjustment" as MovementType,
  reference: "",
  remarks: "",
  adjustmentDirection: "decrease" as "increase" | "decrease",
};

export function StockMovementPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [storeRecords, setStoreRecords] = useState<{ id: string; name: string }[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"material" | "store">("material");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "All">("All");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [showModal, setShowModal] = useState(false);
  const [showIncoming, setShowIncoming] = useState(false);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [receiptTransfer, setReceiptTransfer] = useState<StockTransfer | null>(null);
  const [updatingTransfer, setUpdatingTransfer] = useState<string | null>(null);
  const [form, setForm] = useState<typeof BLANK_FORM>({ ...BLANK_FORM });

  useEffect(() => {
    Promise.all([getStockMovements(), getStores(), getMaterials(), getStockTransfers()])
      .then(([movs, strs, mats, transferRows]) => {
        setMovements(
          movs.map((m) => ({
            id: m.id,
            date: formatDateByGeneralSettings(m.date),
            material: m.materialName,
            category: "",
            fromStore: m.storeName,
            toStore: m.toStoreName ?? m.projectName ?? "—",
            quantity: m.qty,
            unit: m.unit,
            type: movementLabel(m.type),
            reference: m.reference ?? "",
            remarks: m.notes ?? "",
            qtyBefore: m.qtyBefore,
            qtyAfter: m.qtyAfter,
            status: m.status,
            storeId: m.storeId,
            toStoreId: m.toStoreId,
          })),
        );
        setStores(strs.map((s) => s.name));
        setStoreRecords(strs.map((s) => ({ id: s.id, name: s.name })));
        const materialNames = mats.map((m) => m.name);
        setMaterials(materialNames);
        setTransfers(transferRows);
        setForm((prev) => ({ ...prev, material: prev.material || materialNames[0] || "" }));
      })
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load stock movements.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const incomingTransfers = transfers.filter((transfer) => {
    const requestLinked = transfer.notes?.includes("ESS Material Request") || transfer.items?.some((item) => item.materialRequestRef);
    return requestLinked && ["pending", "in transit"].includes(String(transfer.status).toLowerCase());
  });

  async function changeTransferStatus(transfer: StockTransfer, status: "In Transit" | "Completed") {
    setUpdatingTransfer(transfer.id);
    try {
      const updated = await updateStockTransfer(transfer.id, { status });
      setTransfers((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (status === "Completed") {
        setReceiptTransfer(updated);
        const fresh = await getStockMovements();
        setMovements(fresh.map((m) => ({
          id: m.id, date: formatDateByGeneralSettings(m.date), material: m.materialName, category: "",
          fromStore: m.storeName, toStore: m.toStoreName ?? m.projectName ?? "—", quantity: m.qty, unit: m.unit,
          type: movementLabel(m.type), reference: m.reference ?? "", remarks: m.notes ?? "", qtyBefore: m.qtyBefore,
          qtyAfter: m.qtyAfter, status: m.status, storeId: m.storeId, toStoreId: m.toStoreId,
        })));
        toast.success("Receipt confirmed and stock movement posted.");
      } else toast.success("Stock movement marked In Transit.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update the stock movement.");
    } finally { setUpdatingTransfer(null); }
  }

  const storeOptions = stores.length > 0 ? stores : [];
  const STORE_FILTER_OPTIONS = ["All Stores", ...storeOptions];

  const filtered = movements.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.material.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.reference.toLowerCase().includes(q);
    const matchType = typeFilter === "All" || m.type === typeFilter;
    const matchStore =
      storeFilter === "All Stores" ||
      m.fromStore === storeFilter ||
      m.toStore === storeFilter;
    return matchSearch && matchType && matchStore;
  });

  async function record() {
    try {
      const fromStore = storeRecords.find((store) => store.name === form.fromStore);
      const toStore = storeRecords.find((store) => store.name === form.toStore);
      const created = await createStockMovement({
        type: form.type,
        materialName: form.material,
        unit: form.unit,
        qty: form.quantity,
        storeName: form.fromStore,
        storeId: fromStore?.id,
        toStoreName: form.toStore,
        toStoreId: toStore?.id,
        direction: form.type === "Adjustment" ? form.adjustmentDirection : undefined,
        reference: form.reference || undefined,
        notes: form.remarks || undefined,
      });
      const mov: Movement = {
        id: created.id,
        date: formatDateByGeneralSettings(created.date),
        material: created.materialName,
        category: "",
        fromStore: created.storeName,
        toStore: created.projectName ?? "—",
        quantity: created.qty,
        unit: created.unit,
        type: movementLabel(created.type),
        reference: created.reference ?? "",
        remarks: created.notes ?? "",
        qtyBefore: created.qtyBefore,
        qtyAfter: created.qtyAfter,
        status: created.status,
      };
      setMovements((prev) => [mov, ...prev]);
      setShowModal(false);
      setForm({ ...BLANK_FORM });
      toast.success(form.type === "Adjustment"
        ? `Adjustment submitted for approval.`
        : `${form.type} of ${form.quantity} ${form.unit} ${form.material} recorded.`);
    } catch (err) {
      // A stock movement that failed to record used to close nothing and say
      // nothing, leaving the operator unsure whether stock had moved.
      toast.error(
        err instanceof Error ? err.message : "Failed to record the movement.",
      );
    }
  }

  function handleExportCSV() {
    const rows = [
      [
        "Movement ID",
        "Date",
        "Material",
        "Category",
        "From Store",
        "To Store",
        "Quantity",
        "Unit",
        "Type",
        "Reference",
        "Remarks",
      ],
      ...filtered.map((m) => [
        m.id,
        m.date,
        m.material,
        m.category,
        m.fromStore,
        m.toStore,
        m.quantity,
        m.unit,
        m.type,
        m.reference,
        m.remarks,
      ]),
    ];
    // Hands off to the shared helper: the previous inline version built a
    // detached `data:text/csv` anchor, which Firefox and Safari ignore, declared
    // no charset (mangling ₦ and accents) and had no escaping, so any cell
    // containing a comma silently shifted every later column.
    exportCSV("stock-movement", rows[0] as string[], rows.slice(1));
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Stock Movement
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Unified hub for all material movements — transfers, issues, receipts
            and returns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowIncoming(true)}
            className="relative flex items-center gap-2 border border-teal-200 bg-white text-teal-700 text-sm px-3 py-2 rounded-xl hover:bg-teal-50"
          >
            <Inbox className="w-4 h-4" /> Incoming Requests
            {incomingTransfers.length > 0 && <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{incomingTransfers.length}</span>}
          </button>
          <button
            onClick={() => {
              setForm({ ...BLANK_FORM });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Record Movement
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setView("material")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === "material" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <LayoutList className="w-4 h-4" /> Material-Level View
        </button>
        <button
          onClick={() => setView("store")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === "store" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Building2 className="w-4 h-4" /> Store-Based View
        </button>
      </div>

      {view === "material" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Search material, reference…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-400" />
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${typeFilter === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              {STORE_FILTER_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {[
                    "Movement ID",
                    "Date",
                    "Material",
                    "From Store",
                    "To Store",
                    "Qty",
                    "Before",
                    "After",
                    "Unit",
                    "Type",
                    "Reference",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      No movements found.
                    </td>
                  </tr>
                )}
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {m.id}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {m.material}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {m.fromStore}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {m.toStore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatNumberByGeneralSettings(m.quantity)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.qtyBefore ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{m.qtyAfter ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{m.unit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[m.type]}`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {m.reference || "—"}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === "posted" ? "bg-green-50 text-green-700" : m.status === "rejected" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>{(m.status ?? "posted").replace(/_/g, " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {movements.length} movements
          </p>
        </>
      )}

      {view === "store" && (
        <div className="space-y-4">
          {storeOptions.map((store) => {
            const history = movements.filter((movement) => movement.fromStore === store || movement.toStore === store).map((movement) => {
              const transfer = transfers.find((candidate) => candidate.reference === movement.reference);
              const rawDirection = movement.type === "Receipt" || movement.remarks.toLowerCase().includes("incoming") || movement.qtyAfter !== undefined && movement.qtyBefore !== undefined && movement.qtyAfter > movement.qtyBefore;
              const direction = movement.type === "Return" ? "RETURN" : rawDirection ? "IN" : "OUT";
              const counterpart = transfer
                ? direction === "IN" ? transfer.fromStoreName : transfer.toStoreName
                : movement.toStore !== "—" && movement.toStore !== store ? movement.toStore
                  : movement.type === "Receipt" ? "External receipt" : movement.type === "Issue" ? "Material issue" : "—";
              return { ...movement, direction, counterpart };
            });
            const inboundCount = history.filter((movement) => movement.direction === "IN").length;
            const outboundCount = history.filter((movement) => movement.direction === "OUT").length;
            const returnCount = history.filter((movement) => movement.direction === "RETURN").length;

            return (
              <div
                key={store}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-800 text-sm">
                      {store}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="text-blue-600 font-medium">
                      {outboundCount} out
                    </span>
                    <span className="text-green-600 font-medium">
                      {inboundCount} in
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {returnCount} returns
                    </span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Material</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Qty</th>
                      <th className="px-4 py-2.5 text-left">Direction</th>
                      <th className="px-4 py-2.5 text-left">Counterpart</th>
                      <th className="px-4 py-2.5 text-left">Type</th>
                      <th className="px-4 py-2.5 text-left">Balance</th>
                      <th className="px-4 py-2.5 text-left">Reference</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-4 text-center text-gray-400 text-xs"
                        >
                          No activity for this store.
                        </td>
                      </tr>
                    )}
                    {history.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900 font-medium text-xs">
                          {m.material}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                          {m.date}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs font-semibold">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-bold ${m.direction === "IN" ? "text-green-600" : m.direction === "OUT" ? "text-blue-600" : "text-yellow-600"}`}
                          >
                            {m.direction}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {m.counterpart}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[m.type]}`}>{m.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{m.qtyBefore ?? "—"} → <span className="font-semibold text-gray-900">{m.qtyAfter ?? "—"}</span></td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{m.reference || "—"}</td>
                        <td className="px-4 py-2.5 text-xs capitalize text-gray-500">{(m.status ?? "posted").replace(/_/g, " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {showIncoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div><h2 className="text-lg font-semibold text-gray-900">Incoming Stock Movement Requests</h2><p className="mt-0.5 text-xs text-gray-500">Approved ESS requests waiting to be moved or received.</p></div>
              <button onClick={() => setShowIncoming(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              {incomingTransfers.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-400">No incoming stock movement requests.</div>}
              {incomingTransfers.map((transfer) => {
                const inTransit = String(transfer.status).toLowerCase() === "in transit";
                return <section key={transfer.id} className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <div><p className="font-mono text-xs font-semibold text-gray-800">{transfer.reference}</p><p className="mt-0.5 text-xs text-gray-500">{transfer.fromStoreName} <ArrowRight className="mx-1 inline h-3 w-3" /> {transfer.toStoreName}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${inTransit ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-700"}`}>{transfer.status}</span>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {transfer.items.map((item, index) => <div key={`${item.materialName}-${index}`} className="rounded-lg border border-gray-100 p-3"><p className="text-sm font-semibold text-gray-900">{item.materialName}</p><p className="mt-1 text-xs text-gray-500">{item.qty} {item.unit} · Request {item.materialRequestRef || "—"}</p></div>)}
                    </div>
                    <div className="flex items-center">
                      <button disabled={updatingTransfer === transfer.id} onClick={() => void changeTransferStatus(transfer, inTransit ? "Completed" : "In Transit")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${inTransit ? "bg-green-600 hover:bg-green-700" : "bg-teal-700 hover:bg-teal-800"}`}>
                        {inTransit ? <CheckCircle className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}{updatingTransfer === transfer.id ? "Updating…" : inTransit ? "Confirm Receipt" : "Create Movement"}
                      </button>
                    </div>
                  </div>
                </section>;
              })}
            </div>
          </div>
        </div>
      )}

      {receiptTransfer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Stock Receipt Note</p><h2 className="mt-1 text-lg font-semibold text-gray-900">{receiptTransfer.reference}</h2></div><button onClick={() => setReceiptTransfer(null)}><X className="h-5 w-5 text-gray-400" /></button></div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-sm"><div><p className="text-xs text-gray-400">From store</p><p className="mt-1 font-semibold text-gray-900">{receiptTransfer.fromStoreName}</p></div><div><p className="text-xs text-gray-400">Receiving store</p><p className="mt-1 font-semibold text-gray-900">{receiptTransfer.toStoreName}</p></div><div><p className="text-xs text-gray-400">Requested by</p><p className="mt-1 font-medium text-gray-800">{receiptTransfer.requestedBy || "—"}</p></div><div><p className="text-xs text-gray-400">Received date</p><p className="mt-1 font-medium text-gray-800">{receiptTransfer.completedAt ? formatDateByGeneralSettings(receiptTransfer.completedAt) : "—"}</p></div></div>
              <div className="overflow-hidden rounded-xl border border-gray-200"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Material</th><th className="px-4 py-3 text-left">ESS Request</th><th className="px-4 py-3 text-right">Received</th></tr></thead><tbody className="divide-y divide-gray-100">{receiptTransfer.items.map((item, index) => <tr key={`${item.materialName}-${index}`}><td className="px-4 py-3 font-medium text-gray-900">{item.materialName}</td><td className="px-4 py-3 font-mono text-xs text-gray-500">{item.materialRequestRef || "—"}</td><td className="px-4 py-3 text-right font-semibold">{item.qty} {item.unit}</td></tr>)}</tbody></table></div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4"><button onClick={() => setReceiptTransfer(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700">Close</button><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm text-white"><FileText className="h-4 w-4" /> Print Receipt</button></div>
          </div>
        </div>
      )}

      {/* Record Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Record Manual Movement
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Movement Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as MovementType })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {["Transfer", "Issue", "Receipt", "Return", "Adjustment"].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    ),
                  )}
                </select>
              </div>
              {form.type === "Adjustment" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adjustment Direction</label>
                  <select value={form.adjustmentDirection} onChange={(e) => setForm({ ...form, adjustmentDirection: e.target.value as "increase" | "decrease" })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="increase">Increase stock</option>
                    <option value="decrease">Decrease stock</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-400">Manual adjustments remain pending until approved and are then posted to the ledger.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Material
                </label>
                <select
                  value={form.material}
                  onChange={(e) =>
                    setForm({ ...form, material: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {materials.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: Number(e.target.value) })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit
                  </label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From Store
                </label>
                <select
                  value={form.fromStore}
                  onChange={(e) =>
                    setForm({ ...form, fromStore: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {storeOptions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To Store
                </label>
                <select
                  value={form.toStore}
                  onChange={(e) =>
                    setForm({ ...form, toStore: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {storeOptions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Reference (optional)
                </label>
                <input
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder="e.g. TRF-042, GRN-023"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Remarks
                </label>
                <textarea
                  value={form.remarks}
                  onChange={(e) =>
                    setForm({ ...form, remarks: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={record}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
