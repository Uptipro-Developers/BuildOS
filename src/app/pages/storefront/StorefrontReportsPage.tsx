import { useEffect, useState } from "react";
import {
  TrendingDown,
  ArrowLeftRight,
  RotateCcw,
  Download,
  Package,
} from "lucide-react";
import {
  getMaterialReturns,
  getMaterials,
  getStockMovements,
  getStockTransfers,
} from "../../api/materials";
import {
  formatDateByGeneralSettings,
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

type ReportType = "Stock Levels" | "Movement" | "Transfer" | "Return";

const REPORT_CARDS = [
  {
    type: "Stock Levels" as ReportType,
    icon: Package,
    color: "bg-teal-50 text-teal-600",
    title: "Stock Levels Report",
    desc: "Current stock quantities, values, and reorder status across all stores.",
  },
  {
    type: "Movement" as ReportType,
    icon: TrendingDown,
    color: "bg-blue-50 text-blue-600",
    title: "Movement Report",
    desc: "All material movements — receipts, issues, transfers, and returns.",
  },
  {
    type: "Transfer" as ReportType,
    icon: ArrowLeftRight,
    color: "bg-purple-50 text-purple-600",
    title: "Transfer Report",
    desc: "Store-to-store transfer history with status and quantities.",
  },
  {
    type: "Return" as ReportType,
    icon: RotateCcw,
    color: "bg-yellow-50 text-yellow-600",
    title: "Return Report",
    desc: "All material return requests and outcomes with condition notes.",
  },
];

interface StockReportRow {
  material: string;
  category: string;
  store: string;
  qty: number;
  reorder: number;
  value: number;
  status: string;
}

interface TransferReportRow {
  ref: string;
  from: string;
  to: string;
  items: number;
  qty: number;
  date: string;
  status: string;
  value: number;
}

interface ReturnReportRow {
  ref: string;
  material: string;
  qty: number;
  unit: string;
  from: string;
  to: string;
  condition: string;
  status: string;
  date: string;
}

interface MovementReportRow {
  id: string;
  date: string;
  material: string;
  from: string;
  to: string;
  qty: number;
  type: string;
}

const STATUS_STYLE: Record<string, string> = {
  "In Stock": "bg-green-50 text-green-700",
  "Low Stock": "bg-yellow-50 text-yellow-700",
  "Out of Stock": "bg-red-50 text-red-700",
  Completed: "bg-green-50 text-green-700",
  "In Transit": "bg-blue-50 text-blue-700",
  Pending: "bg-yellow-50 text-yellow-700",
  "Pending Approval": "bg-yellow-50 text-yellow-700",
  Approved: "bg-blue-50 text-blue-700",
  Received: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

const MOVEMENT_TYPE_STYLE: Record<string, string> = {
  Transfer: "bg-blue-50 text-blue-700",
  Issue: "bg-purple-50 text-purple-700",
  Receipt: "bg-green-50 text-green-700",
  Return: "bg-yellow-50 text-yellow-700",
};

export function StorefrontReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("Stock Levels");
  const [stockData, setStockData] = useState<StockReportRow[]>([]);
  const [movementData, setMovementData] = useState<MovementReportRow[]>([]);
  const [transferData, setTransferData] = useState<TransferReportRow[]>([]);
  const [returnData, setReturnData] = useState<ReturnReportRow[]>([]);

  useEffect(() => {
    getMaterials()
      .then((materials) =>
        setStockData(
          materials.map((m) => {
            const qty = m.availableQty ?? m.totalQty ?? 0;
            const status =
              qty <= 0
                ? "Out of Stock"
                : qty <= (m.reorderLevel ?? 0)
                  ? "Low Stock"
                  : "In Stock";
            return {
              material: m.name,
              category: m.category,
              store: m.allocatedProject || m.allocatedTo || "General Store",
              qty,
              reorder: m.reorderLevel ?? 0,
              value: qty * (m.unitCost ?? 0),
              status,
            };
          }),
        ),
      )
      .catch(() => setStockData([]));

    getStockMovements()
      .then((movements) =>
        setMovementData(
          movements.map((m) => ({
            id: m.reference || m.id,
            date: m.date ? formatDateByGeneralSettings(m.date) : "",
            material: m.materialName,
            from: m.type === "Receipt" ? "Supplier" : m.storeName,
            to: m.type === "Issue" ? m.projectName || "Project" : m.storeName,
            qty: m.qty,
            type: m.type,
          })),
        ),
      )
      .catch(() => setMovementData([]));

    getStockTransfers()
      .then((transfers) =>
        setTransferData(
          transfers.map((t) => {
            const qty = (t.items ?? []).reduce(
              (sum: number, item: any) => sum + (Number(item.qty) || 0),
              0,
            );
            const value = (t.items ?? []).reduce(
              (sum: number, item: any) =>
                sum + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
              0,
            );
            return {
              ref: t.reference || t.id,
              from: t.fromStoreName,
              to: t.toStoreName,
              items: t.items?.length ?? 0,
              qty,
              date: t.requestDate
                ? formatDateByGeneralSettings(t.requestDate)
                : "",
              status: t.status,
              value,
            };
          }),
        ),
      )
      .catch(() => setTransferData([]));

    getMaterialReturns()
      .then((returns) =>
        setReturnData(
          returns.map((r) => ({
            ref: r.reference || r.id,
            material: r.materialName,
            qty: r.qty,
            unit: r.unit,
            from: r.fromStoreName,
            to: r.toStoreName,
            condition: r.condition || "Not specified",
            status: r.status,
            date: r.requestDate
              ? formatDateByGeneralSettings(r.requestDate)
              : "",
          })),
        ),
      )
      .catch(() => setReturnData([]));
  }, []);

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
          <p className="text-sm text-gray-500 mt-0.5">
            Inventory and distribution analytics
          </p>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-4 gap-4">
        {REPORT_CARDS.map(({ type, icon: Icon, color, title, desc }) => (
          <button
            key={type}
            onClick={() => setActiveReport(type)}
            className={`rounded-xl border p-4 text-left transition-colors ${activeReport === type ? "border-teal-600 ring-2 ring-teal-100 bg-white" : "border-gray-200 bg-white hover:bg-gray-50"}`}
          >
            <span
              className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}
            >
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
            <h2 className="text-base font-semibold text-gray-800">
              Stock Levels Report
            </h2>
            <button
              onClick={() =>
                exportCSV(
                  stockData as unknown as Record<string, unknown>[],
                  "stock_levels.csv",
                )
              }
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Materials", value: stockData.length },
              {
                label: "In Stock",
                value: stockData.filter((s) => s.status === "In Stock").length,
              },
              {
                label: "Low Stock",
                value: stockData.filter((s) => s.status === "Low Stock").length,
              },
              {
                label: "Out of Stock",
                value: stockData.filter((s) => s.status === "Out of Stock")
                  .length,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {[
                    "Material",
                    "Category",
                    "Store",
                    "Qty",
                    "Reorder Lvl",
                    `Stock Value (${getCurrencySymbol()})`,
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stockData.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.material}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.category}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {s.store}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatNumberByGeneralSettings(s.qty)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatNumberByGeneralSettings(s.reorder)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatNumberByGeneralSettings(s.value)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-sm text-teal-800 font-medium">
              Total Stock Value
            </p>
            <p className="text-2xl font-bold text-teal-900 mt-1">
              {getCurrencySymbol()}{formatNumberByGeneralSettings(stockData.reduce((sum, s) => sum + s.value, 0))}
            </p>
          </div>
        </div>
      )}

      {/* ── Movement Report ───────────────────────────────────────────────── */}
      {activeReport === "Movement" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Movement Report
            </h2>
            <button
              onClick={() =>
                exportCSV(
                  movementData as unknown as Record<string, unknown>[],
                  "movement_report.csv",
                )
              }
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(["Transfer", "Issue", "Receipt", "Return"] as const).map((t) => (
              <div
                key={t}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <p className="text-2xl font-bold text-gray-900">
                  {movementData.filter((m) => m.type === t).length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{t}s</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {["ID", "Date", "Material", "From", "To", "Qty", "Type"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movementData.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {m.id}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {m.material}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {m.from}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.to}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {m.qty}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_TYPE_STYLE[m.type]}`}
                      >
                        {m.type}
                      </span>
                    </td>
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
            <h2 className="text-base font-semibold text-gray-800">
              Transfer Report
            </h2>
            <button
              onClick={() =>
                exportCSV(
                  transferData as unknown as Record<string, unknown>[],
                  "transfer_report.csv",
                )
              }
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Transfers", value: transferData.length },
              {
                label: "Completed",
                value: transferData.filter((t) => t.status === "Completed")
                  .length,
              },
              {
                label: "In Transit",
                value: transferData.filter((t) => t.status === "In Transit")
                  .length,
              },
              {
                label: "Pending",
                value: transferData.filter((t) => t.status === "Pending")
                  .length,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {[
                    "Reference",
                    "From",
                    "To",
                    "Items",
                    "Total Qty",
                    `Value (${getCurrencySymbol()})`,
                    "Date",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transferData.map((t) => (
                  <tr key={t.ref} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {t.ref}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {t.from}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.to}</td>
                    <td className="px-4 py-3 text-gray-600">{t.items}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatNumberByGeneralSettings(t.qty)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatNumberByGeneralSettings(t.value)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[t.status]}`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-sm text-purple-800 font-medium">
              Total Transfer Value
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {getCurrencySymbol()}{formatNumberByGeneralSettings(transferData.reduce((s, t) => s + t.value, 0))}
            </p>
          </div>
        </div>
      )}

      {/* ── Return Report ─────────────────────────────────────────────────── */}
      {activeReport === "Return" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Return Report
            </h2>
            <button
              onClick={() =>
                exportCSV(
                  returnData as unknown as Record<string, unknown>[],
                  "return_report.csv",
                )
              }
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Returns", value: returnData.length },
              {
                label: "Received",
                value: returnData.filter((r) => r.status === "Received").length,
              },
              {
                label: "Pending Approval",
                value: returnData.filter((r) => r.status === "Pending Approval")
                  .length,
              },
              {
                label: "Rejected",
                value: returnData.filter((r) => r.status === "Rejected").length,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {[
                    "Reference",
                    "Material",
                    "Qty",
                    "From",
                    "To",
                    "Condition",
                    "Date",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {returnData.map((r) => (
                  <tr key={r.ref} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {r.ref}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.material}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {r.qty}{" "}
                      <span className="text-gray-400 font-normal text-xs">
                        {r.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.from}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.to}</td>
                    <td className="px-4 py-3 text-gray-600">{r.condition}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
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
