import { useState } from "react";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, Plus,
  Minus, RefreshCw, Search, Filter, CheckCircle, XCircle,
  ChevronUp, ChevronDown, Download,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";

const stockItems = [
  { id: "MAT-001", name: "Concrete Block 9 Inch", category: "Concrete & Masonry", unit: "Units", current: 8500, min: 5000, max: 15000, reorderQty: 6000, location: "Yard A", lastUpdated: "Apr 9, 10:22" },
  { id: "MAT-002", name: "Steel Rebar Y12", category: "Steel & Ironmongery", unit: "Tonnes", current: 28, min: 20, max: 100, reorderQty: 50, location: "Shed 1", lastUpdated: "Apr 9, 09:15" },
  { id: "MAT-003", name: "Steel Rebar Y16", category: "Steel & Ironmongery", unit: "Tonnes", current: 12, min: 50, max: 120, reorderQty: 60, location: "Shed 1", lastUpdated: "Apr 8, 16:40" },
  { id: "MAT-004", name: "Cement (50kg bags)", category: "Concrete & Masonry", unit: "Bags", current: 320, min: 500, max: 2000, reorderQty: 1000, location: "Shed 2", lastUpdated: "Apr 9, 08:00" },
  { id: "MAT-005", name: "Electrical Conduit 25mm", category: "Electrical", unit: "Metres", current: 0, min: 500, max: 3000, reorderQty: 1500, location: "Electrical Store", lastUpdated: "Apr 7, 14:30" },
  { id: "MAT-006", name: "Plywood Formwork 18mm", category: "Timber & Formwork", unit: "Sheets", current: 180, min: 300, max: 800, reorderQty: 400, location: "Timber Yard", lastUpdated: "Apr 9, 11:05" },
  { id: "MAT-007", name: "PVC Pipe 110mm", category: "Plumbing & MEP", unit: "Metres", current: 40, min: 200, max: 1000, reorderQty: 500, location: "Plumbing Store", lastUpdated: "Apr 8, 13:20" },
  { id: "MAT-008", name: "Binding Wire", category: "Steel & Ironmongery", unit: "Rolls", current: 450, min: 100, max: 600, reorderQty: 200, location: "Shed 1", lastUpdated: "Apr 9, 07:45" },
  { id: "MAT-009", name: "BRC Mesh A193", category: "Steel & Ironmongery", unit: "Sheets", current: 220, min: 100, max: 500, reorderQty: 200, location: "Shed 1", lastUpdated: "Apr 8, 15:30" },
  { id: "MAT-010", name: "Sand (River)", category: "Concrete & Masonry", unit: "Tonnes", current: 0, min: 200, max: 800, reorderQty: 400, location: "Yard B", lastUpdated: "Apr 6, 09:00" },
  { id: "MAT-011", name: "Granite 3/4 Inch", category: "Concrete & Masonry", unit: "Tonnes", current: 95, min: 80, max: 400, reorderQty: 200, location: "Yard B", lastUpdated: "Apr 9, 07:00" },
  { id: "MAT-012", name: "2.5mm Twin Cable", category: "Electrical", unit: "Metres", current: 1800, min: 500, max: 5000, reorderQty: 2000, location: "Electrical Store", lastUpdated: "Apr 9, 10:50" },
];

function getStatus(item: typeof stockItems[0]) {
  if (item.current === 0) return "out_of_stock";
  if (item.current < item.min) return "low_stock";
  if (item.current > item.max * 0.9) return "overstocked";
  return "in_stock";
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  in_stock: { label: "In Stock", badge: "bg-green-100 text-green-700" },
  low_stock: { label: "Low Stock", badge: "bg-amber-100 text-amber-700" },
  out_of_stock: { label: "Out of Stock", badge: "bg-red-100 text-red-700" },
  overstocked: { label: "Overstocked", badge: "bg-blue-100 text-blue-700" },
};

const adjustmentTypes = [
  { value: "recount", label: "Manual Recount" },
  { value: "damaged", label: "Damaged / Loss" },
  { value: "transfer", label: "Transfer In/Out" },
  { value: "return", label: "Return to Store" },
];

type SLSortKey = "name" | "category" | "current" | "min" | "max" | "status";
type SortDir = "asc" | "desc";

