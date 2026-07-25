import { useState } from "react";
import {
  BarChart2, Package, TrendingDown, ShoppingCart, Building,
  Download, Calendar, RefreshCw, ChevronRight, FileText,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const reportTypes = [
  {
    id: "stock",
    title: "Stock Report",
    description: "Current inventory levels, valuation, and stock health overview across all material categories.",
    icon: <Package className="w-5 h-5 text-blue-600" />,
    color: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    lastRun: "Apr 9, 2026 — 10:00",
    metrics: [
      { label: "Total Materials", value: "148" },
      { label: "Total Stock Value", value: "₦86.4M" },
      { label: "Low Stock Items", value: "11" },
      { label: "Out of Stock", value: "4" },
    ],
  },
  {
    id: "consumption",
    title: "Material Consumption",
    description: "Material usage trend by project and time period. Identify high-consumption materials and projects.",
    icon: <TrendingDown className="w-5 h-5 text-amber-600" />,
    color: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100",
    lastRun: "Apr 9, 2026 — 09:30",
    metrics: [
      { label: "Materials Used (Apr)", value: "63 items" },
      { label: "Total Qty Issued", value: "4,820 units" },
      { label: "Top Material", value: "Steel Y16" },
      { label: "Top Project", value: "Downtown Office" },
    ],
  },
  {
    id: "spend",
    title: "Procurement Spend",
    description: "Purchase order spend analysis by supplier, category, and project. Monthly and YTD breakdowns.",
    icon: <ShoppingCart className="w-5 h-5 text-green-600" />,
    color: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
    lastRun: "Apr 9, 2026 — 08:15",
    metrics: [
      { label: "Monthly Spend", value: "₦42.0M" },
      { label: "YTD Spend", value: "₦143.8M" },
      { label: "No. of POs", value: "31" },
      { label: "Avg PO Value", value: "₦4.64M" },
    ],
  },
  {
    id: "supplier",
    title: "Supplier Performance",
    description: "Supplier scorecard with on-time delivery rates, rejection rates, spend, and overall ratings.",
    icon: <Building className="w-5 h-5 text-purple-600" />,
    color: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-100",
    lastRun: "Apr 8, 2026 — 17:00",
    metrics: [
      { label: "Active Suppliers", value: "7" },
      { label: "Avg On-time Rate", value: "84.7%" },
      { label: "Best Performer", value: "SteelMart" },
      { label: "Needs Attention", value: "Alpha Agg." },
    ],
  },
];

const recentRuns = [
  { id: "RPT-0089", name: "Stock Report", format: "PDF", runBy: "Amaka Osei", date: "Apr 9, 2026", time: "10:00" },
  { id: "RPT-0088", name: "Procurement Spend", format: "Excel", runBy: "Amaka Osei", date: "Apr 9, 2026", time: "09:30" },
  { id: "RPT-0087", name: "Material Consumption", format: "PDF", runBy: "Admin", date: "Apr 9, 2026", time: "08:15" },
  { id: "RPT-0086", name: "Supplier Performance", format: "PDF", runBy: "Amaka Osei", date: "Apr 8, 2026", time: "17:00" },
  { id: "RPT-0085", name: "Stock Report", format: "Excel", runBy: "Admin", date: "Apr 8, 2026", time: "09:00" },
];

const spendTrend = [
  { month: "Nov", val: 28 }, { month: "Dec", val: 31 }, { month: "Jan", val: 24 },
  { month: "Feb", val: 38 }, { month: "Mar", val: 36 }, { month: "Apr", val: 42 },
];
const maxSpend = Math.max(...spendTrend.map(s => s.val));

const categorySpend = [
  { cat: "Concrete & Masonry", val: 14.2, pct: 34, change: "+8%", up: true },
  { cat: "Steel & Ironmongery", val: 10.9, pct: 26, change: "+12%", up: true },
  { cat: "Electrical", val: 6.7, pct: 16, change: "-3%", up: false },
  { cat: "Plumbing & MEP", val: 5.5, pct: 13, change: "+5%", up: true },
  { cat: "Timber & Formwork", val: 4.6, pct: 11, change: "-1%", up: false },
];

export function ProcurementReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("This Month");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Procurement Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and review procurement analytics and operational insights</p>
        </div>
        <div className="flex gap-2">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
            <option>This Month</option>
            <option>Last Month</option>
            <option>Q1 2026</option>
            <option>Year to Date</option>
          </select>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-2 gap-5">
        {reportTypes.map(report => (
          <div key={report.id} className={`rounded-xl border p-5 ${report.color}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${report.iconBg}`}>{report.icon}</div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{report.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{report.description}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {report.metrics.map(m => (
                <div key={m.label} className="bg-white rounded-md p-2.5 border border-white/60">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Last run: {report.lastRun}</p>
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
              <h2 className="text-sm font-semibold text-gray-900">Monthly Procurement Spend (₦M)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Nov 2025 — Apr 2026</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded font-medium">
              <ArrowUpRight className="w-3 h-3" /> +16.7% vs last month
            </span>
          </div>
          <div className="flex items-end gap-4 h-40">
            {spendTrend.map(s => (
              <div key={s.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">₦{s.val}M</span>
                <div className="w-full rounded-t-sm bg-blue-200 relative overflow-hidden" style={{ height: `${(s.val / maxSpend) * 120}px` }}>
                  <div className={`absolute inset-0 ${s.month === "Apr" ? "bg-blue-700" : "bg-blue-400"} rounded-t-sm`} />
                </div>
                <span className="text-xs text-gray-500">{s.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Spend by Category — {dateRange}</h2>
          <div className="space-y-3.5">
            {categorySpend.map(c => (
              <div key={c.cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 flex-1 truncate">{c.cat}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${c.up ? "text-green-700" : "text-red-600"}`}>
                      {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {c.change}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 w-10 text-right">₦{c.val}M</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">₦42.0M</span>
          </div>
        </div>
      </div>

      {/* Recent Report Runs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Report Runs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Report ID</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Report Name</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Format</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Run By</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Time</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentRuns.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.format === "PDF" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{r.format}</span>
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
