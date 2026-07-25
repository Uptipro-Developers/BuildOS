import { useState } from "react";
import { Search, Download, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, UserCheck, CalendarDays } from "lucide-react";

type AttStatus = "present" | "absent" | "late" | "half_day" | "leave";

interface LogEntry {
  id: string; empId: string; empName: string; department: string; role: string;
  date: string; dayOfWeek: string; checkIn: string; checkOut: string;
  status: AttStatus; hrs: number; note: string;
}

const rawLogs: LogEntry[] = [
  { id: "L001", empId: "EMP-001", empName: "Chukwudi Eze", department: "Engineering", role: "Site Engineer", date: "Apr 28, 2025", dayOfWeek: "Mon", checkIn: "07:48 AM", checkOut: "05:10 PM", status: "present", hrs: 9.4, note: "" },
  { id: "L002", empId: "EMP-002", empName: "Aisha Bello", department: "Operations", role: "Project Manager", date: "Apr 28, 2025", dayOfWeek: "Mon", checkIn: "08:05 AM", checkOut: "06:00 PM", status: "present", hrs: 9.9, note: "" },
  { id: "L003", empId: "EMP-004", empName: "Sarah Johnson", department: "Finance", role: "Accountant", date: "Apr 28, 2025", dayOfWeek: "Mon", checkIn: "09:47 AM", checkOut: "05:00 PM", status: "late", hrs: 7.2, note: "Traffic delay reported" },
  { id: "L004", empId: "EMP-012", empName: "Lawal Musa", department: "Engineering", role: "MEP Engineer", date: "Apr 28, 2025", dayOfWeek: "Mon", checkIn: "—", checkOut: "—", status: "absent", hrs: 0, note: "No notification" },
  { id: "L005", empId: "EMP-005", empName: "Mike Davis", department: "Engineering", role: "Site Foreman", date: "Apr 28, 2025", dayOfWeek: "Mon", checkIn: "—", checkOut: "—", status: "leave", hrs: 0, note: "Annual leave – approved" },
  { id: "L006", empId: "EMP-001", empName: "Chukwudi Eze", department: "Engineering", role: "Site Engineer", date: "Apr 25, 2025", dayOfWeek: "Fri", checkIn: "07:55 AM", checkOut: "05:00 PM", status: "present", hrs: 9.1, note: "" },
  { id: "L007", empId: "EMP-001", empName: "Chukwudi Eze", department: "Engineering", role: "Site Engineer", date: "Apr 24, 2025", dayOfWeek: "Thu", checkIn: "09:45 AM", checkOut: "05:00 PM", status: "late", hrs: 7.25, note: "Client meeting ran late" },
  { id: "L008", empId: "EMP-003", empName: "Robert Lee", department: "Engineering", role: "Structural Engineer", date: "Apr 25, 2025", dayOfWeek: "Fri", checkIn: "07:50 AM", checkOut: "04:45 PM", status: "present", hrs: 8.9, note: "" },
  { id: "L009", empId: "EMP-009", empName: "Kwame Asante", department: "Engineering", role: "Civil Engineer", date: "Apr 25, 2025", dayOfWeek: "Fri", checkIn: "08:20 AM", checkOut: "12:30 PM", status: "half_day", hrs: 4.2, note: "Medical appointment" },
  { id: "L010", empId: "EMP-014", empName: "David Obi", department: "IT & Systems", role: "IT Officer", date: "Apr 24, 2025", dayOfWeek: "Thu", checkIn: "09:55 AM", checkOut: "05:00 PM", status: "late", hrs: 7.1, note: "" },
  { id: "L011", empId: "EMP-006", empName: "Alice Ware", department: "Human Resources", role: "HR Officer", date: "Apr 24, 2025", dayOfWeek: "Thu", checkIn: "08:00 AM", checkOut: "05:00 PM", status: "present", hrs: 9.0, note: "" },
  { id: "L012", empId: "EMP-013", empName: "Funke Adeyemi", department: "Finance", role: "Finance Analyst", date: "Apr 24, 2025", dayOfWeek: "Thu", checkIn: "08:15 AM", checkOut: "05:00 PM", status: "present", hrs: 8.75, note: "" },
  { id: "L013", empId: "EMP-007", empName: "Tom Fox", department: "Procurement", role: "Quantity Surveyor", date: "Apr 23, 2025", dayOfWeek: "Wed", checkIn: "08:10 AM", checkOut: "05:15 PM", status: "present", hrs: 9.1, note: "" },
  { id: "L014", empId: "EMP-004", empName: "Sarah Johnson", department: "Finance", role: "Accountant", date: "Apr 23, 2025", dayOfWeek: "Wed", checkIn: "—", checkOut: "—", status: "absent", hrs: 0, note: "" },
  { id: "L015", empId: "EMP-011", empName: "Bisi Akinola", department: "Administration", role: "Admin Officer", date: "Apr 23, 2025", dayOfWeek: "Wed", checkIn: "08:02 AM", checkOut: "05:05 PM", status: "present", hrs: 9.0, note: "" },
  { id: "L016", empId: "EMP-010", empName: "Emeka Nwosu", department: "Health & Safety", role: "HSE Officer", date: "Apr 22, 2025", dayOfWeek: "Tue", checkIn: "07:45 AM", checkOut: "12:00 PM", status: "half_day", hrs: 4.25, note: "Site inspection AM only" },
  { id: "L017", empId: "EMP-002", empName: "Aisha Bello", department: "Operations", role: "Project Manager", date: "Apr 22, 2025", dayOfWeek: "Tue", checkIn: "08:00 AM", checkOut: "06:15 PM", status: "present", hrs: 10.25, note: "" },
  { id: "L018", empId: "EMP-001", empName: "Chukwudi Eze", department: "Engineering", role: "Site Engineer", date: "Apr 22, 2025", dayOfWeek: "Tue", checkIn: "—", checkOut: "—", status: "absent", hrs: 0, note: "" },
  { id: "L019", empId: "EMP-015", empName: "Yemi Olusegun", department: "Operations", role: "Project Manager", date: "Apr 21, 2025", dayOfWeek: "Mon", checkIn: "08:00 AM", checkOut: "06:30 PM", status: "present", hrs: 10.5, note: "" },
  { id: "L020", empId: "EMP-008", empName: "Ngozi Eze", department: "Engineering", role: "Site Supervisor", date: "Apr 21, 2025", dayOfWeek: "Mon", checkIn: "07:52 AM", checkOut: "04:40 PM", status: "present", hrs: 8.8, note: "" },
];

