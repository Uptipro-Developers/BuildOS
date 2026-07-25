import { useState } from "react";
import {
  CheckCircle, XCircle, Clock, UserCheck, Search, Download,
  CalendarDays, Filter, ChevronDown, Users, AlertTriangle,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";

type AttStatus = "present" | "absent" | "late" | "half_day" | "leave";

interface AttRecord {
  id: string; name: string; role: string; department: string;
  checkIn: string; checkOut: string; status: AttStatus; hrs: number;
}

const getTodayFormatted = () => new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const today = getTodayFormatted();

const initialRecords: AttRecord[] = [
  { id: "EMP-001", name: "Chukwudi Eze", role: "Site Engineer", department: "Engineering", checkIn: "07:48 AM", checkOut: "05:10 PM", status: "present", hrs: 9.4 },
  { id: "EMP-002", name: "Aisha Bello", role: "Project Manager", department: "Operations", checkIn: "08:05 AM", checkOut: "06:00 PM", status: "present", hrs: 9.9 },
  { id: "EMP-003", name: "Robert Lee", role: "Structural Engineer", department: "Engineering", checkIn: "07:55 AM", checkOut: "04:50 PM", status: "present", hrs: 8.9 },
  { id: "EMP-004", name: "Sarah Johnson", role: "Accountant", department: "Finance", checkIn: "09:47 AM", checkOut: "05:00 PM", status: "late", hrs: 7.2 },
  { id: "EMP-005", name: "Mike Davis", role: "Site Foreman", department: "Engineering", checkIn: "—", checkOut: "—", status: "leave", hrs: 0 },
  { id: "EMP-006", name: "Alice Ware", role: "HR Officer", department: "Human Resources", checkIn: "08:00 AM", checkOut: "05:00 PM", status: "present", hrs: 9.0 },
  { id: "EMP-007", name: "Tom Fox", role: "Quantity Surveyor", department: "Procurement", checkIn: "08:10 AM", checkOut: "05:15 PM", status: "present", hrs: 9.1 },
  { id: "EMP-008", name: "Ngozi Eze", role: "Site Supervisor", department: "Engineering", checkIn: "07:52 AM", checkOut: "04:40 PM", status: "present", hrs: 8.8 },
  { id: "EMP-009", name: "Kwame Asante", role: "Civil Engineer", department: "Engineering", checkIn: "08:20 AM", checkOut: "05:00 PM", status: "present", hrs: 8.7 },
  { id: "EMP-010", name: "Emeka Nwosu", role: "HSE Officer", department: "Health & Safety", checkIn: "07:45 AM", checkOut: "04:00 PM", status: "half_day", hrs: 4.3 },
  { id: "EMP-011", name: "Bisi Akinola", role: "Admin Officer", department: "Administration", checkIn: "08:02 AM", checkOut: "05:05 PM", status: "present", hrs: 9.0 },
  { id: "EMP-012", name: "Lawal Musa", role: "MEP Engineer", department: "Engineering", checkIn: "—", checkOut: "—", status: "absent", hrs: 0 },
  { id: "EMP-013", name: "Funke Adeyemi", role: "Finance Analyst", department: "Finance", checkIn: "08:15 AM", checkOut: "05:00 PM", status: "present", hrs: 8.8 },
  { id: "EMP-014", name: "David Obi", role: "IT Officer", department: "IT & Systems", checkIn: "09:55 AM", checkOut: "05:00 PM", status: "late", hrs: 7.1 },
  { id: "EMP-015", name: "Yemi Olusegun", role: "Project Manager", department: "Operations", checkIn: "08:00 AM", checkOut: "06:30 PM", status: "present", hrs: 10.5 },
];

const statusConfig: Record<AttStatus, { label: string; badge: string; icon: React.ReactNode; rowColor: string }> = {
  present: { label: "Present", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />, rowColor: "" },
  absent: { label: "Absent", badge: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5 text-red-500" />, rowColor: "bg-red-50/40" },
  late: { label: "Late", badge: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5 text-amber-500" />, rowColor: "bg-amber-50/30" },
  half_day: { label: "Half Day", badge: "bg-blue-100 text-blue-700", icon: <UserCheck className="w-3.5 h-3.5 text-blue-500" />, rowColor: "bg-blue-50/30" },
  leave: { label: "On Leave", badge: "bg-purple-100 text-purple-700", icon: <CalendarDays className="w-3.5 h-3.5 text-purple-500" />, rowColor: "bg-purple-50/30" },
};

const depts = ["All Departments", ...Array.from(new Set(initialRecords.map(r => r.department))).sort()];
const statusOptions: { key: AttStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "present", label: "Present" },
  { key: "absent", label: "Absent" },
  { key: "late", label: "Late" },
  { key: "half_day", label: "Half Day" },
  { key: "leave", label: "On Leave" },
];

export function AttendancePage() {
  const [records, setRecords] = useState<AttRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState<AttStatus | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<AttStatus>("present");

  const counts = {
    present: records.filter(r => r.status === "present").length,
    absent: records.filter(r => r.status === "absent").length,
    late: records.filter(r => r.status === "late").length,
    half_day: records.filter(r => r.status === "half_day").length,
    leave: records.filter(r => r.status === "leave").length,
  };

  const filtered = records.filter(r => {
    const matchS = r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchD = deptFilter === "All Departments" || r.department === deptFilter;
    const matchSt = statusFilter === "all" || r.status === statusFilter;
    return matchS && matchD && matchSt;
  });

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  }

  function toggleOne(id: string) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }

  function markSelected(status: AttStatus) {
    setRecords(prev => prev.map(r => selected.has(r.id) ? { ...r, status } : r));
    setSelected(new Set());
  }

  function markOne(id: string, status: AttStatus) {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  const avatarColors = ["bg-indigo-100 text-indigo-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
  const colorFor = (id: string) => avatarColors[parseInt(id.slice(-3)) % avatarColors.length];
  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Employee ID", "Name", "Role", "Department", "Check In", "Check Out", "Hours", "Status"];
            const rows = filtered.map(r => [r.id, r.name, r.role, r.department, r.checkIn, r.checkOut, r.hrs > 0 ? `${r.hrs}h` : "—", statusConfig[r.status].label]);
            exportCSV(`attendance-${today.replace(/[^a-zA-Z0-9]/g, "-")}`, headers, rows);
          }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => setRecords(prev => prev.map(r => ({ ...r, status: "present" as AttStatus })))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">
            <CheckCircle className="w-3.5 h-3.5" /> Mark All Present
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {([
          { key: "present", label: "Present", color: "bg-green-50 text-green-700", border: "border-green-200" },
          { key: "absent", label: "Absent", color: "bg-red-50 text-red-700", border: "border-red-200" },
          { key: "late", label: "Late", color: "bg-amber-50 text-amber-700", border: "border-amber-200" },
          { key: "half_day", label: "Half Day", color: "bg-blue-50 text-blue-700", border: "border-blue-200" },
          { key: "leave", label: "On Leave", color: "bg-purple-50 text-purple-700", border: "border-purple-200" },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
            className={`rounded-lg border p-3 text-left transition-all ${s.color} ${s.border} ${statusFilter === s.key ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}>
            <p className="text-2xl font-bold">{counts[s.key]}</p>
            <p className="text-xs mt-0.5 font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as AttStatus)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white">
              {(["present", "absent", "late", "half_day", "leave"] as AttStatus[]).map(s => (
                <option key={s} value={s}>{statusConfig[s].label}</option>
              ))}
            </select>
            <button onClick={() => markSelected(bulkStatus)} className="px-3 py-1.5 bg-indigo-700 text-white rounded text-xs hover:bg-indigo-800">
              Apply to Selected
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {counts.absent > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{counts.absent} employee{counts.absent > 1 ? "s" : ""}</strong> marked absent today. Consider follow-up.</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Department</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Check In</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Check Out</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Hours</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Quick Mark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(rec => {
              const cfg = statusConfig[rec.status];
              return (
                <tr key={rec.id} className={`hover:bg-gray-50/60 ${cfg.rowColor}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(rec.id)} onChange={() => toggleOne(rec.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorFor(rec.id)}`}>
                        {initials(rec.name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rec.name}</p>
                        <p className="text-xs text-gray-400">{rec.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{rec.department}</td>
                  <td className="px-4 py-3 text-gray-600">{rec.checkIn}</td>
                  <td className="px-4 py-3 text-gray-600">{rec.checkOut}</td>
                  <td className="px-4 py-3 text-gray-600">{rec.hrs > 0 ? `${rec.hrs}h` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={rec.status} onChange={e => markOne(rec.id, e.target.value as AttStatus)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none">
                      {(["present", "absent", "late", "half_day", "leave"] as AttStatus[]).map(s => (
                        <option key={s} value={s}>{statusConfig[s].label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
