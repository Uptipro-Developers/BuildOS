import { useState } from "react";
import { Search, Download, Filter, Eye, CheckCircle, XCircle, ExternalLink } from "lucide-react";

type RequestStatus = "Pending" | "Approved" | "Fulfilled" | "Rejected" | "Forwarded to Procurement";

interface MaterialRequest {
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
}

const STATUS_STYLE: Record<RequestStatus, string> = {
  Pending:                     "bg-yellow-50 text-yellow-700",
  Approved:                    "bg-blue-50 text-blue-700",
  Fulfilled:                   "bg-green-50 text-green-700",
  Rejected:                    "bg-red-50 text-red-700",
  "Forwarded to Procurement":  "bg-purple-50 text-purple-700",
};

const MOCK: MaterialRequest[] = [
  { id: "REQ-041", requestedBy: "Emeka Nwosu",   department: "Block A",  material: "Cement (50kg bag)",     category: "Concrete",   quantity: 50,  unit: "Bags",    sourceStore: "General Store",  destination: "Block A Project Store", destinationType: "Project Store", requestDate: "Jun 4, 2025",  requiredDate: "Jun 6, 2025",  status: "Pending",   remarks: "Urgent — slab pour scheduled",   approvedBy: "",              approvalDate: "" },
  { id: "REQ-040", requestedBy: "Aisha Ibrahim",  department: "Block B",  material: "Binding Wire",          category: "Steel",      quantity: 5,   unit: "Rolls",   sourceStore: "General Store",  destination: "Block B Project Store", destinationType: "Project Store", requestDate: "Jun 3, 2025",  requiredDate: "Jun 5, 2025",  status: "Approved",  remarks: "",                               approvedBy: "Chukwu Obi",    approvalDate: "Jun 3, 2025" },
  { id: "REQ-039", requestedBy: "Tunde Bello",    department: "Block C",  material: "PVC Pipes 2 Inch",      category: "Plumbing",   quantity: 20,  unit: "Lengths", sourceStore: "General Store",  destination: "Block C Project Store", destinationType: "Project Store", requestDate: "Jun 2, 2025",  requiredDate: "Jun 4, 2025",  status: "Fulfilled", remarks: "",                               approvedBy: "Chukwu Obi",    approvalDate: "Jun 2, 2025" },
  { id: "REQ-038", requestedBy: "Fatima Yusuf",   department: "HR",       material: "Granite Tiles 600x600", category: "Finishes",   quantity: 10,  unit: "Boxes",   sourceStore: "General Store",  destination: "Office Block",          destinationType: "Project Store", requestDate: "Jun 1, 2025",  requiredDate: "Jun 8, 2025",  status: "Forwarded to Procurement", remarks: "Out of stock — forwarded to procurement", approvedBy: "", approvalDate: "" },
  { id: "REQ-037", requestedBy: "David Okafor",   department: "Block A",  material: "Steel Rebar Y12",       category: "Steel",      quantity: 2,   unit: "Tonnes",  sourceStore: "General Store",  destination: "Block A Project Store", destinationType: "Project Store", requestDate: "May 31, 2025", requiredDate: "Jun 2, 2025",  status: "Fulfilled", remarks: "",                               approvedBy: "Chukwu Obi",    approvalDate: "May 31, 2025" },
  { id: "REQ-036", requestedBy: "Grace Eze",      department: "Block B",  material: "Formwork Plywood",      category: "Timber",     quantity: 8,   unit: "Sheets",  sourceStore: "General Store",  destination: "Block B Project Store", destinationType: "Project Store", requestDate: "May 30, 2025", requiredDate: "Jun 1, 2025",  status: "Rejected",  remarks: "Insufficient stock level",       approvedBy: "Chukwu Obi",    approvalDate: "May 30, 2025" },
  { id: "REQ-035", requestedBy: "Uche Onu",       department: "Block C",  material: "2.5mm Twin Cable",      category: "Electrical", quantity: 150, unit: "Metres",  sourceStore: "General Store",  destination: "Block C Project Store", destinationType: "Project Store", requestDate: "May 28, 2025", requiredDate: "Jun 3, 2025",  status: "Pending",   remarks: "",                               approvedBy: "",              approvalDate: "" },
  { id: "REQ-034", requestedBy: "Ngozi Adeyemi",  department: "Admin",    material: "Sand",                  category: "Aggregates", quantity: 10,  unit: "Tonnes",  sourceStore: "General Store",  destination: "Office Extension",      destinationType: "Direct Issue",  requestDate: "May 25, 2025", requiredDate: "May 28, 2025", status: "Fulfilled", remarks: "",                               approvedBy: "Chukwu Obi",    approvalDate: "May 26, 2025" },
];

