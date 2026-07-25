import { useNavigate } from "react-router";
import {
  Package, AlertTriangle, ShoppingCart, DollarSign,
  ArrowRight, ArrowUpRight, TrendingDown, CheckCircle,
  Clock, Truck, PackageCheck, ChevronRight,
} from "lucide-react";

const kpis = [
  { label: "Total Materials", value: "148", sub: "12 categories", icon: <Package className="w-5 h-5" />, color: "text-blue-600 bg-blue-100" },
  { label: "Low Stock Items", value: "11", sub: "Requires reorder", icon: <AlertTriangle className="w-5 h-5" />, color: "text-amber-600 bg-amber-100" },
  { label: "Out of Stock", value: "4", sub: "Action required", icon: <TrendingDown className="w-5 h-5" />, color: "text-red-600 bg-red-100" },
  { label: "Pending Requests", value: "18", sub: "Awaiting approval", icon: <Clock className="w-5 h-5" />, color: "text-purple-600 bg-purple-100" },
  { label: "Open POs", value: "7", sub: "₦6.2M outstanding", icon: <Truck className="w-5 h-5" />, color: "text-green-600 bg-green-100" },
  { label: "Procurement Spend", value: "₦42M", sub: "This month", icon: <DollarSign className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-100" },
];

const lowStockItems = [
  { name: "Concrete Blocks", current: 3200, min: 5000, unit: "Units", category: "Masonry" },
  { name: "Steel Rebars Y16", current: 12, min: 50, unit: "Tonnes", category: "Steel" },
  { name: "Electrical Conduit 25mm", current: 0, min: 500, unit: "Metres", category: "Electrical" },
  { name: "Plywood Formwork", current: 180, min: 300, unit: "Sheets", category: "Timber" },
  { name: "PVC Pipes 110mm", current: 40, min: 200, unit: "Metres", category: "Plumbing" },
];

const recentRequests = [
  { id: "MR-0041", project: "Downtown Office Complex", requestedBy: "Aisha Bello", items: 3, status: "pending", date: "Apr 9, 2026", urgency: "urgent" },
  { id: "MR-0040", project: "Riverside Residential", requestedBy: "Sarah Johnson", items: 5, status: "approved", date: "Apr 8, 2026", urgency: "normal" },
  { id: "MR-0039", project: "Highway Interchange", requestedBy: "Robert Lee", items: 2, status: "pending", date: "Apr 8, 2026", urgency: "urgent" },
  { id: "MR-0038", project: "Industrial Warehouse", requestedBy: "Mike Davis", items: 4, status: "approved", date: "Apr 7, 2026", urgency: "normal" },
  { id: "MR-0037", project: "University Science Block", requestedBy: "Alice Ware", items: 1, status: "rejected", date: "Apr 7, 2026", urgency: "normal" },
];

const openPOs = [
  { id: "PO-0031", supplier: "CemCo Nigeria Ltd", total: 1840000, status: "confirmed", eta: "Apr 12, 2026" },
  { id: "PO-0030", supplier: "SteelMart International", total: 3200000, status: "sent", eta: "Apr 15, 2026" },
  { id: "PO-0029", supplier: "BuildPlus Supplies", total: 672000, status: "confirmed", eta: "Apr 11, 2026" },
  { id: "PO-0028", supplier: "ElectraHub", total: 350000, status: "draft", eta: "TBD" },
];

const spendByCategory = [
  { category: "Concrete & Masonry", amount: 14200000, pct: 34 },
  { category: "Steel & Ironmongery", amount: 10920000, pct: 26 },
  { category: "Electrical", amount: 6720000, pct: 16 },
  { category: "Plumbing & MEP", amount: 5460000, pct: 13 },
  { category: "Timber & Formwork", amount: 4620000, pct: 11 },
];

const reqStatusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const poStatusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
  return `₦${n}`;
}

export function ProcurementDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Procurement Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventory, requests, and purchasing overview — April 2026</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/apps/procurement/material-requests")} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Clock className="w-3.5 h-3.5" /> Material Requests
          </button>
          <button onClick={() => navigate("/apps/procurement")} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800">
            <Package className="w-3.5 h-3.5" /> All Materials
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">{k.label}</p>
              <span className={`p-1.5 rounded-md ${k.color}`}>{k.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-lg border border-amber-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">Low Stock Alerts</h2>
          </div>
          <button onClick={() => navigate("/apps/procurement/stock-levels")} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2.5">
          {lowStockItems.map(item => {
            const pct = Math.round((item.current / item.min) * 100);
            const isOut = item.current === 0;
            return (
              <div key={item.name} className={`flex items-center gap-4 p-3 rounded-lg border ${isOut ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-100"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{item.category}</span>
                    {isOut && <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Out of Stock</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Current: <span className={`font-medium ${isOut ? "text-red-600" : "text-amber-700"}`}>{item.current.toLocaleString()} {item.unit}</span> · Min: {item.min.toLocaleString()} {item.unit}</p>
                </div>
                <div className="w-28 flex-shrink-0">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${isOut ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-right mt-0.5 text-gray-400">{pct}% of min</p>
                </div>
                <button className="flex-shrink-0 text-xs px-2.5 py-1.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800">
                  Reorder
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Recent Material Requests */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Material Requests</h2>
            <button onClick={() => navigate("/apps/procurement/material-requests")} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRequests.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{r.id}</p>
                    {r.urgency === "urgent" && <span className="text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-medium">Urgent</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{r.project} · {r.requestedBy} · {r.items} item{r.items > 1 ? "s" : ""}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{r.date}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${reqStatusBadge[r.status]}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">
          {/* Open POs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Open Purchase Orders</h2>
              <button onClick={() => navigate("/apps/procurement/purchase-orders")} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {openPOs.map(po => (
                <div key={po.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{po.id}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{po.supplier}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{fmt(po.total)}</p>
                    <p className="text-xs text-gray-400">ETA: {po.eta}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize flex-shrink-0 ${poStatusBadge[po.status]}`}>{po.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spend by category */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Spend by Category</h2>
            <div className="space-y-3">
              {spendByCategory.map(s => (
                <div key={s.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 truncate flex-1">{s.category}</span>
                    <span className="text-xs font-medium text-gray-900 ml-2">{s.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">Total this month</span>
              <span className="font-bold text-gray-900">₦42.0M</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
