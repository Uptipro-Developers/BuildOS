import { useState } from "react";
import { Search, Download, Filter, ArrowRight, Plus, LayoutList, Building2 } from "lucide-react";
import { useNumbering } from "../../stores/numberingStore";

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
  Transfer:   "bg-blue-50 text-blue-700",
  Issue:      "bg-purple-50 text-purple-700",
  Receipt:    "bg-green-50 text-green-700",
  Return:     "bg-yellow-50 text-yellow-700",
  Adjustment: "bg-gray-100 text-gray-700",
};

const MOCK: Movement[] = [
  { id: "MOV-001", date: "Jun 4, 2025",  material: "Cement (50kg bag)",       category: "Concrete",   fromStore: "General Store",           toStore: "Block A Project Store", quantity: 100, unit: "Bags",    type: "Transfer",   reference: "TRF-041", remarks: "Weekly replenishment" },
  { id: "MOV-002", date: "Jun 4, 2025",  material: "Binding Wire",            category: "Steel",      fromStore: "General Store",           toStore: "Block A Project Store", quantity: 10,  unit: "Rolls",   type: "Transfer",   reference: "TRF-041", remarks: "" },
  { id: "MOV-003", date: "Jun 3, 2025",  material: "Concrete Block 9 Inch",   category: "Concrete",   fromStore: "General Store",           toStore: "Block B Project Store", quantity: 500, unit: "Units",   type: "Transfer",   reference: "TRF-040", remarks: "" },
  { id: "MOV-004", date: "Jun 3, 2025",  material: "Steel Rebar Y16",         category: "Steel",      fromStore: "Vendor (Receipt)",        toStore: "General Store",         quantity: 5,   unit: "Tonnes",  type: "Receipt",    reference: "GRN-022", remarks: "PO-018 delivery" },
  { id: "MOV-005", date: "Jun 2, 2025",  material: "Formwork Plywood",        category: "Timber",     fromStore: "Block A Project Store",   toStore: "Block C Project Store", quantity: 5,   unit: "Sheets",  type: "Transfer",   reference: "TRF-039", remarks: "Temporary transfer" },
  { id: "MOV-006", date: "Jun 1, 2025",  material: "Cement (50kg bag)",       category: "Concrete",   fromStore: "Block B Project Store",   toStore: "General Store",         quantity: 30,  unit: "Bags",    type: "Return",     reference: "RET-007", remarks: "Excess from Block B" },
  { id: "MOV-007", date: "May 30, 2025", material: "PVC Pipes 2 Inch",        category: "Plumbing",   fromStore: "General Store",           toStore: "Block A Project Store", quantity: 20,  unit: "Lengths", type: "Issue",      reference: "REQ-031", remarks: "ESS request by Emeka" },
  { id: "MOV-008", date: "May 28, 2025", material: "Steel Rebar Y16",         category: "Steel",      fromStore: "General Store",           toStore: "Block A Project Store", quantity: 2,   unit: "Tonnes",  type: "Transfer",   reference: "TRF-038", remarks: "" },
  { id: "MOV-009", date: "May 25, 2025", material: "Sand",                    category: "Aggregates", fromStore: "Vendor (Receipt)",        toStore: "General Store",         quantity: 50,  unit: "Tonnes",  type: "Receipt",    reference: "GRN-021", remarks: "" },
  { id: "MOV-010", date: "May 22, 2025", material: "2.5mm Twin Cable",        category: "Electrical", fromStore: "General Store",           toStore: "Block A Project Store", quantity: 200, unit: "Metres",  type: "Issue",      reference: "REQ-028", remarks: "Electrical phase 2" },
  { id: "MOV-011", date: "May 20, 2025", material: "Electrical Conduit 25mm", category: "Electrical", fromStore: "—",                       toStore: "General Store",         quantity: 200, unit: "Metres",  type: "Receipt",    reference: "GRN-020", remarks: "Opening stock adjustment" },
  { id: "MOV-012", date: "May 18, 2025", material: "Flush Doors",             category: "Finishes",  fromStore: "Block C Project Store",   toStore: "General Store",         quantity: 6,   unit: "Units",   type: "Return",     reference: "RET-006", remarks: "Unused doors returned" },
];

const TYPES: (MovementType | "All")[] = ["All", "Transfer", "Issue", "Receipt", "Return", "Adjustment"];
const STORES = ["All Stores", "General Store", "Block A Project Store", "Block B Project Store", "Block C Project Store"];
const MATERIALS = ["Cement (50kg bag)", "Steel Rebar Y16", "Steel Rebar Y12", "Binding Wire", "Concrete Block 9 Inch", "Formwork Plywood", "PVC Pipes 2 Inch", "Sand", "Flush Doors", "2.5mm Twin Cable"];

