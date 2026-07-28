import { useState, useEffect } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Download,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { getStockMovements, type StockMovement } from "../../api/materials";
import {
  formatNumberByGeneralSettings,
  formatDateByGeneralSettings,
  formatTimeByGeneralSettings,
} from "../../utils/generalSettings";

type MovType = "incoming" | "outgoing" | "adjustment" | "transfer";

interface MovementRow {
  id: string;
  ts: number;
  date: string;
  time: string;
  material: string;
  category: string;
  type: MovType;
  qty: number;
  unit: string;
  direction: "+" | "-";
  reference: string;
  refType: string;
  requestedBy: string;
  project: string;
  notes: string;
}

const REF_TYPE_BY_MOV: Record<MovType, string> = {
  incoming: "Goods Receipt",
  outgoing: "Material Request",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

function normalizeMovType(type: string): MovType {
  const t = (type || "").toLowerCase();
  if (t === "incoming" || t === "in" || t === "receipt") return "incoming";
  if (t === "outgoing" || t === "out" || t === "issue") return "outgoing";
  if (t === "transfer") return "transfer";
  return "adjustment";
}

// Maps a backend stock-movement record into the table's display row shape.
function mapMovement(m: StockMovement): MovementRow {
  const type = normalizeMovType(m.type);
  const d = m.date ? new Date(m.date) : null;
  const valid = !!d && !isNaN(d.getTime());
  return {
    id: m.id,
    ts: valid ? d!.getTime() : 0,
    date: valid ? formatDateByGeneralSettings(d!) : "—",
    time: valid ? formatTimeByGeneralSettings(d!) : "",
    material: m.materialName ?? "—",
    category: "",
    type,
    qty: m.qty ?? 0,
    unit: m.unit ?? "",
    direction: type === "incoming" ? "+" : "-",
    reference: m.reference ?? "—",
    refType: REF_TYPE_BY_MOV[type],
    requestedBy: m.createdBy ?? "—",
    project: m.projectName ?? "—",
    notes: m.notes ?? "",
  };
}

const typeConfig: Record<
  MovType,
  { label: string; badge: string; icon: React.ReactNode; row: string }
> = {
  incoming: {
    label: "Incoming",
    badge: "bg-green-100 text-green-700",
    icon: <ArrowDownToLine className="w-4 h-4 text-green-600" />,
    row: "bg-green-50/40",
  },
  outgoing: {
    label: "Outgoing",
    badge: "bg-red-100 text-red-700",
    icon: <ArrowUpFromLine className="w-4 h-4 text-red-500" />,
    row: "bg-red-50/30",
  },
  adjustment: {
    label: "Adjustment",
    badge: "bg-amber-100 text-amber-700",
    icon: <RefreshCw className="w-4 h-4 text-amber-500" />,
    row: "bg-amber-50/30",
  },
  transfer: {
    label: "Transfer",
    badge: "bg-blue-100 text-blue-700",
    icon: <ArrowLeftRight className="w-4 h-4 text-blue-500" />,
    row: "bg-blue-50/30",
  },
};

export function StockMovementPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovType | "all">("all");
  const [sortKey, setSortKey] = useState<"date" | "material" | "qty" | "type">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [movements, setMovements] = useState<MovementRow[]>([]);

  useEffect(() => {
    let active = true;
    getStockMovements()
      .then((rows) => {
        if (active) setMovements(rows.map(mapMovement));
      })
      .catch(() => {
        if (active) setMovements([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSort(k: typeof sortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  }

  const filtered = movements
    .filter((m) => {
      const matchSearch =
        m.material.toLowerCase().includes(search.toLowerCase()) ||
        m.reference.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || m.type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "date") v = a.ts - b.ts;
      else if (sortKey === "material") v = a.material.localeCompare(b.material);
      else if (sortKey === "qty") v = a.qty - b.qty;
      else if (sortKey === "type") v = a.type.localeCompare(b.type);
      return sortDir === "asc" ? v : -v;
    });

  const totalIn = movements
    .filter((m) => m.direction === "+")
    .reduce((a, m) => a + m.qty, 0);
  const totalOut = movements
    .filter((m) => m.direction === "-")
    .reduce((a, m) => a + m.qty, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Stock Movement
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete movement log — incoming, outgoing, transfers, and
            adjustments
          </p>
        </div>
        <button
          onClick={() => {
            const headers = [
              "Movement ID",
              "Date",
              "Time",
              "Type",
              "Material",
              "Category",
              "Qty",
              "Unit",
              "Direction",
              "Reference",
              "Ref Type",
              "Project",
              "By",
              "Notes",
            ];
            const rows = filtered.map((m) => [
              m.id,
              m.date,
              m.time,
              typeConfig[m.type].label,
              m.material,
              m.category,
              String(m.qty),
              m.unit,
              m.direction,
              m.reference,
              m.refType,
              m.project,
              m.requestedBy,
              m.notes,
            ]);
            exportCSV("stock-movement-log", headers, rows);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-3.5 h-3.5" /> Export Log
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Movements",
            value: movements.length,
            sub: "Last 30 days",
            color: "text-gray-900 bg-gray-50 border-gray-200",
          },
          {
            label: "Total Incoming",
            value: `+${formatNumberByGeneralSettings(totalIn)}`,
            sub: "Units received",
            color: "text-green-700 bg-green-50 border-green-200",
          },
          {
            label: "Total Outgoing",
            value: `-${formatNumberByGeneralSettings(totalOut)}`,
            sub: "Units issued",
            color: "text-red-700 bg-red-50 border-red-200",
          },
          {
            label: "Adjustments",
            value: movements.filter((m) => m.type === "adjustment").length,
            sub: "Corrections made",
            color: "text-amber-700 bg-amber-50 border-amber-200",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg border ${s.color}`}>
            <p className={`text-2xl font-bold`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search material or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            ["all", "incoming", "outgoing", "transfer", "adjustment"] as const
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium capitalize ${typeFilter === t ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Movement ID
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1">
                  Date / Time
                  <SortIcon col="date" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center gap-1">
                  Type
                  <SortIcon col="type" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("material")}
              >
                <div className="flex items-center gap-1">
                  Material
                  <SortIcon col="material" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer"
                onClick={() => handleSort("qty")}
              >
                <div className="flex items-center justify-end gap-1">
                  Quantity
                  <SortIcon col="qty" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Reference
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Project
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                By
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m) => {
              const cfg = typeConfig[m.type] ?? {
                row: "",
                badge: "bg-gray-100 text-gray-700",
                icon: null,
                label: String(m.type ?? "Unknown"),
              };
              return (
                <tr key={m.id} className={`hover:bg-gray-50 ${cfg.row}`}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">
                    {m.id}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {m.date}
                    <br />
                    {m.time}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {cfg.icon}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">
                      {m.material}
                    </p>
                    <p className="text-xs text-gray-400">{m.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-bold ${m.direction === "+" ? "text-green-700" : "text-red-600"}`}
                    >
                      {m.direction}
                      {formatNumberByGeneralSettings(m.qty)}
                    </span>
                    <p className="text-xs text-gray-400">{m.unit}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-blue-700 hover:underline cursor-pointer">
                      {m.reference}
                    </p>
                    <p className="text-xs text-gray-400">{m.refType}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">
                    {m.project}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.requestedBy}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[180px] truncate">
                    {m.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No movements found</p>
          </div>
        )}
      </div>
    </div>
  );
}
