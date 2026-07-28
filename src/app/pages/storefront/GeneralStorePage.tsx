import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  ShoppingCart,
  CheckCircle,
  X,
} from "lucide-react";
import {
  getStoreItems,
  createStoreItem,
  type StoreItem as ApiStoreItem,
} from "../../api/materials";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

function getStatus(item: StockItem): StockStatus {
  if (item.qty === 0) return "Out of Stock";
  if (item.qty <= item.reorderLevel) return "Low Stock";
  return "In Stock";
}

const STATUS_STYLE: Record<StockStatus, string> = {
  "In Stock": "bg-green-50 text-green-700",
  "Low Stock": "bg-yellow-50 text-yellow-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

interface StockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  reorderLevel: number;
  unitCost: number;
  lastReceived: string;
  bin: string;
}

function toStockItem(item: ApiStoreItem): StockItem {
  return {
    id: item.id ?? "",
    name: item.materialName ?? "",
    category: item.category ?? "",
    unit: item.unit ?? "Units",
    qty: item.qty ?? 0,
    reorderLevel: item.reorderLevel ?? 0,
    unitCost: item.unitCost ?? 0,
    lastReceived: item.lastReceived ?? "",
    bin: item.bin ?? "",
  };
}

const BLANK: Omit<StockItem, "id"> = {
  name: "",
  category: "",
  unit: "Units",
  qty: 0,
  reorderLevel: 0,
  unitCost: 0,
  lastReceived: "",
  bin: "",
};

export function GeneralStorePage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<StockItem, "id">>({ ...BLANK });
  const [lowOnly, setLowOnly] = useState(false);
  const [procurementTarget, setProcurementTarget] = useState<StockItem | null>(
    null,
  );
  const [procurementQty, setProcurementQty] = useState("");
  const [sentToProcurement, setSentToProcurement] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    getStoreItems()
      .then((data) => setItems(data.map(toStockItem)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    const matchSearch =
      (i.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.id ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || i.category === catFilter;
    const matchLow = !lowOnly || getStatus(i) !== "In Stock";
    return matchSearch && matchCat && matchLow;
  });
  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
  ];
  const editableCategories = categories.filter((c) => c !== "All");

  async function saveItem() {
    try {
      const created = await createStoreItem({
        materialName: form.name,
        category: form.category,
        unit: form.unit,
        qty: form.qty,
        reorderLevel: form.reorderLevel,
        unitCost: form.unitCost,
        bin: form.bin,
      });
      setItems((prev) => [...prev, toStockItem(created)]);
      setShowModal(false);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            General Store
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Central warehouse inventory
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ ...BLANK });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500">Total SKUs</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-600">
            {items.filter((i) => getStatus(i) === "Low Stock").length}
          </p>
          <p className="text-xs text-gray-500">Low Stock Items</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">
            {getCurrencySymbol()}
            {(
              items.reduce((s, i) => s + i.qty * i.unitCost, 0) / 1_000_000
            ).toFixed(1)}
            M
          </p>
          <p className="text-xs text-gray-500">Total Stock Value</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600">
            {items.filter((i) => getStatus(i) === "Out of Stock").length}
          </p>
          <p className="text-xs text-gray-500">Out of Stock</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${catFilter === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setLowOnly((p) => !p)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border font-medium ${lowOnly ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          <AlertTriangle className="w-3 h-3" /> Low Stock
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              {[
                "ID",
                "Item Name",
                "Category",
                "Bin",
                "Qty",
                "Reorder Level",
                "Unit Cost",
                "Stock Value",
                "Last Received",
                "Status",
                "",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {item.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <span className="font-medium text-gray-900">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {item.bin}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900">
                        {formatNumberByGeneralSettings(item.qty)}
                      </span>
                      <span className="text-gray-400 text-xs">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatNumberByGeneralSettings(item.reorderLevel)} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumberByGeneralSettings(item.unitCost)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatNumberByGeneralSettings(item.qty * item.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {item.lastReceived}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[status]}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(status === "Low Stock" || status === "Out of Stock") &&
                        (sentToProcurement.has(item.id) ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" /> Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setProcurementTarget(item);
                              setProcurementQty("");
                            }}
                            className="p-1.5 text-amber-500 hover:text-amber-700 rounded-lg hover:bg-amber-50"
                            title="Send for Procurement"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Send for Procurement Modal */}
      {procurementTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Send for Procurement
              </h2>
              <button
                onClick={() => setProcurementTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {getStatus(procurementTarget)}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  <span className="font-medium">{procurementTarget.name}</span>{" "}
                  — {procurementTarget.qty} {procurementTarget.unit} in stock,
                  reorder level {procurementTarget.reorderLevel}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantity to Procure<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={procurementQty}
                onChange={(e) => setProcurementQty(e.target.value)}
                placeholder="Enter quantity…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              A procurement request will be raised and sent to the Procurement
              team for sourcing.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProcurementTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!procurementQty || Number(procurementQty) <= 0}
                onClick={() => {
                  setSentToProcurement(
                    (prev) => new Set([...prev, procurementTarget.id]),
                  );
                  setProcurementTarget(null);
                }}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Send to Procurement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                Add Stock Item
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Item Name
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Cement (50kg bag)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    <option value="">Select category</option>
                    {editableCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Bags, Metres, Units"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    value={form.qty}
                    onChange={(e) =>
                      setForm({ ...form, qty: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    value={form.reorderLevel}
                    onChange={(e) =>
                      setForm({ ...form, reorderLevel: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit Cost ({getCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    value={form.unitCost}
                    onChange={(e) =>
                      setForm({ ...form, unitCost: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Bin Location
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. A-01"
                    value={form.bin}
                    onChange={(e) => setForm({ ...form, bin: e.target.value })}
                  />
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
                onClick={saveItem}
                disabled={!form.name.trim()}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
