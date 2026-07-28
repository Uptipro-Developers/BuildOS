import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Filter,
  ArrowRight,
  Plus,
  LayoutList,
  Building2,
} from "lucide-react";
import {
  getStockMovements,
  createStockMovement,
  getMaterials,
  getStores,
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
};

export function StockMovementPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"material" | "store">("material");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "All">("All");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<typeof BLANK_FORM>({ ...BLANK_FORM });

  useEffect(() => {
    Promise.all([getStockMovements(), getStores(), getMaterials()])
      .then(([movs, strs, mats]) => {
        setMovements(
          movs.map((m) => ({
            id: m.id,
            date: formatDateByGeneralSettings(m.date),
            material: m.materialName,
            category: "",
            fromStore: m.storeName,
            toStore: m.projectName ?? "—",
            quantity: m.qty,
            unit: m.unit,
            type: m.type as MovementType,
            reference: m.reference ?? "",
            remarks: m.notes ?? "",
          })),
        );
        setStores(strs.map((s) => s.name));
        const materialNames = mats.map((m) => m.name);
        setMaterials(materialNames);
        setForm((prev) => ({ ...prev, material: prev.material || materialNames[0] || "" }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      const created = await createStockMovement({
        type: form.type,
        materialName: form.material,
        unit: form.unit,
        qty: form.quantity,
        storeName: form.fromStore,
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
        type: created.type as MovementType,
        reference: created.reference ?? "",
        remarks: created.notes ?? "",
      };
      setMovements((prev) => [mov, ...prev]);
      setShowModal(false);
      setForm({ ...BLANK_FORM });
    } catch (e) {
      console.error(e);
    }
  }

  function exportCSV() {
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
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "stock_movement.csv";
    a.click();
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
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export
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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {[
                    "Movement ID",
                    "Date",
                    "Material",
                    "From Store",
                    "To Store",
                    "Qty",
                    "Unit",
                    "Type",
                    "Reference",
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
                      colSpan={9}
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
            const outbound = movements.filter(
              (m) => m.fromStore === store && m.type !== "Receipt",
            );
            const inbound = movements.filter(
              (m) => m.toStore === store && m.type !== "Return",
            );
            const returns = movements.filter(
              (m) => m.fromStore === store && m.type === "Return",
            );

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
                      {outbound.length} out
                    </span>
                    <span className="text-green-600 font-medium">
                      {inbound.length} in
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {returns.length} returns
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...inbound, ...outbound, ...returns].length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-4 text-center text-gray-400 text-xs"
                        >
                          No activity for this store.
                        </td>
                      </tr>
                    )}
                    {[
                      ...inbound.map((m) => ({ ...m, dir: "IN" as const })),
                      ...outbound.map((m) => ({ ...m, dir: "OUT" as const })),
                      ...returns.map((m) => ({ ...m, dir: "RET" as const })),
                    ].map((m) => (
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
                            className={`text-xs font-bold ${m.dir === "IN" ? "text-green-600" : m.dir === "OUT" ? "text-blue-600" : "text-yellow-600"}`}
                          >
                            {m.dir}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {m.dir === "IN" ? m.fromStore : m.toStore}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[m.type]}`}
                          >
                            {m.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
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
