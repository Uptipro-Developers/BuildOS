import { useState, useEffect, useMemo } from "react";
import {
  Store,
  FolderOpen,
  AlertTriangle,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  getStores,
  getStockTransfers,
  getMaterials,
  getMaterialRequests,
  type Material,
  type StockTransfer,
  type MaterialRequest,
} from "../../api/materials";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

// Compact currency formatter to match the storefront design (e.g. $142.8M).
function formatStockValue(n: number): string {
  const symbol = getCurrencySymbol();
  if (!Number.isFinite(n)) return `${symbol}0`;
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(0)}K`;
  return `${symbol}${formatNumberByGeneralSettings(n)}`;
}

function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

type StoreDisplay = {
  id: string;
  name: string;
  items: number;
  lowStock: number;
  lastActivity: string;
  icon: React.ElementType;
  color: string;
};
type TransferDisplay = {
  id: string;
  from: string;
  to: string;
  items: number;
  date: string;
  status: string;
};

const STORE_ICONS: React.ElementType[] = [
  Store,
  FolderOpen,
  FolderOpen,
  FolderOpen,
  FolderOpen,
];
const STORE_COLORS = [
  "bg-teal-600",
  "bg-blue-600",
  "bg-purple-600",
  "bg-orange-600",
  "bg-sky-600",
];

export function StorefrontDashboardPage() {
  const [stores, setStores] = useState<StoreDisplay[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<TransferDisplay[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);

  const stats = useMemo(
    () => [
      {
        label: "Total Stock Value",
        value: formatStockValue(
          materials.reduce(
            (sum, m) => sum + (m.totalQty || 0) * (m.unitCost || 0),
            0,
          ),
        ),
        sub: "Across all stores",
        icon: DollarSign,
        color: "bg-teal-50 text-teal-600",
      },
      {
        label: "Available Materials",
        value: materials.filter((m) => (m.availableQty || 0) > 0).length,
        sub: "Unique SKUs in stock",
        icon: Package,
        color: "bg-blue-50 text-blue-600",
      },
      {
        label: "Pending Requests",
        value: requests.filter((r) => r.status === "Pending").length,
        sub: "Awaiting processing",
        icon: Clock,
        color: "bg-yellow-50 text-yellow-600",
      },
      {
        label: "Approved Transfers",
        value: transfers.filter(
          (t) =>
            (t.status === "Approved" || t.status === "Completed") &&
            isThisMonth(t.completedAt || t.requestDate),
        ).length,
        sub: "This month",
        icon: CheckCircle2,
        color: "bg-green-50 text-green-600",
      },
      {
        label: "Low Stock Alerts",
        value: materials.filter(
          (m) => (m.availableQty || 0) <= (m.reorderLevel || 0),
        ).length,
        sub: "Below reorder level",
        icon: AlertTriangle,
        color: "bg-red-50 text-red-500",
      },
    ],
    [materials, requests, transfers],
  );

  useEffect(() => {
    getStores()
      .then((data) =>
        setStores(
          data.map((s, i) => ({
            id: s.id,
            name: s.name,
            items: s.storeItems?.length ?? 0,
            lowStock: (s.storeItems ?? []).filter(
              (it) => (it.qty || 0) <= (it.reorderLevel || 0),
            ).length,
            lastActivity: "—",
            icon: STORE_ICONS[i] ?? FolderOpen,
            color: STORE_COLORS[i] ?? "bg-gray-600",
          })),
        ),
      )
      .catch(console.error);
    getStockTransfers()
      .then((data) => {
        setTransfers(data);
        setRecentTransfers(
          data.slice(0, 5).map((t) => ({
            id: t.reference,
            from: t.fromStoreName,
            to: t.toStoreName,
            items: Array.isArray(t.items) ? t.items.length : 0,
            date: t.requestDate,
            status: t.status,
          })),
        );
      })
      .catch(console.error);
    getMaterials()
      .then(setMaterials)
      .catch(console.error);
    getMaterialRequests()
      .then(setRequests)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Storefront</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of stores, stock levels, and transfers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3"
          >
            <span
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}
            >
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Stores Overview
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {stores.map((store) => (
            <div
              key={store.name}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
            >
              <div
                className={`w-10 h-10 rounded-xl ${store.color} flex items-center justify-center`}
              >
                <store.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {store.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {store.items} items · {store.lowStock} low stock
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last activity: {store.lastActivity}
                </p>
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Recent Transfers
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                {["Transfer ID", "From", "To", "Items", "Date", "Status"].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransfers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {t.id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.from}</td>
                  <td className="px-4 py-3 text-gray-700">{t.to}</td>
                  <td className="px-4 py-3 text-gray-600">{t.items}</td>
                  <td className="px-4 py-3 text-gray-500">{t.date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "Completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                    >
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
