import { useNavigate } from "react-router";
import {
  Users, UserCheck, UserX, Clock, DollarSign, Network,
  AlertTriangle, ChevronRight, TrendingUp, ArrowUpRight,
  CheckCircle, XCircle, Minus, Building2,
} from "lucide-react";

const kpis = [
  { label: "Total Employees", value: "86", sub: "Across 8 departments", icon: <Users className="w-5 h-5" />, color: "text-indigo-600 bg-indigo-100" },
  { label: "Active", value: "79", sub: "Currently employed", icon: <UserCheck className="w-5 h-5" />, color: "text-green-600 bg-green-100" },
  { label: "Inactive / On Leave", value: "7", sub: "3 on leave, 4 inactive", icon: <UserX className="w-5 h-5" />, color: "text-amber-600 bg-amber-100" },
  { label: "New This Month", value: "4", sub: "Onboarded in April", icon: <TrendingUp className="w-5 h-5" />, color: "text-blue-600 bg-blue-100" },
  { label: "Present Today", value: "71", sub: "Out of 79 active", icon: <CheckCircle className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-100" },
  { label: "Payroll (This Month)", value: "₦28.4M", sub: "April 2026 cycle", icon: <DollarSign className="w-5 h-5" />, color: "text-purple-600 bg-purple-100" },
];

const todayAttendance = [
  { name: "Chukwudi Eze", role: "Site Engineer", dept: "Engineering", status: "present", time: "07:48" },
  { name: "Aisha Bello", role: "Project Manager", dept: "Operations", status: "present", time: "08:02" },
  { name: "Robert Lee", role: "Structural Engineer", dept: "Engineering", status: "late", time: "09:31" },
  { name: "Sarah Johnson", role: "Accountant", dept: "Finance", status: "present", time: "07:55" },
  { name: "Mike Davis", role: "Site Foreman", dept: "Engineering", status: "absent", time: "—" },
  { name: "Alice Ware", role: "HR Officer", dept: "Human Resources", status: "present", time: "08:10" },
  { name: "Tom Fox", role: "Quantity Surveyor", dept: "Procurement", status: "present", time: "08:20" },
  { name: "Ngozi Eze", role: "Site Supervisor", dept: "Engineering", status: "late", time: "09:15" },
];

const deptBreakdown = [
  { name: "Engineering", headcount: 24, active: 22, color: "bg-indigo-400" },
  { name: "Operations", headcount: 16, active: 15, color: "bg-blue-400" },
  { name: "Finance", headcount: 10, active: 10, color: "bg-green-400" },
  { name: "Procurement", headcount: 12, active: 11, color: "bg-amber-400" },
  { name: "Human Resources", headcount: 5, active: 5, color: "bg-purple-400" },
  { name: "Administration", headcount: 8, active: 7, color: "bg-rose-400" },
  { name: "Health & Safety", headcount: 7, active: 6, color: "bg-teal-400" },
  { name: "IT & Systems", headcount: 4, active: 3, color: "bg-orange-400" },
];
const maxHead = Math.max(...deptBreakdown.map(d => d.headcount));

const projectAllocation = [
  { project: "Downtown Office Complex", employees: 18, allocation: 91 },
  { project: "Riverside Residential", employees: 12, allocation: 75 },
  { project: "Highway Interchange", employees: 22, allocation: 100 },
  { project: "Industrial Warehouse", employees: 9, allocation: 56 },
  { project: "University Science Block", employees: 14, allocation: 82 },
];

const allocationAlerts = [
  { name: "Robert Lee", role: "Structural Engineer", projects: 4, alert: "Over-allocated" },
  { name: "Aisha Bello", role: "Project Manager", projects: 3, alert: "High load" },
  { name: "Tom Fox", role: "Quantity Surveyor", projects: 3, alert: "High load" },
];

const payrollSummary = [
  { label: "Base Salaries", amount: 22400000 },
  { label: "Allowances", amount: 3820000 },
  { label: "Deductions", amount: -1580000 },
  { label: "Employer PAYE", amount: 3760000 },
];

const attConfig: Record<string, { badge: string; icon: React.ReactNode }> = {
  present: { badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" /> },
  late: { badge: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
  absent: { badge: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
};

const formatLocalToday = () =>
  new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function fmt(n: number) {
  const abs = Math.abs(n);
  const prefix = n < 0 ? "-₦" : "₦";
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${prefix}${(abs / 1000).toFixed(0)}K`;
  return `${prefix}${abs}`;
}

export function HRDashboardPage() {
  const navigate = useNavigate();
  const todayLabel = formatLocalToday();
  const presentCount = todayAttendance.filter(a => a.status === "present").length;
  const lateCount = todayAttendance.filter(a => a.status === "late").length;
  const absentCount = todayAttendance.filter(a => a.status === "absent").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Workforce overview — {todayLabel}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/apps/hr/attendance")} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Clock className="w-3.5 h-3.5" /> Mark Attendance
          </button>
          <button onClick={() => navigate("/apps/hr")} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">
            <Users className="w-3.5 h-3.5" /> All Employees
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 leading-tight">{k.label}</p>
              <span className={`p-1.5 rounded-md ${k.color}`}>{k.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Attendance summary bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">Today's Attendance Summary</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Real-time daily attendance metrics and employee check-in logs</p>
          </div>
          <button onClick={() => navigate("/apps/hr/attendance")} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            View Daily Attendance <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Daily Attendance Metrics Grid */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500">Expected Today</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{todayAttendance.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">All scheduled staff</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs font-medium text-emerald-700">Present</p>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">{presentCount}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">{Math.round((presentCount / todayAttendance.length) * 100)}% of workforce</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700">Late Arrival</p>
            <p className="text-xl font-bold text-amber-800 mt-0.5">{lateCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">{Math.round((lateCount / todayAttendance.length) * 100)}% of workforce</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700">Absent</p>
            <p className="text-xl font-bold text-red-800 mt-0.5">{absentCount}</p>
            <p className="text-[10px] text-red-600 mt-0.5">{Math.round((absentCount / todayAttendance.length) * 100)}% of workforce</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-xs font-medium text-indigo-700">Attendance Rate</p>
            <p className="text-xl font-bold text-indigo-800 mt-0.5">{Math.round(((presentCount + lateCount) / todayAttendance.length) * 100)}%</p>
            <p className="text-[10px] text-indigo-600 mt-0.5">Daily turnout rate</p>
          </div>
        </div>

        {/* Attendance Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
            <span>Daily Attendance Breakdown</span>
            <span>{presentCount + lateCount} / {todayAttendance.length} Checked In</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            <div className="bg-emerald-500 transition-all" style={{ width: `${(presentCount / todayAttendance.length) * 100}%` }} title="Present" />
            <div className="bg-amber-400 transition-all" style={{ width: `${(lateCount / todayAttendance.length) * 100}%` }} title="Late" />
            <div className="bg-red-400 transition-all" style={{ width: `${(absentCount / todayAttendance.length) * 100}%` }} title="Absent" />
          </div>
        </div>

        {/* Visible Employee Names List */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Today's Employee Attendance Logs</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {todayAttendance.map(a => {
              const cfg = attConfig[a.status];
              return (
                <div key={a.name} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${a.status === "present" ? "border-emerald-200 bg-emerald-50/50" : a.status === "late" ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{a.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{a.role} · {a.dept}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Check in: {a.time}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ml-2 ${cfg.badge}`}>
                    {a.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Dept breakdown */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Headcount by Department</h2>
            <button onClick={() => navigate("/apps/hr/departments")} className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {deptBreakdown.map(d => (
              <div key={d.name}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="font-medium text-gray-900 ml-2">{d.active}/{d.headcount}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${d.color} h-2 rounded-full`} style={{ width: `${(d.headcount / maxHead) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project allocation */}
        <div className="col-span-3 space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Workforce Allocation by Project</h2>
              <button onClick={() => navigate("/apps/hr/workforce")} className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
                Full view <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {projectAllocation.map(p => (
                <div key={p.project}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 font-medium truncate flex-1">{p.project}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-gray-500">{p.employees} staff</span>
                      <span className={`text-xs font-medium ${p.allocation === 100 ? "text-red-600" : p.allocation >= 85 ? "text-amber-600" : "text-green-700"}`}>{p.allocation}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${p.allocation === 100 ? "bg-red-400" : p.allocation >= 85 ? "bg-amber-400" : "bg-indigo-400"}`} style={{ width: `${p.allocation}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Over-allocation alerts */}
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">Allocation Alerts</h2>
            </div>
            <div className="space-y-2">
              {allocationAlerts.map(a => (
                <div key={a.name} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.role} · {a.projects} active projects</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.alert === "Over-allocated" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.alert}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payroll snapshot */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-900">April 2026 Payroll Snapshot</h2>
          </div>
          <button onClick={() => navigate("/apps/hr/payroll")} className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
            Payroll overview <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {payrollSummary.map(p => (
            <div key={p.label} className={`p-4 rounded-lg border ${p.amount < 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs text-gray-500 mb-1">{p.label}</p>
              <p className={`text-lg font-bold ${p.amount < 0 ? "text-red-700" : "text-gray-900"}`}>{fmt(p.amount)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between bg-indigo-50 rounded-md px-4 py-3 border border-indigo-200">
          <span className="text-sm font-medium text-indigo-700">Net Payroll Liability</span>
          <span className="text-xl font-bold text-indigo-800">₦28.4M</span>
        </div>
      </div>
    </div>
  );
}
