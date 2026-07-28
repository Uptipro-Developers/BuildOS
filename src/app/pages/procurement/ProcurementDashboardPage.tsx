import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Truck,
  PackageCheck,
  ChevronRight,
} from "lucide-react";
import { fetchPurchaseOrders } from "../../api/purchase-orders";
import { getMaterialRequests, getMaterials } from "../../api/materials";
import {
  getCurrencySymbol,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

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
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

export function ProcurementDashboardPage() {
  const navigate = useNavigate();
  const [allPOs, setAllPOs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchPurchaseOrders()
      .then(setAllPOs)
      .catch(() => {});
    getMaterials()
      .then(setMaterials)
      .catch(() => {});
    getMaterialRequests()
      .then(setRequests)
      .catch(() => {});
  }, []);

  const openPOCount = allPOs.filter(
    (po) => !["Completed", "Received"].includes(po.status),
  ).length;
  const totalSpend = allPOs.reduce((sum, po) => sum + (po.totalValue || 0), 0);
  const lowStock = materials.filter(
    (m) =>
      (m.availableQty ?? m.totalQty ?? 0) > 0 &&
      (m.availableQty ?? m.totalQty ?? 0) <= (m.reorderLevel ?? 0),
  );
  const outOfStock = materials.filter(
    (m) => (m.availableQty ?? m.totalQty ?? 0) <= 0,
  );
  const pendingRequests = requests.filter((r) =>
    ["pending", "submitted", "pending approval"].includes(
      String(r.status).toLowerCase(),
    ),
  );

  const kpis = [
    {
      label: "Total Materials",
      value: String(materials.length),
      sub: "Inventory catalogue",
      icon: <Package className="w-5 h-5" />,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Low Stock Items",
      value: String(lowStock.length),
      sub: "At or below reorder level",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Out of Stock",
      value: String(outOfStock.length),
      sub: "Unavailable materials",
      icon: <TrendingDown className="w-5 h-5" />,
      color: "text-red-600 bg-red-100",
    },
    {
      label: "Pending Requests",
      value: String(pendingRequests.length),
      sub: "Awaiting action",
      icon: <Clock className="w-5 h-5" />,
      color: "text-purple-600 bg-purple-100",
    },
    {
      label: "Open POs",
      value: String(openPOCount),
      sub: `${fmt(totalSpend)} outstanding`,
      icon: <Truck className="w-5 h-5" />,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Procurement Spend",
      value: fmt(totalSpend),
      sub: "All purchase orders",
      icon: <DollarSign className="w-5 h-5" />,
      color: "text-emerald-600 bg-emerald-100",
    },
  ];

  const openPOs = allPOs
    .filter((po) => !["Completed", "Received"].includes(po.status))
    .slice(0, 5)
    .map((po) => ({
      id: po.prRef || po.id?.slice(0, 8).toUpperCase() || "—",
      supplier: po.supplier,
      total: po.totalValue,
      status: po.status?.toLowerCase() || "draft",
      eta: po.expectedDate || "TBD",
    }));
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Procurement Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Inventory, requests, and purchasing overview —{" "}
            {formatDateByGeneralSettings(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/apps/procurement/material-requests")}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Clock className="w-3.5 h-3.5" /> Material Requests
          </button>
          <button
            onClick={() => navigate("/apps/procurement")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
          >
            <Package className="w-3.5 h-3.5" /> All Materials
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
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
            <h2 className="text-sm font-semibold text-gray-900">
              Low Stock Alerts
            </h2>
          </div>
          <button
            onClick={() => navigate("/apps/procurement/stock-levels")}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        {lowStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <PackageCheck className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No low stock alerts.</p>
            <p className="text-xs mt-1">
              All tracked materials are above reorder level.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lowStock.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.category}</p>
                </div>
                <p className="text-sm text-amber-700 font-semibold">
                  {formatNumberByGeneralSettings(m.availableQty ?? m.totalQty ?? 0)}{" "}
                  {m.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Recent Material Requests */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Material Requests
            </h2>
            <button
              onClick={() => navigate("/apps/procurement/material-requests")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No material requests available.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {req.reference}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {req.materialName} ·{" "}
                      {req.projectName || req.storeName || "Unassigned"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {typeof req.qty === "number"
                      ? formatNumberByGeneralSettings(req.qty)
                      : req.qty}{" "}
                    {req.unit}
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${reqStatusBadge[String(req.status).toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">
          {/* Open POs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Open Purchase Orders
              </h2>
              <button
                onClick={() => navigate("/apps/procurement/purchase-orders")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {openPOs.map((po) => (
                <div
                  key={po.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{po.id}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {po.supplier}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmt(po.total)}
                    </p>
                    <p className="text-xs text-gray-400">ETA: {po.eta}</p>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize flex-shrink-0 ${poStatusBadge[po.status]}`}
                  >
                    {po.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Spend by category */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Monthly Spend by Category
            </h2>
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <DollarSign className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No spend data available.</p>
              <p className="text-xs mt-1">
                A spend analytics endpoint is not yet configured.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