export function StockLevelsPage() {
  const [search, setSearch] = useState("");
  const [adjustModal, setAdjustModal] = useState<typeof stockItems[0] | null>(null);
  const [adjustType, setAdjustType] = useState("recount");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [sortKey, setSortKey] = useState<SLSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(k: SLSortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SLSortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />;
  }

  const filtered = stockItems.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const sa = getStatus(a); const sb = getStatus(b);
    let v = 0;
    if (sortKey === "name") v = a.name.localeCompare(b.name);
    else if (sortKey === "category") v = a.category.localeCompare(b.category);
    else if (sortKey === "current") v = a.current - b.current;
    else if (sortKey === "min") v = a.min - b.min;
    else if (sortKey === "max") v = a.max - b.max;
    else if (sortKey === "status") v = sa.localeCompare(sb);
    return sortDir === "asc" ? v : -v;
  });

  const statCounts = {
    in_stock: stockItems.filter(m => getStatus(m) === "in_stock").length,
    low_stock: stockItems.filter(m => getStatus(m) === "low_stock").length,
    out_of_stock: stockItems.filter(m => getStatus(m) === "out_of_stock").length,
    overstocked: stockItems.filter(m => getStatus(m) === "overstocked").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Levels</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time inventory tracking and manual adjustments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Material ID", "Name", "Category", "Unit", "Current", "Min", "Max", "Reorder Qty", "Status", "Location", "Last Updated"];
            const rows = filtered.map(m => [m.id, m.name, m.category, m.unit, String(m.current), String(m.min), String(m.max), String(m.reorderQty), statusConfig[getStatus(m)].label, m.location, m.lastUpdated]);
            exportCSV("stock-levels", headers, rows);
          }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Stock
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: "in_stock", label: "In Stock", color: "bg-green-50 border-green-200 text-green-700" },
          { key: "low_stock", label: "Low Stock", color: "bg-amber-50 border-amber-200 text-amber-700" },
          { key: "out_of_stock", label: "Out of Stock", color: "bg-red-50 border-red-200 text-red-700" },
          { key: "overstocked", label: "Overstocked", color: "bg-blue-50 border-blue-200 text-blue-700" },
        ].map(s => (
          <div key={s.key} className={`p-4 rounded-lg border ${s.color}`}>
            <p className="text-2xl font-bold">{statCounts[s.key as keyof typeof statCounts]}</p>
            <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search materials..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Material<SortIcon col="name" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Location</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer" onClick={() => handleSort("current")}>
                <div className="flex items-center justify-end gap-1">Current<SortIcon col="current" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer" onClick={() => handleSort("min")}>
                <div className="flex items-center justify-end gap-1">Min<SortIcon col="min" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer" onClick={() => handleSort("max")}>
                <div className="flex items-center justify-end gap-1">Max<SortIcon col="max" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Reorder Qty</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Stock Level</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1">Status<SortIcon col="status" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Last Updated</th>
              <th className="px-4 py-3 w-24 text-xs font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(item => {
              const status = getStatus(item);
              const cfg = statusConfig[status];
              const pct = item.max > 0 ? Math.min((item.current / item.max) * 100, 100) : 0;
              const barColor = status === "out_of_stock" ? "bg-red-400" : status === "low_stock" ? "bg-amber-400" : status === "overstocked" ? "bg-blue-400" : "bg-green-400";
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.id} · {item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.location}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-sm ${status === "out_of_stock" ? "text-red-600" : status === "low_stock" ? "text-amber-600" : "text-gray-900"}`}>
                      {item.current.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">{item.min.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">{item.max.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">{item.reorderQty.toLocaleString()}</td>
                  <td className="px-4 py-3 w-36">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{Math.round(pct)}%</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{item.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setAdjustModal(item); setAdjustQty(""); setAdjustNote(""); setAdjustType("recount"); }} className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded font-medium">
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Stock Adjustment</h2>
              <p className="text-sm text-gray-500 mt-0.5">{adjustModal.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adjustment Type</label>
                <select value={adjustType} onChange={e => setAdjustType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {adjustmentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {adjustType === "recount" ? "New Quantity" : "Quantity (+ or -)"}
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder={adjustType === "recount" ? "Actual count" : "e.g. -50 or +200"} value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">{adjustModal.unit}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Current: <strong>{adjustModal.current.toLocaleString()} {adjustModal.unit}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason / Notes</label>
                <textarea rows={2} placeholder="Reason for adjustment..." value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setAdjustModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={() => setAdjustModal(null)} className="px-4 py-2 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800">Save Adjustment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
