import { useEffect, useState } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  Package,
  TrendingDown,
  ShoppingCart,
  Building,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getMaterialRequests, getMaterials } from "../../api/materials";
import { fetchPurchaseOrders } from "../../api/purchase-orders";
import { fetchSuppliers } from "../../api/suppliers";
import {
  formatDateByGeneralSettings,
  formatTimeByGeneralSettings,
} from "../../utils/generalSettings";

export function ProcurementReportsPage() {
  const [dateRange, setDateRange] = useState("This Month");
  const [materials, setMaterials] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    getMaterials()
      .then(setMaterials)
      .catch(() => {});
    fetchPurchaseOrders()
      .then(setPurchaseOrders)
      .catch(() => {});
    getMaterialRequests()
      .then(setRequests)
      .catch(() => {});
    fetchSuppliers()
      .then(setSuppliers)
      .catch(() => {});
  }, []);

  const stockValue = materials.reduce(
    (sum, m) => sum + (m.availableQty ?? m.totalQty ?? 0) * (m.unitCost ?? 0),
    0,
  );
  const lowStock = materials.filter(
    (m) =>
      (m.availableQty ?? m.totalQty ?? 0) > 0 &&
      (m.availableQty ?? m.totalQty ?? 0) <= (m.reorderLevel ?? 0),
  ).length;
  const outOfStock = materials.filter(
    (m) => (m.availableQty ?? m.totalQty ?? 0) <= 0,
  ).length;
  const totalSpend = purchaseOrders.reduce(
    (sum, po) => sum + (po.totalValue || 0),
    0,
  );
  const averagePo = purchaseOrders.length
    ? totalSpend / purchaseOrders.length
    : 0;
  const categoryTotals = materials.reduce<Record<string, number>>((acc, m) => {
    const category = m.category || "Uncategorised";
    acc[category] =
      (acc[category] || 0) +
      (m.availableQty ?? m.totalQty ?? 0) * (m.unitCost ?? 0);
    return acc;
  }, {});
  const categoryTotal = Object.values(categoryTotals).reduce(
    (sum, val) => sum + val,
    0,
  );
  const categorySpend = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, value]) => ({
      cat,
      val: value / 1_000_000,
      pct: categoryTotal ? Math.round((value / categoryTotal) * 100) : 0,
      change: "Live",
      up: true,
    }));
  const spendTrend = [
    {
      month: new Date().toLocaleString("default", { month: "short" }),
      val: Number((totalSpend / 1_000_000).toFixed(1)),
    },
  ];
  const maxSpend = Math.max(...spendTrend.map((s) => s.val), 1);
  const recentRuns = [
    {
      id: "LIVE-STOCK",
      name: "Stock Report",
      format: "Live",
      runBy: "System",
      date: formatDateByGeneralSettings(new Date()),
      time: formatTimeByGeneralSettings(new Date()),
    },
    {
      id: "LIVE-SPEND",
      name: "Procurement Spend",
      format: "Live",
      runBy: "System",
      date: formatDateByGeneralSettings(new Date()),
      time: formatTimeByGeneralSettings(new Date()),
    },
  ];
  const reportTypes = [
    {
      id: "stock",
      title: "Stock Report",
      description:
        "Current inventory levels, valuation, and stock health overview across all material categories.",
      icon: <Package className="w-5 h-5 text-blue-600" />,
      color: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      lastRun: "Live",
      metrics: [
        { label: "Total Materials", value: String(materials.length) },
        {
          label: "Total Stock Value",
          value: `${getCurrencySymbol()}${(stockValue / 1_000_000).toFixed(1)}M`,
        },
        { label: "Low Stock Items", value: String(lowStock) },
        { label: "Out of Stock", value: String(outOfStock) },
      ],
    },
    {
      id: "consumption",
      title: "Material Requests",
      description:
        "Current request volume and pending material demand from site/store workflows.",
      icon: <TrendingDown className="w-5 h-5 text-amber-600" />,
      color: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      lastRun: "Live",
      metrics: [
        { label: "Total Requests", value: String(requests.length) },
        {
          label: "Pending",
          value: String(
            requests.filter((r) =>
              String(r.status).toLowerCase().includes("pending"),
            ).length,
          ),
        },
        { label: "Top Material", value: requests[0]?.materialName || "—" },
        { label: "Top Project", value: requests[0]?.projectName || "—" },
      ],
    },
    {
      id: "spend",
      title: "Procurement Spend",
      description:
        "Purchase order spend analysis by supplier, category, and project.",
      icon: <ShoppingCart className="w-5 h-5 text-green-600" />,
      color: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      lastRun: "Live",
      metrics: [
        {
          label: "Total Spend",
          value: `${getCurrencySymbol()}${(totalSpend / 1_000_000).toFixed(1)}M`,
        },
        { label: "No. of POs", value: String(purchaseOrders.length) },
        {
          label: "Avg PO Value",
          value: `${getCurrencySymbol()}${(averagePo / 1_000_000).toFixed(1)}M`,
        },
        {
          label: "Open POs",
          value: String(
            purchaseOrders.filter(
              (po) =>
                !["completed", "received"].includes(
                  String(po.status).toLowerCase(),
                ),
            ).length,
          ),
        },
      ],
    },
    {
      id: "supplier",
      title: "Supplier Performance",
      description: "Supplier coverage and active procurement relationships.",
      icon: <Building className="w-5 h-5 text-purple-600" />,
      color: "bg-purple-50 border-purple-200",
      iconBg: "bg-purple-100",
      lastRun: "Live",
      metrics: [
        { label: "Active Suppliers", value: String(suppliers.length) },
        {
          label: "Linked POs",
          value: String(purchaseOrders.filter((po) => po.supplier).length),
        },
        {
          label: "Top Supplier",
          value: purchaseOrders[0]?.supplier || suppliers[0]?.name || "—",
        },
        { label: "Compliance Docs", value: "Live" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Procurement Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate and review procurement analytics and operational insights
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>Q1 2026</option>
            <option>Year to Date</option>
          </select>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-2 gap-5">
        {reportTypes.map((report) => (
          <div
            key={report.id}
            className={`rounded-xl border p-5 ${report.color}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${report.iconBg}`}>
                  {report.icon}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {report.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {report.metrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-white rounded-md p-2.5 border border-white/60"
                >
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Last run: {report.lastRun}
              </p>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 bg-white rounded-md hover:bg-gray-50 font-medium">
                  <RefreshCw className="w-3 h-3" /> Run Now
                </button>
                <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Spend trend chart */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Monthly Procurement Spend ({getCurrencySymbol()}M)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Live purchase order totals
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded font-medium">
              <ArrowUpRight className="w-3 h-3" /> Backend data
            </span>
          </div>
          <div className="flex items-end gap-4 h-40">
            {spendTrend.map((s) => (
              <div
                key={s.month}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs font-semibold text-gray-700">
                  {getCurrencySymbol()}{s.val}M
                </span>
                <div
                  className="w-full rounded-t-sm bg-blue-200 relative overflow-hidden"
                  style={{ height: `${(s.val / maxSpend) * 120}px` }}
                >
                  <div
                    className={`absolute inset-0 ${s.month === "Apr" ? "bg-blue-700" : "bg-blue-400"} rounded-t-sm`}
                  />
                </div>
                <span className="text-xs text-gray-500">{s.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Spend by Category — {dateRange}
          </h2>
          <div className="space-y-3.5">
            {categorySpend.length === 0 && (
              <p className="text-sm text-gray-400">
                No category spend data available.
              </p>
            )}
            {categorySpend.map((c) => (
              <div key={c.cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 flex-1 truncate">
                    {c.cat}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${c.up ? "text-green-700" : "text-red-600"}`}
                    >
                      {c.up ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {c.change}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 w-10 text-right">
                      {getCurrencySymbol()}{c.val}M
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">
              {getCurrencySymbol()}{(categoryTotal / 1_000_000).toFixed(1)}M
            </span>
          </div>
        </div>
      </div>

      {/* Recent Report Runs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent Report Runs
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Report ID
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Report Name
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Format
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Run By
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Time
              </th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentRuns.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.id}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${r.format === "PDF" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                  >
                    {r.format}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.runBy}</td>
                <td className="px-4 py-3 text-gray-500">{r.date}</td>
                <td className="px-4 py-3 text-gray-500">{r.time}</td>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-medium">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
