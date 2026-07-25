import { Store, FolderOpen, ArrowLeftRight, AlertTriangle, TrendingDown, Package, DollarSign, CheckCircle2, Clock } from "lucide-react";

const stats = [
  { label: "Total Stock Value",    value: "₦142.8M", sub: "Across all stores",        icon: DollarSign,    color: "text-teal-600 bg-teal-50" },
  { label: "Available Materials",  value: "312",     sub: "Unique SKUs in stock",      icon: Package,       color: "text-blue-600 bg-blue-50" },
  { label: "Pending Requests",     value: "14",      sub: "Awaiting processing",       icon: Clock,         color: "text-yellow-600 bg-yellow-50" },
  { label: "Approved Transfers",   value: "27",      sub: "This month",               icon: CheckCircle2,  color: "text-green-600 bg-green-50" },
  { label: "Low Stock Alerts",     value: "18",      sub: "Below reorder level",       icon: AlertTriangle, color: "text-red-500 bg-red-50" },
];

const stores = [
  { name: "General Store",       items: 224, lowStock: 8,  lastActivity: "Today, 09:12 AM", icon: Store,      color: "bg-teal-600" },
  { name: "Block A Project Store", items: 45, lowStock: 4, lastActivity: "Today, 08:45 AM", icon: FolderOpen, color: "bg-blue-600" },
  { name: "Block B Project Store", items: 31, lowStock: 2, lastActivity: "Yesterday",        icon: FolderOpen, color: "bg-purple-600" },
  { name: "Block C Project Store", items: 12, lowStock: 4, lastActivity: "Jun 2, 2025",      icon: FolderOpen, color: "bg-orange-600" },
];

const recentTransfers = [
  { id: "TRF-041", from: "General Store", to: "Block A Project Store", items: 3, date: "Today, 09:00 AM", status: "Completed" },
  { id: "TRF-040", from: "General Store", to: "Block B Project Store", items: 5, date: "Yesterday",        status: "Completed" },
  { id: "TRF-039", from: "Block A",       to: "Block C Project Store", items: 2, date: "Jun 3, 2025",      status: "Pending"   },
];

export function StorefrontDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Storefront</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of stores, stock levels, and transfers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stores */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Stores Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          {stores.map((store) => (
            <div key={store.name} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${store.color} flex items-center justify-center`}>
                <store.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{store.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{store.items} items · {store.lowStock} low stock</p>
                <p className="text-xs text-gray-400 mt-0.5">Last activity: {store.lastActivity}</p>
              </div>
              {store.lowStock > 0 && (
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                  {store.lowStock} low
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transfers */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Transfers</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                {["Transfer ID", "From", "To", "Items", "Date", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransfers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.id}</td>
                  <td className="px-4 py-3 text-gray-700">{t.from}</td>
                  <td className="px-4 py-3 text-gray-700">{t.to}</td>
                  <td className="px-4 py-3 text-gray-600">{t.items}</td>
                  <td className="px-4 py-3 text-gray-500">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "Completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
