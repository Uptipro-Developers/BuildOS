import { useState, useEffect } from "react";
import { exportCSV } from "../../utils/exportCSV";
import {
  getMaterialRequests,
  type MaterialRequest as ApiRequest,
} from "../../api/materials";
import {
  Search,
  Download,
  Filter,
  Eye,
} from "lucide-react";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { toast } from "sonner";
import { baseMaterialRequestRef } from "../../utils/materialRequestRef";

type RequestStatus =
  | "Pending Approval"
  | "Approved for Stock Movement"
  | "Stock Movement In Progress"
  | "Fulfilled via Storefront"
  | "Awaiting Procurement Approval"
  | "Forwarded to Procurement"
  | "Procurement In Progress"
  | "Fulfilled via Procurement"
  | "Rejected"
  ;

interface MaterialRequest {
  /** Database id used by PATCH endpoints; `id` below is the display reference. */
  apiId: string;
  id: string;
  requestedBy: string;
  department: string;
  material: string;
  category: string;
  quantity: number;
  unit: string;
  sourceStore: string;
  destination: string;
  destinationType: "Project Store" | "Direct Issue";
  requestDate: string;
  requiredDate: string;
  status: RequestStatus;
  remarks: string;
  approvedBy: string;
  approvalDate: string;
  imageUrl?: string | null;
  fulfillmentMethod?: "stock_movement" | "procurement" | null;
  fulfillmentStatus?: string | null;
  stockTransferRef?: string | null;
  prRef?: string | null;
  materials: Array<{ name: string; qty: number; unit: string; imageUrl?: string | null }>;
}

const STATUS_STYLE: Record<RequestStatus, string> = {
  "Pending Approval": "bg-yellow-50 text-yellow-700",
  "Approved for Stock Movement": "bg-blue-50 text-blue-700",
  "Stock Movement In Progress": "bg-cyan-50 text-cyan-700",
  "Fulfilled via Storefront": "bg-green-50 text-green-700",
  "Awaiting Procurement Approval": "bg-amber-50 text-amber-700",
  "Procurement In Progress": "bg-indigo-50 text-indigo-700",
  "Fulfilled via Procurement": "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
  "Forwarded to Procurement": "bg-purple-50 text-purple-700",
};

function toRequestGroup(rows: ApiRequest[]): MaterialRequest {
  const r = rows[0];
  const normalizedStatus = String(r.fulfillmentStatus || r.status || "pending")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const statusByApiValue: Record<string, RequestStatus> = {
    pending: "Pending Approval",
    pending_approval: "Pending Approval",
    approved: "Approved for Stock Movement",
    approved_for_stock_movement: "Approved for Stock Movement",
    stock_movement_in_progress: "Stock Movement In Progress",
    fulfilled: r.fulfillmentMethod === "procurement" ? "Fulfilled via Procurement" : "Fulfilled via Storefront",
    fulfilled_via_storefront: "Fulfilled via Storefront",
    fulfilled_via_procurement: "Fulfilled via Procurement",
    fulfilled_via_stock_and_procurement: "Fulfilled via Stock & Procurement",
    procurement_fulfilled_stock_movement_pending: "Procurement Fulfilled · Stock Movement Pending",
    partially_reserved_pending_procurement_approval: "Stock Reserved · Awaiting Procurement Approval",
    partially_fulfilled_procurement_pending: "Stock Fulfilled · Procurement Pending",
    stock_movement_action_required: "Stock Movement Action Required",
    pending_procurement_approval: "Awaiting Procurement Approval",
    rejected: "Rejected",
    in_procurement: "Forwarded to Procurement",
    forwarded_to_procurement: "Forwarded to Procurement",
    procurement_in_progress: "Procurement In Progress",
  };

  return {
    apiId: r.id,
    id: baseMaterialRequestRef(r.reference || r.id),
    requestedBy: r.requestedBy ?? "",
    department: r.projectName ?? "",
    material: rows.length === 1 ? r.materialName : `${rows.length} materials`,
    category: "",
    quantity: rows.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    unit: rows.length === 1 ? r.unit : "items",
    sourceStore: r.sourceStoreName ?? "—",
    destination: r.projectName ?? "",
    destinationType: "Project Store",
    requestDate: formatDateByGeneralSettings(r.requestDate),
    requiredDate: "",
    status: statusByApiValue[normalizedStatus] ?? "Pending Approval",
    remarks: r.purpose ?? "",
    approvedBy: r.approvedBy ?? "",
    approvalDate: r.approvedAt
      ? formatDateByGeneralSettings(r.approvedAt)
      : "",
    imageUrl: r.imageUrl,
    fulfillmentMethod: r.fulfillmentMethod,
    fulfillmentStatus: r.fulfillmentStatus,
    stockTransferRef: r.stockTransferRef,
    prRef: r.prRef,
    materials: rows.map((item) => ({ name: item.materialName, qty: item.qty, unit: item.unit, imageUrl: item.imageUrl })),
  };
}

