import { useState } from "react";
import { BarChart3, TrendingDown, ArrowLeftRight, RotateCcw, Download, Package } from "lucide-react";

type ReportType = "Stock Levels" | "Movement" | "Transfer" | "Return";

const REPORT_CARDS = [
  { type: "Stock Levels" as ReportType,  icon: Package,       color: "bg-teal-50 text-teal-600",   title: "Stock Levels Report",   desc: "Current stock quantities, values, and reorder status across all stores." },
  { type: "Movement" as ReportType,      icon: TrendingDown,  color: "bg-blue-50 text-blue-600",   title: "Movement Report",       desc: "All material movements — receipts, issues, transfers, and returns." },
  { type: "Transfer" as ReportType,      icon: ArrowLeftRight,color: "bg-purple-50 text-purple-600",title: "Transfer Report",       desc: "Store-to-store transfer history with status and quantities." },
  { type: "Return" as ReportType,        icon: RotateCcw,     color: "bg-yellow-50 text-yellow-600",title: "Return Report",         desc: "All material return requests and outcomes with condition notes." },
];

// ── Stock Levels data ──────────────────────────────────────────────────────────
const STOCK_DATA = [
  { material: "Cement (50kg bag)", category: "Concrete",   store: "General Store",           qty: 260, reorder: 100, value: 2210000, status: "In Stock" },
  { material: "Steel Rebar Y16",   category: "Steel",      store: "General Store",           qty: 10,  reorder: 5,   value: 4100000, status: "In Stock" },
  { material: "Electrical Conduit",category: "Electrical", store: "General Store",           qty: 45,  reorder: 200, value: 54000,   status: "Low Stock" },
  { material: "Concrete Block 9\"",category: "Concrete",   store: "General Store",           qty: 3500,reorder: 1000,value: 1225000, status: "In Stock" },
  { material: "Cement (50kg bag)", category: "Concrete",   store: "Block A Project Store",   qty: 150, reorder: 50,  value: 1275000, status: "In Stock" },
  { material: "PVC Pipes 2 Inch",  category: "Plumbing",   store: "Block A Project Store",   qty: 0,   reorder: 20,  value: 0,       status: "Out of Stock" },
  { material: "Flush Doors",       category: "Finishes",   store: "General Store",           qty: 14,  reorder: 10,  value: 630000,  status: "In Stock" },
  { material: "2.5mm Twin Cable",  category: "Electrical", store: "General Store",           qty: 80,  reorder: 300, value: 68000,   status: "Low Stock" },
];

// ── Transfer summary data ──────────────────────────────────────────────────────
const TRANSFER_DATA = [
  { ref: "TRF-041", from: "General Store", to: "Block A", items: 2, qty: 110, date: "Jun 4, 2025",  status: "Completed", value: 1015000 },
  { ref: "TRF-040", from: "General Store", to: "Block B", items: 1, qty: 500, date: "Jun 3, 2025",  status: "In Transit",value: 175000  },
  { ref: "TRF-039", from: "Block A",       to: "Block C", items: 1, qty: 5,   date: "Jun 2, 2025",  status: "Pending",   value: 70000   },
  { ref: "TRF-038", from: "General Store", to: "Block A", items: 1, qty: 2,   date: "May 28, 2025", status: "Completed", value: 820000  },
];

// ── Return summary data ────────────────────────────────────────────────────────
const RETURN_DATA = [
  { ref: "RET-009", material: "Cement (50kg bag)", qty: 30,  unit: "Bags",    from: "Block B", to: "General Store", condition: "Good",    status: "Pending Approval", date: "Jun 4, 2025"  },
  { ref: "RET-008", material: "Binding Wire",       qty: 5,   unit: "Rolls",   from: "Block A", to: "General Store", condition: "Good",    status: "Approved",         date: "Jun 3, 2025"  },
  { ref: "RET-007", material: "Cement (50kg bag)", qty: 30,  unit: "Bags",    from: "Block B", to: "General Store", condition: "Good",    status: "Received",         date: "Jun 1, 2025"  },
  { ref: "RET-006", material: "Flush Doors",        qty: 6,   unit: "Units",   from: "Block C", to: "General Store", condition: "Good",    status: "Received",         date: "May 18, 2025" },
  { ref: "RET-005", material: "Formwork Plywood",   qty: 3,   unit: "Sheets",  from: "Block A", to: "General Store", condition: "Damaged", status: "Rejected",         date: "May 15, 2025" },
];

// ── Movement summary (same as StockMovementPage but aggregated) ────────────────
const MOVEMENT_DATA = [
  { id: "MOV-001", date: "Jun 4, 2025",  material: "Cement (50kg bag)",     from: "General Store", to: "Block A", qty: 100, type: "Transfer" },
  { id: "MOV-003", date: "Jun 3, 2025",  material: "Concrete Block 9\"",    from: "General Store", to: "Block B", qty: 500, type: "Transfer" },
  { id: "MOV-004", date: "Jun 3, 2025",  material: "Steel Rebar Y16",       from: "Vendor",        to: "General Store", qty: 5, type: "Receipt" },
  { id: "MOV-006", date: "Jun 1, 2025",  material: "Cement (50kg bag)",     from: "Block B",       to: "General Store", qty: 30, type: "Return" },
  { id: "MOV-007", date: "May 30, 2025", material: "PVC Pipes 2 Inch",      from: "General Store", to: "Block A", qty: 20, type: "Issue" },
  { id: "MOV-010", date: "May 22, 2025", material: "2.5mm Twin Cable",      from: "General Store", to: "Block A", qty: 200, type: "Issue" },
];