const BLANK_FORM = {
  material: MATERIALS[0], category: "Concrete", fromStore: STORES[1], toStore: STORES[0],
  quantity: 1, unit: "Units", type: "Adjustment" as MovementType, reference: "", remarks: "",
};

export function StockMovementPage() {
  const [movements, setMovements] = useState<Movement[]>(MOCK);
  const [view, setView] = useState<"material" | "store">("material");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "All">("All");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<typeof BLANK_FORM>({ ...BLANK_FORM });
  const { getNextId } = useNumbering();

  const filtered = movements.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = m.material.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q);
    const matchType = typeFilter === "All" || m.type === typeFilter;
    const matchStore = storeFilter === "All Stores" || m.fromStore === storeFilter || m.toStore === storeFilter;
    return matchSearch && matchType && matchStore;
  });

  function record() {
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newMov: Movement = {
      ...form,
      id: getNextId("StockMovement"),
      date: now,
    };
    setMovements([newMov, ...movements]);
    setShowModal(false);
    setForm({ ...BLANK_FORM });
  }

  function exportCSV() {
    const rows = [
      ["Movement ID", "Date", "Material", "Category", "From Store", "To Store", "Quantity", "Unit", "Type", "Reference", "Remarks"],
      ...filtered.map((m) => [m.id, m.date, m.material, m.category, m.fromStore, m.toStore, m.quantity, m.unit, m.type, m.reference, m.remarks]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "stock_movement.csv";
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Movement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Unified hub for all material movements — transfers, issues, receipts and returns</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setForm({ ...BLANK_FORM }); setShowModal(true); }}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
            <Plus className="w-4 h-4" /> Record Movement
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setView("material")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === "material" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <LayoutList className="w-4 h-4" /> Material-Level View
        </button>
        <button onClick={() => setView("store")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === "store" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <Building2 className="w-4 h-4" /> Store-Based View
        </button>
      </div>

      {view === "material" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Search material, reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-400" />
              {TYPES.map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${typeFilter === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {t}
                </button>
              ))}
            </div>
            <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              {STORES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {["Movement ID", "Date", "Material", "From Store", "To Store", "Qty", "Unit", "Type", "Reference"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">No movements found.</td></tr>
                )}
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.id}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.date}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{m.material}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.fromStore}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {m.toStore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{m.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{m.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[m.type]}`}>{m.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Showing {filtered.length} of {movements.length} movements</p>
        </>
      )}

      {view === "store" && (
        <div className="space-y-4">
          {STORES.filter(s => s !== "All Stores").map(store => {
            const outbound = movements.filter(m => m.fromStore === store && m.type !== "Receipt");
            const inbound  = movements.filter(m => m.toStore   === store && m.type !== "Return");
            const returns  = movements.filter(m => m.fromStore === store && m.type === "Return");

            return (
              <div key={store} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-800 text-sm">{store}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="text-blue-600 font-medium">{outbound.length} out</span>
                    <span className="text-green-600 font-medium">{inbound.length} in</span>
                    <span className="text-yellow-600 font-medium">{returns.length} returns</span>
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
                      <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400 text-xs">No activity for this store.</td></tr>
                    )}
                    {[...inbound.map(m => ({ ...m, dir: "IN" as const })),
                      ...outbound.map(m => ({ ...m, dir: "OUT" as const })),
                      ...returns.map(m => ({ ...m, dir: "RET" as const }))].map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900 font-medium text-xs">{m.material}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{m.date}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs font-semibold">{m.quantity} {m.unit}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold ${m.dir === "IN" ? "text-green-600" : m.dir === "OUT" ? "text-blue-600" : "text-yellow-600"}`}>
                            {m.dir}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {m.dir === "IN" ? m.fromStore : m.toStore}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[m.type]}`}>{m.type}</span>
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
              <h2 className="text-lg font-semibold text-gray-900">Record Manual Movement</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Movement Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MovementType })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                  {["Transfer", "Issue", "Receipt", "Return", "Adjustment"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                  <input type="number" min={1} value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Store</label>
                <select value={form.fromStore} onChange={(e) => setForm({ ...form, fromStore: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                  {STORES.filter((s) => s !== "All Stores").map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Store</label>
                <select value={form.toStore} onChange={(e) => setForm({ ...form, toStore: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                  {STORES.filter((s) => s !== "All Stores").map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference (optional)</label>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="e.g. TRF-042, GRN-023"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={record} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