const STATUSES: (RequestStatus | "All")[] = ["All", "Pending", "Approved", "Fulfilled", "Rejected", "Forwarded to Procurement"];

export function IncomingRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "All">("All");
  const [selected, setSelected] = useState<MaterialRequest | null>(null);
  const [requests, setRequests] = useState<MaterialRequest[]>(MOCK);

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = r.id.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q) || r.material.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function approve(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Approved", approvedBy: "Store Manager", approvalDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } : r));
    setSelected(null);
  }

  function reject(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Rejected", approvedBy: "Store Manager", approvalDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } : r));
    setSelected(null);
  }

  function forwardToProcurement(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Forwarded to Procurement" } : r));
    setSelected(null);
  }

  function fulfill(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Fulfilled" } : r));
    setSelected(null);
  }

  function exportCSV() {
    const rows = [
      ["Request ID", "Requested By", "Department", "Material", "Quantity", "Unit", "Source Store", "Destination", "Request Date", "Status"],
      ...filtered.map((r) => [r.id, r.requestedBy, r.department, r.material, r.quantity, r.unit, r.sourceStore, r.destination, r.requestDate, r.status]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "incoming_requests.csv";
    a.click();
  }

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Incoming Material Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Requests submitted from ESS by employees and project teams</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {(["All", "Pending", "Approved", "Fulfilled", "Forwarded to Procurement"] as const).map((s) => {
          const count = s === "All" ? requests.length : requests.filter((r) => r.status === s).length;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${statusFilter === s ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s}</p>
            </button>
          );
        })}
      </div>

      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Filter className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800"><span className="font-semibold">{pendingCount} request{pendingCount > 1 ? "s" : ""}</span> pending your review.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search request ID, requester, material…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              {["Request ID", "Requested By", "Material", "Qty", "Source Store", "Destination", "Req. Date", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">No requests found.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id}</td>
                <td className="px-4 py-3">
                  <p className="text-gray-900 font-medium">{r.requestedBy}</p>
                  <p className="text-xs text-gray-400">{r.department}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900 font-medium">{r.material}</p>
                  <p className="text-xs text-gray-400">{r.category}</p>
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">{r.quantity} <span className="text-gray-400 font-normal">{r.unit}</span></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{r.sourceStore}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  <p>{r.destination}</p>
                  <span className="text-gray-400">{r.destinationType}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.requestDate}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {r.status === "Pending" && (
                      <>
                        <button onClick={() => approve(r.id)} title="Approve"
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => reject(r.id)} title="Reject"
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {r.status === "Approved" && (
                      <button onClick={() => fulfill(r.id)} title="Mark Fulfilled"
                        className="px-2 py-1 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded-lg">
                        Fulfill
                      </button>
                    )}
                    <button onClick={() => setSelected(r)} title="View details" className="text-teal-600 hover:text-teal-800 ml-1">
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
                <h2 className="text-lg font-semibold text-gray-900">Request {selected.id}</h2>
                <p className="text-xs text-gray-400 mt-0.5">From ESS — {selected.requestedBy}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              {([
                ["Material",        `${selected.material} (${selected.category})`],
                ["Quantity",        `${selected.quantity} ${selected.unit}`],
                ["Source Store",    selected.sourceStore],
                ["Destination",     `${selected.destination} — ${selected.destinationType}`],
                ["Request Date",    selected.requestDate],
                ["Required By",     selected.requiredDate],
                ["Status",          selected.status],
                ["Remarks",         selected.remarks || "—"],
                ...(selected.approvedBy ? [["Approved / Actioned By", `${selected.approvedBy} on ${selected.approvalDate}`]] : []),
              ] as [string,string][]).map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <span className="text-xs text-gray-400 w-44 flex-shrink-0 mt-0.5">{label}</span>
                  <span className="text-sm text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>
            {selected.status === "Pending" && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-wrap">
                <button onClick={() => approve(selected.id)} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => fulfill(selected.id)} className="flex items-center gap-2 px-3 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
                  Approve & Fulfill
                </button>
                <button onClick={() => forwardToProcurement(selected.id)} className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                  <ExternalLink className="w-4 h-4" /> Fwd to Procurement
                </button>
                <button onClick={() => reject(selected.id)} className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-xl">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
            {selected.status === "Approved" && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => fulfill(selected.id)} className="flex items-center gap-2 px-3 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
                  Mark as Fulfilled
                </button>
                <button onClick={() => setSelected(null)} className="px-3 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl">Close</button>
              </div>
            )}
            {selected.status !== "Pending" && selected.status !== "Approved" && (
              <div className="px-6 py-4 border-t border-gray-100">
                <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