const STATUS_STYLE: Record<string, string> = {
  "In Stock":         "bg-green-50 text-green-700",
  "Low Stock":        "bg-yellow-50 text-yellow-700",
  "Out of Stock":     "bg-red-50 text-red-700",
  Completed:          "bg-green-50 text-green-700",
  "In Transit":       "bg-blue-50 text-blue-700",
  Pending:            "bg-yellow-50 text-yellow-700",
  "Pending Approval": "bg-yellow-50 text-yellow-700",
  Approved:           "bg-blue-50 text-blue-700",
  Received:           "bg-green-50 text-green-700",
  Rejected:           "bg-red-50 text-red-700",
};

const MOVEMENT_TYPE_STYLE: Record<string, string> = {
  Transfer:   "bg-blue-50 text-blue-700",
  Issue:      "bg-purple-50 text-purple-700",
  Receipt:    "bg-green-50 text-green-700",
  Return:     "bg-yellow-50 text-yellow-700",
};

export function StorefrontReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("Stock Levels");

  function exportCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = [headers, ...data.map((row) => headers.map((h) => row[h]))];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = filename;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventory and distribution analytics</p>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-4 gap-4">
        {REPORT_CARDS.map(({ type, icon: Icon, color, title, desc }) => (
          <button key={type} onClick={() => setActiveReport(type)}
            className={`rounded-xl border p-4 text-left transition-colors ${activeReport === type ? "border-teal-600 ring-2 ring-teal-100 bg-white" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </span>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── Stock Levels ─────────────────────────────────────────────────── */}
      {activeReport === "Stock Levels" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Stock Levels Report</h2>
            <button onClick={() => exportCSV(STOCK_DATA as unknown as Record<string, unknown>[], "stock_levels.csv")}
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Materials",  value: STOCK_DATA.length },
              { label: "In Stock",         value: STOCK_DATA.filter((s) => s.status === "In Stock").length },
              { label: "Low Stock",        value: STOCK_DATA.filter((s) => s.status === "Low Stock").length },
              { label: "Out of Stock",     value: STOCK_DATA.filter((s) => s.status === "Out of Stock").length },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>{["Material", "Category", "Store", "Qty", "Reorder Lvl", "Stock Value (₦)", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {STOCK_DATA.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.material}</td>
                    <td className="px-4 py-3 text-gray-600">{s.category}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.store}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{s.qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{s.reorder.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{s.value.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[s.status]}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-sm text-teal-800 font-medium">Total Stock Value</p>
            <p className="text-2xl font-bold text-teal-900 mt-1">₦{STOCK_DATA.reduce((sum, s) => sum + s.value, 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ── Movement Report ───────────────────────────────────────────────── */}
      {activeReport === "Movement" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Movement Report</h2>
            <button onClick={() => exportCSV(MOVEMENT_DATA as unknown as Record<string, unknown>[], "movement_report.csv")}
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(["Transfer", "Issue", "Receipt", "Return"] as const).map((t) => (
              <div key={t} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{MOVEMENT_DATA.filter((m) => m.type === t).length}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t}s</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>{["ID", "Date", "Material", "From", "To", "Qty", "Type"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOVEMENT_DATA.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.id}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.material}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.from}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.to}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{m.qty}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_TYPE_STYLE[m.type]}`}>{m.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Transfer Report ───────────────────────────────────────────────── */}
      {activeReport === "Transfer" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Transfer Report</h2>
            <button onClick={() => exportCSV(TRANSFER_DATA as unknown as Record<string, unknown>[], "transfer_report.csv")}
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Transfers",     value: TRANSFER_DATA.length },
              { label: "Completed",           value: TRANSFER_DATA.filter((t) => t.status === "Completed").length },
              { label: "In Transit",          value: TRANSFER_DATA.filter((t) => t.status === "In Transit").length },
              { label: "Pending",             value: TRANSFER_DATA.filter((t) => t.status === "Pending").length },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>{["Reference", "From", "To", "Items", "Total Qty", "Value (₦)", "Date", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TRANSFER_DATA.map((t) => (
                  <tr key={t.ref} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.ref}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.from}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.to}</td>
                    <td className="px-4 py-3 text-gray-600">{t.items}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{t.qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{t.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[t.status]}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-sm text-purple-800 font-medium">Total Transfer Value</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">₦{TRANSFER_DATA.reduce((s, t) => s + t.value, 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ── Return Report ─────────────────────────────────────────────────── */}
      {activeReport === "Return" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Return Report</h2>
            <button onClick={() => exportCSV(RETURN_DATA as unknown as Record<string, unknown>[], "return_report.csv")}
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Returns",       value: RETURN_DATA.length },
              { label: "Received",            value: RETURN_DATA.filter((r) => r.status === "Received").length },
              { label: "Pending Approval",    value: RETURN_DATA.filter((r) => r.status === "Pending Approval").length },
              { label: "Rejected",            value: RETURN_DATA.filter((r) => r.status === "Rejected").length },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>{["Reference", "Material", "Qty", "From", "To", "Condition", "Date", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {RETURN_DATA.map((r) => (
                  <tr key={r.ref} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.ref}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.material}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{r.qty} <span className="text-gray-400 font-normal text-xs">{r.unit}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.from}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.to}</td>
                    <td className="px-4 py-3 text-gray-600">{r.condition}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