const statusConfig: Record<AttStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  present: { label: "Present", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3 text-green-600" /> },
  absent: { label: "Absent", badge: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3 text-red-500" /> },
  late: { label: "Late", badge: "bg-amber-100 text-amber-700", icon: <Clock className="w-3 h-3 text-amber-500" /> },
  half_day: { label: "Half Day", badge: "bg-blue-100 text-blue-700", icon: <UserCheck className="w-3 h-3 text-blue-500" /> },
  leave: { label: "On Leave", badge: "bg-purple-100 text-purple-700", icon: <CalendarDays className="w-3 h-3 text-purple-500" /> },
};

const depts = ["All Departments", ...Array.from(new Set(rawLogs.map(l => l.department))).sort()];
const dates = ["All Dates", ...Array.from(new Set(rawLogs.map(l => l.date)))];
const employees = ["All Employees", ...Array.from(new Set(rawLogs.map(l => l.empName))).sort()];
const statuses = ["All Status", "present", "absent", "late", "half_day", "leave"] as const;

const PAGE_SIZE = 10;

export function AttendanceLogsPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [empFilter, setEmpFilter] = useState("All Employees");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [statusFilter, setStatusFilter] = useState<typeof statuses[number]>("All Status");
  const [page, setPage] = useState(1);

  const filtered = rawLogs.filter(l => {
    const matchS = l.empName.toLowerCase().includes(search.toLowerCase()) || l.empId.toLowerCase().includes(search.toLowerCase());
    const matchD = deptFilter === "All Departments" || l.department === deptFilter;
    const matchE = empFilter === "All Employees" || l.empName === empFilter;
    const matchDt = dateFilter === "All Dates" || l.date === dateFilter;
    const matchSt = statusFilter === "All Status" || l.status === statusFilter;
    return matchS && matchD && matchE && matchDt && matchSt;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = {
    present: filtered.filter(l => l.status === "present").length,
    absent: filtered.filter(l => l.status === "absent").length,
    late: filtered.filter(l => l.status === "late").length,
    totalHrs: filtered.reduce((s, l) => s + l.hrs, 0).toFixed(1),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Attendance Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historical attendance records for all employees</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" /> Export Logs
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: filtered.length, color: "text-indigo-700 bg-indigo-50" },
          { label: "Present Sessions", value: totals.present, color: "text-green-700 bg-green-50" },
          { label: "Absence Events", value: totals.absent, color: "text-red-700 bg-red-50" },
          { label: "Total Hours Logged", value: `${totals.totalHrs}h`, color: "text-blue-700 bg-blue-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={empFilter} onChange={e => { setEmpFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {employees.map(e => <option key={e}>{e}</option>)}
        </select>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {dates.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statuses[number]); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {statuses.map(s => <option key={s} value={s}>{s === "half_day" ? "Half Day" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Department</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Check In</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Check Out</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Hours</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map(log => {
              const cfg = statusConfig[log.status];
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{log.date}</p>
                    <p className="text-xs text-gray-400">{log.dayOfWeek}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{log.empName}</p>
                    <p className="text-xs text-gray-400 font-mono">{log.empId}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.department}</td>
                  <td className="px-4 py-3 text-gray-600">{log.checkIn}</td>
                  <td className="px-4 py-3 text-gray-600">{log.checkOut}</td>
                  <td className="px-4 py-3 text-gray-600">{log.hrs > 0 ? `${log.hrs}h` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 italic">{log.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No attendance logs match your filters</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 text-xs">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium ${p === page ? "bg-indigo-700 text-white" : "hover:bg-gray-100 text-gray-600"}`}>
                {p}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
