import { useState } from "react";
import {
  Package, Search, Filter, Plus, Edit, Archive,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, MoreHorizontal, Download,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";

const categories = ["All", "Concrete & Masonry", "Steel & Ironmongery", "Electrical", "Plumbing & MEP", "Timber & Formwork", "Finishes", "Plant & Equipment", "General"];

const materials = [
  { id: "MAT-001", name: "Concrete Block 9 Inch", category: "Concrete & Masonry", unit: "Units", currentStock: 8500, minStock: 5000, unitCost: 350, supplier: "CemCo Nigeria", status: "in_stock" },
  { id: "MAT-002", name: "Steel Rebar Y12", category: "Steel & Ironmongery", unit: "Tonnes", currentStock: 28, minStock: 20, unitCost: 380000, supplier: "SteelMart Int'l", status: "in_stock" },
  { id: "MAT-003", name: "Steel Rebar Y16", category: "Steel & Ironmongery", unit: "Tonnes", currentStock: 12, minStock: 50, unitCost: 410000, supplier: "SteelMart Int'l", status: "low_stock" },
  { id: "MAT-004", name: "Cement (50kg bags)", category: "Concrete & Masonry", unit: "Bags", currentStock: 320, minStock: 500, unitCost: 8500, supplier: "DangCem Enterprises", status: "low_stock" },
  { id: "MAT-005", name: "Electrical Conduit 25mm", category: "Electrical", unit: "Metres", currentStock: 0, minStock: 500, unitCost: 1200, supplier: "ElectraHub", status: "out_of_stock" },
  { id: "MAT-006", name: "Plywood Formwork 18mm", category: "Timber & Formwork", unit: "Sheets", currentStock: 180, minStock: 300, unitCost: 14500, supplier: "BuildPlus Supplies", status: "low_stock" },
  { id: "MAT-007", name: "PVC Pipe 110mm", category: "Plumbing & MEP", unit: "Metres", currentStock: 40, minStock: 200, unitCost: 3800, supplier: "PlumbTech Ltd", status: "low_stock" },
  { id: "MAT-008", name: "Binding Wire", category: "Steel & Ironmongery", unit: "Rolls", currentStock: 450, minStock: 100, unitCost: 2800, supplier: "SteelMart Int'l", status: "in_stock" },
  { id: "MAT-009", name: "BRC Mesh A193", category: "Steel & Ironmongery", unit: "Sheets", currentStock: 220, minStock: 100, unitCost: 48000, supplier: "SteelMart Int'l", status: "in_stock" },
  { id: "MAT-010", name: "Sand (River)", category: "Concrete & Masonry", unit: "Tonnes", currentStock: 0, minStock: 200, unitCost: 25000, supplier: "Alpha Aggregates", status: "out_of_stock" },
  { id: "MAT-011", name: "Granite 3/4 Inch", category: "Concrete & Masonry", unit: "Tonnes", currentStock: 95, minStock: 80, unitCost: 35000, supplier: "Alpha Aggregates", status: "in_stock" },
  { id: "MAT-012", name: "2.5mm Twin Cable", category: "Electrical", unit: "Metres", currentStock: 1800, minStock: 500, unitCost: 850, supplier: "ElectraHub", status: "in_stock" },
  { id: "MAT-013", name: "Ceramic Tiles 600x600", category: "Finishes", unit: "Cartons", currentStock: 280, minStock: 150, unitCost: 28000, supplier: "TileWorld", status: "in_stock" },
  { id: "MAT-014", name: "Water Pipe 63mm HDPE", category: "Plumbing & MEP", unit: "Metres", currentStock: 0, minStock: 300, unitCost: 2900, supplier: "PlumbTech Ltd", status: "out_of_stock" },
  { id: "MAT-015", name: "Timber Props (3m)", category: "Timber & Formwork", unit: "Pieces", currentStock: 640, minStock: 200, unitCost: 3500, supplier: "BuildPlus Supplies", status: "in_stock" },
];

const statusConfig: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  in_stock: { label: "In Stock", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" /> },
  low_stock: { label: "Low Stock", badge: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
  out_of_stock: { label: "Out of Stock", badge: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
};

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
  return `₦${n}`;
}

type MatSortKey = "name" | "category" | "currentStock" | "unitCost" | "stockValue" | "status";
type SortDir = "asc" | "desc";

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<MatSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(k: MatSortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: MatSortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />;
  }

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || m.category === activeCategory;
    const matchStatus = statusFilter === "All" || m.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  }).sort((a, b) => {
    let v = 0;
    if (sortKey === "name") v = a.name.localeCompare(b.name);
    else if (sortKey === "category") v = a.category.localeCompare(b.category);
    else if (sortKey === "currentStock") v = a.currentStock - b.currentStock;
    else if (sortKey === "unitCost") v = a.unitCost - b.unitCost;
    else if (sortKey === "stockValue") v = (a.currentStock * a.unitCost) - (b.currentStock * b.unitCost);
    else if (sortKey === "status") v = a.status.localeCompare(b.status);
    return sortDir === "asc" ? v : -v;
  });

  const counts = {
    in_stock: materials.filter(m => m.status === "in_stock").length,
    low_stock: materials.filter(m => m.status === "low_stock").length,
    out_of_stock: materials.filter(m => m.status === "out_of_stock").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">{materials.length} items across {categories.length - 1} categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Material ID", "Name", "Category", "Unit", "Current Stock", "Min Level", "Unit Cost", "Stock Value", "Status", "Supplier"];
            const rows = filtered.map(m => [m.id, m.name, m.category, m.unit, String(m.currentStock), String(m.minStock), fmt(m.unitCost), fmt(m.currentStock * m.unitCost), statusConfig[m.status as keyof typeof statusConfig].label, m.supplier]);
            exportCSV("inventory-materials", headers, rows);
          }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800">
            <Plus className="w-3.5 h-3.5" /> Add Material
          </button>
        </div>
      </div>

      {/* Status summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "in_stock", label: "In Stock", count: counts.in_stock, color: "border-green-200 bg-green-50", textColor: "text-green-700" },
          { key: "low_stock", label: "Low Stock", count: counts.low_stock, color: "border-amber-200 bg-amber-50", textColor: "text-amber-700" },
          { key: "out_of_stock", label: "Out of Stock", count: counts.out_of_stock, color: "border-red-200 bg-red-50", textColor: "text-red-700" },
        ].map(tile => (
          <button
            key={tile.key}
            onClick={() => setStatusFilter(statusFilter === tile.key ? "All" : tile.key)}
            className={`p-4 rounded-lg border text-left transition-all ${tile.color} ${statusFilter === tile.key ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
          >
            <p className={`text-2xl font-bold ${tile.textColor}`}>{tile.count}</p>
            <p className="text-sm text-gray-600 mt-0.5">{tile.label}</p>
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors ${activeCategory === cat ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Material<SortIcon col="name" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("category")}>
                <div className="flex items-center gap-1">Category<SortIcon col="category" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Unit</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer" onClick={() => handleSort("currentStock")}>
                <div className="flex items-center justify-end gap-1">Current Stock<SortIcon col="currentStock" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Min Level</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer" onClick={() => handleSort("unitCost")}>
                <div className="flex items-center justify-end gap-1">Unit Cost<SortIcon col="unitCost" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer" onClick={() => handleSort("stockValue")}>
                <div className="flex items-center justify-end gap-1">Stock Value<SortIcon col="stockValue" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1">Status<SortIcon col="status" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Supplier</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(m => {
              const cfg = statusConfig[m.status];
              const stockValue = m.currentStock * m.unitCost;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.category}</td>
                  <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${m.currentStock === 0 ? "text-red-600" : m.currentStock < m.minStock ? "text-amber-600" : "text-gray-900"}`}>
                      {m.currentStock.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{m.minStock.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(m.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(stockValue)}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.supplier}</td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)} className="p-1 rounded hover:bg-gray-100">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === m.id && (
                      <div className="absolute right-8 top-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Edit className="w-3.5 h-3.5" /> Edit</button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Archive className="w-3.5 h-3.5" /> Archive</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No materials match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
