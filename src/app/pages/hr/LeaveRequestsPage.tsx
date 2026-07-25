import { useState } from "react";
import { Search, CheckCircle, XCircle, Clock, Filter } from "lucide-react";

type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  id: string;
  refId: string;
  employee: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string;
}

const SEED: LeaveRequest[] = [
  { id: "lr1", refId: "LV-2026-001", employee: "Chukwudi Eze",   department: "Engineering",    leaveType: "Annual Leave",    startDate: "2026-04-14", endDate: "2026-04-18", days: 5, status: "pending",  submittedAt: "Apr 10, 2026", approvedBy: null,             approvedAt: null,                    notes: "Family holiday" },
  { id: "lr2", refId: "LV-2026-002", employee: "Aisha Bello",    department: "Operations",     leaveType: "Sick Leave",      startDate: "2026-04-11", endDate: "2026-04-13", days: 3, status: "approved", submittedAt: "Apr 9, 2026",  approvedBy: "Ngozi Okafor",   approvedAt: "Apr 10, 2026 09:15",    notes: "Doctor's appointment" },
  { id: "lr3", refId: "LV-2026-003", employee: "Tom Fox",        department: "Procurement",    leaveType: "Emergency Leave", startDate: "2026-04-10", endDate: "2026-04-10", days: 1, status: "approved", submittedAt: "Apr 10, 2026", approvedBy: "Ngozi Okafor",   approvedAt: "Apr 10, 2026 10:00",    notes: "Family emergency" },
  { id: "lr4", refId: "LV-2026-004", employee: "Funke Adeyemi",  department: "Finance",        leaveType: "Annual Leave",    startDate: "2026-04-20", endDate: "2026-04-24", days: 5, status: "pending",  submittedAt: "Apr 8, 2026",  approvedBy: null,             approvedAt: null,                    notes: "" },
  { id: "lr5", refId: "LV-2026-005", employee: "Emeka Nwosu",    department: "Health & Safety",leaveType: "Study Leave",     startDate: "2026-04-15", endDate: "2026-04-17", days: 3, status: "rejected", submittedAt: "Apr 7, 2026",  approvedBy: "Ngozi Okafor",   approvedAt: "Apr 8, 2026 14:20",     notes: "Training course" },
  { id: "lr6", refId: "LV-2026-006", employee: "Sarah Johnson",  department: "Finance",        leaveType: "Annual Leave",    startDate: "2026-05-01", endDate: "2026-05-08", days: 6, status: "pending",  submittedAt: "Apr 5, 2026",  approvedBy: null,             approvedAt: null,                    notes: "Annual vacation" },
  { id: "lr7", refId: "LV-2026-007", employee: "Fatima Aliyu",   department: "Engineering",    leaveType: "Maternity Leave", startDate: "2026-05-01", endDate: "2026-07-31", days: 63, status: "approved", submittedAt: "Apr 3, 2026", approvedBy: "Ngozi Okafor",   approvedAt: "Apr 4, 2026 11:00",     notes: "" },
];

const STATUS_CONF: Record<LeaveStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending",  badge: "bg-amber-100 text-amber-700", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Approved", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejected", badge: "bg-red-100 text-red-700",    icon: <XCircle className="w-3 h-3" /> },
};

const LEAVE_TYPES = ["All", "Annual Leave", "Sick Leave", "Emergency Leave", "Maternity Leave", "Paternity Leave", "Study Leave", "Compassionate Leave"];

export function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>(SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState("All");

  function approve(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" as const, approvedBy: "Ngozi Okafor", approvedAt: "Apr 10, 2026" } : r));
  }

  function reject(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" as const, approvedBy: "Ngozi Okafor", approvedAt: "Apr 10, 2026" } : r));
  }

  const displayed = requests.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.employee.toLowerCase().includes(q) && !r.refId.toLowerCase().includes(q)) return false;
    if (statusFilter !== "All" && r.status !== statusFilter) return false;
    if (typeFilter !== "All" && r.leaveType !== typeFilter) return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pendingCount} pending approval</p>
        </div>
      </div>

      {/* Status tab filters */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: "All",      label: "All",      count: requests.length },
          { key: "pending",  label: "Pending",  count: pendingCount   },
          { key: "approved", label: "Approved", count: approvedCount  },
          { key: "rejected", label: "Rejected", count: rejectedCount  },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${statusFilter === tab.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab.label} <span className="ml-1 text-xs text-gray-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search + type filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by employee or ref…" className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref / Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Leave Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
              <th className="px-4 py-3 w-40" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(r => {
              const s = STATUS_CONF[r.status];
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{r.employee}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.refId} · {r.department}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.leaveType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {r.startDate}<span className="text-gray-300 mx-1">→</span>{r.endDate}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.days}d</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>{s.icon}{s.label}</span>
                    {r.approvedBy && <p className="text-xs text-gray-400 mt-0.5">by {r.approvedBy}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.submittedAt}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => approve(r.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => reject(r.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No leave requests match the current filters</div>
        )}
      </div>
    </div>
  );
}