export function IncomingRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "All">(
    "All",
  );
  const [selected, setSelected] = useState<MaterialRequest | null>(null);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  function loadRequests() {
    return getMaterialRequests().then((data) => {
      const groups = new Map<string, ApiRequest[]>();
      data.forEach((request) => {
        const base = baseMaterialRequestRef(request.reference || request.id);
        groups.set(base, [...(groups.get(base) ?? []), request]);
      });
      setRequests(Array.from(groups.values()).map(toRequestGroup));
      return data;
    });
  }

  useEffect(() => {
    loadRequests()
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load requests.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.id.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q) ||
      r.material.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleExportCSV() {
    const rows = [
      [
        "Request ID",
        "Requested By",
        "Department",
        "Material",
        "Quantity",
        "Unit",
        "Source Store",
        "Destination",
        "Request Date",
        "Status",
      ],
      ...filtered.map((r) => [
        r.id,
        r.requestedBy,
        r.department,
        r.material,
        r.quantity,
        r.unit,
        r.sourceStore,
        r.destination,
        r.requestDate,
        r.status,
      ]),
    ];
    // Hands off to the shared helper: the previous inline version built a
    // detached `data:text/csv` anchor, which Firefox and Safari ignore, declared
    // no charset (mangling ₦ and accents) and had no escaping, so any cell
    // containing a comma silently shifted every later column.
    exportCSV("incoming-requests", rows[0] as string[], rows.slice(1));
  }

  const pendingCount = requests.filter((r) => r.status === "Pending Approval").length;

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Incoming Material Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track ESS material requests across approval, stock movement, and procurement
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {(
          [
            "All",
            "Pending Approval",
            "Approved for Stock Movement",
            "Stock Movement In Progress",
            "Fulfilled via Storefront",
            "Awaiting Procurement Approval",
            "Forwarded to Procurement",
            "Procurement In Progress",
            "Fulfilled via Procurement",
            "Rejected",
          ] as const
        ).map((s) => {
          const count =
            s === "All"
              ? requests.length
              : requests.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${statusFilter === s ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            >
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s}</p>
            </button>
          );
        })}
      </div>

      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Filter className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">
              {pendingCount} request{pendingCount > 1 ? "s" : ""}
            </span>{" "}
            awaiting action in Storefront Approvals.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search request ID, requester, material…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              {[
                "Request ID",
                "Requested By",
                "Material",
                "Qty",
                "Source Store",
                "Destination",
                "Req. Date",
                "Status",
                "",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  No requests found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.id}
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900 font-medium">{r.requestedBy}</p>
                  <p className="text-xs text-gray-400">{r.department}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {r.imageUrl && <img src={r.imageUrl} alt={r.material} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />}
                    <div>
                      <p className="text-gray-900 font-medium">{r.material}</p>
                      <p className="text-xs text-gray-400">{r.materials.length > 1 ? "Open to view all items" : r.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {r.quantity}{" "}
                  <span className="text-gray-400 font-normal">{r.unit}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.sourceStore}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  <p>{r.destination}</p>
                  <span className="text-gray-400">{r.destinationType}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {r.requestDate}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelected(r)}
                      title="View details"
                      className="text-teal-600 hover:text-teal-800 ml-1"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail / Action Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Request {selected.id}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  From ESS — {selected.requestedBy}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {selected.materials.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-12 w-12 flex-none rounded-lg border border-gray-200 object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-white text-xs font-semibold text-gray-400">—</div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.qty} {item.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(
                [
                  ["Materials", selected.materials.map((item) => `${item.name} — ${item.qty} ${item.unit}`).join(", ")],
                  ["Source Store", selected.sourceStore],
                  [
                    "Destination",
                    `${selected.destination} — ${selected.destinationType}`,
                  ],
                  ["Request Date", selected.requestDate],
                  ["Required By", selected.requiredDate],
                  ["Status", selected.status],
                  ...(selected.fulfillmentMethod ? [["Fulfilment Method", selected.fulfillmentMethod === "stock_movement" ? "Stock Movement" : "Procurement"]] : []),
                  ...(selected.stockTransferRef ? [["Stock Transfer", selected.stockTransferRef]] : []),
                  ...(selected.prRef ? [["Purchase Request", selected.prRef]] : []),
                  ["Remarks", selected.remarks || "—"],
                  ...(selected.approvedBy
                    ? [
                        [
                          "Approved / Actioned By",
                          `${selected.approvedBy} on ${selected.approvalDate}`,
                        ],
                      ]
                    : []),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <span className="text-xs text-gray-400 w-44 flex-shrink-0 mt-0.5">
                    {label}
                  </span>
                  <span className="text-sm text-gray-800 font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
