import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  formatDateByGeneralSettings,
  getCurrencySymbol,
} from "../../utils/generalSettings";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { fetchEmployees } from "../../api/employees";
import { fetchDepartments } from "../../api/departments";
import {
  getAttendance,
  getPayrollRuns,
  getPayrollEntries,
} from "../../api/hr-extras";
import { getWorkforceAllocations } from "../../api/workforce-allocation";

const attConfig: Record<string, { badge: string; icon: React.ReactNode }> = {
  present: {
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
  },
  late: {
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  },
  absent: {
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
};

const defaultAttendanceConfig = {
  badge: "bg-slate-100 text-slate-700",
  icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
};

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  const abs = Math.abs(n);
  const prefix = n < 0 ? `-${symbol}` : symbol;
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${prefix}${(abs / 1000).toFixed(0)}K`;
  return `${prefix}${abs}`;
}

export function HRDashboardPage() {
  const navigate = useNavigate();
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [allAllocs, setAllAllocs] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<
    { label: string; amount: number }[]
  >([]);
  const [netPayroll, setNetPayroll] = useState(0);

  const toArray = <T,>(value: unknown): T[] =>
    Array.isArray(value) ? (value as T[]) : [];

  useEffect(() => {
    fetchEmployees()
      .then((data) => setAllEmployees(toArray<any>(data)))
      .catch(() => {});
    fetchDepartments()
      .then((data) => setAllDepartments(toArray<any>(data)))
      .catch(() => {});
    getAttendance()
      .then((data) => setTodayAttendance(toArray<any>(data)))
      .catch(() => {});
    getWorkforceAllocations()
      .then((data) => setAllAllocs(toArray<any>(data)))
      .catch(() => {});
    getPayrollRuns()
      .then((runs) => {
        const safeRuns = toArray<any>(runs);
        const latest = safeRuns[0];
        if (!latest) return;
        return getPayrollEntries(latest.id).then((ents) => {
          const safeEntries = toArray<any>(ents);
          const gross = safeEntries.reduce(
            (s, e) => s + Number(e.grossPay ?? 0),
            0,
          );
          const allowances = safeEntries.reduce(
            (s, e) => s + Number(e.allowances ?? 0),
            0,
          );
          const deductions = safeEntries.reduce(
            (s, e) => s + Number(e.deductions ?? 0),
            0,
          );
          const tax = safeEntries.reduce((s, e) => s + Number(e.tax ?? 0), 0);
          setPayrollSummary([
            { label: "Base Salaries", amount: gross - allowances },
            { label: "Allowances", amount: allowances },
            { label: "Deductions", amount: -deductions },
            { label: "Employer PAYE", amount: tax },
          ]);
          setNetPayroll(gross - deductions);
        });
      })
      .catch(() => {});
  }, []);

  const totalCount = allEmployees.length;
  const activeCount = allEmployees.filter((e) => e.status === "active").length;
  const onLeaveCount = allEmployees.filter(
    (e) => e.status === "on_leave",
  ).length;
  const inactiveCount = allEmployees.filter(
    (e) => e.status === "inactive",
  ).length;
  const now = new Date();
  const newThisMonthCount = allEmployees.filter((e) => {
    if (!e.dateHired) return false;
    const d = new Date(e.dateHired);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const presentCount = todayAttendance.filter(
    (a) => a.status === "present",
  ).length;
  const lateCount = todayAttendance.filter((a) => a.status === "late").length;
  const absentCount = todayAttendance.filter(
    (a) => a.status === "absent",
  ).length;
  const attendanceTotal = Math.max(todayAttendance.length, 1);

  const projectMap = new Map<
    string,
    { employees: number; totalAlloc: number }
  >();
  allAllocs.forEach((a) => {
    const proj = a.projectName ?? "Unknown";
    const cur = projectMap.get(proj) ?? { employees: 0, totalAlloc: 0 };
    projectMap.set(proj, {
      employees: cur.employees + 1,
      totalAlloc: cur.totalAlloc + (a.allocPct ?? 0),
    });
  });
  const projectAllocation = Array.from(projectMap.entries()).map(
    ([project, v]) => ({
      project,
      employees: v.employees,
      allocation: Math.min(
        Math.round(v.totalAlloc / Math.max(v.employees, 1)),
        100,
      ),
    }),
  );

  const employeeAllocMap = new Map<
    string,
    { role: string; projects: number }
  >();
  allAllocs.forEach((a) => {
    const cur = employeeAllocMap.get(a.employeeName) ?? {
      role: a.role ?? "",
      projects: 0,
    };
    employeeAllocMap.set(a.employeeName, {
      role: cur.role,
      projects: cur.projects + 1,
    });
  });
  const allocationAlerts = Array.from(employeeAllocMap.entries())
    .filter(([, v]) => v.projects >= 2)
    .map(([name, v]) => ({
      name,
      role: v.role,
      projects: v.projects,
      alert: v.projects >= 3 ? "Over-allocated" : "High load",
    }));

  const kpis = [
    {
      label: "Total Employees",
      value: String(totalCount),
      sub: `Across ${allDepartments.length} departments`,
      icon: <Users className="w-5 h-5" />,
      color: "text-indigo-600 bg-indigo-100",
    },
    {
      label: "Active",
      value: String(activeCount),
      sub: "Currently employed",
      icon: <UserCheck className="w-5 h-5" />,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Inactive / On Leave",
      value: String(inactiveCount + onLeaveCount),
      sub: `${onLeaveCount} on leave, ${inactiveCount} inactive`,
      icon: <UserX className="w-5 h-5" />,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "New This Month",
      value: String(newThisMonthCount),
      sub: "Onboarded this month",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Present Today",
      value: String(presentCount),
      sub: "From attendance records",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Payroll (This Month)",
      value: fmt(netPayroll || 0),
      sub: new Date().toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
      icon: <DollarSign className="w-5 h-5" />,
      color: "text-purple-600 bg-purple-100",
    },
  ];

  const deptColors = [
    "bg-indigo-400",
    "bg-blue-400",
    "bg-green-400",
    "bg-amber-400",
    "bg-purple-400",
    "bg-rose-400",
    "bg-teal-400",
    "bg-orange-400",
  ];
  const activeByDept: Record<string, number> = {};
  allEmployees.forEach((e) => {
    if (e.status === "active")
      activeByDept[e.department] = (activeByDept[e.department] || 0) + 1;
  });
  const deptBreakdown = allDepartments.map((d, i) => ({
    name: d.name,
    headcount: d.headcount,
    active: activeByDept[d.name] ?? 0,
    color: deptColors[i % deptColors.length],
  }));
  const maxHead =
    deptBreakdown.length > 0
      ? Math.max(...deptBreakdown.map((d) => d.headcount))
      : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Workforce overview — {formatDateByGeneralSettings(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/apps/hr/attendance")}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Clock className="w-3.5 h-3.5" /> Mark Attendance
          </button>
          <button
            onClick={() => navigate("/apps/hr/employees")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
          >
            <Users className="w-3.5 h-3.5" /> All Employees
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
              <p className="text-xs font-medium text-gray-500 leading-tight">
                {k.label}
              </p>
              <span className={`p-1.5 rounded-md ${k.color}`}>{k.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Attendance summary bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Today's Attendance Summary
            </h2>
          </div>
          <button
            onClick={() => navigate("/apps/hr/attendance")}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
          >
            View full <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="flex h-4 rounded-full overflow-hidden mb-3">
          <div
            className="bg-green-400 transition-all"
            style={{
              width: `${(presentCount / attendanceTotal) * 100}%`,
            }}
            title="Present"
          />
          <div
            className="bg-amber-400 transition-all"
            style={{ width: `${(lateCount / attendanceTotal) * 100}%` }}
            title="Late"
          />
          <div
            className="bg-red-300 transition-all"
            style={{
              width: `${(absentCount / attendanceTotal) * 100}%`,
            }}
            title="Absent"
          />
        </div>
        <div className="flex gap-6">
          {[
            {
              label: "Present",
              count: presentCount,
              color: "bg-green-400 text-green-700",
            },
            {
              label: "Late",
              count: lateCount,
              color: "bg-amber-400 text-amber-700",
            },
            {
              label: "Absent",
              count: absentCount,
              color: "bg-red-300 text-red-700",
            },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${s.color.split(" ")[0]}`} />
              <span className="text-sm text-gray-700 font-medium">
                {s.count}
              </span>
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {todayAttendance.slice(0, 8).map((a) => {
            const statusKey = String(a?.status ?? "").toLowerCase();
            const cfg = attConfig[statusKey] ?? defaultAttendanceConfig;
            const rowClass =
              statusKey === "present"
                ? "border-green-100 bg-green-50"
                : statusKey === "late"
                  ? "border-amber-100 bg-amber-50"
                  : statusKey === "absent"
                    ? "border-red-100 bg-red-50"
                    : "border-slate-100 bg-slate-50";
            return (
              <div
                key={a.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border ${rowClass}`}
              >
                {cfg.icon}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {a.name}
                  </p>
                  <p className="text-xs text-gray-400">{a.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Dept breakdown */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Headcount by Department
            </h2>
            <button
              onClick={() => navigate("/apps/hr/departments")}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {deptBreakdown.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {d.active}/{d.headcount}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${d.color} h-2 rounded-full`}
                    style={{ width: `${(d.headcount / maxHead) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project allocation */}
        <div className="col-span-3 space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Workforce Allocation by Project
              </h2>
              <button
                onClick={() => navigate("/apps/hr/workforce")}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
              >
                Full view <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {projectAllocation.map((p) => (
                <div key={p.project}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 font-medium truncate flex-1">
                      {p.project}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-gray-500">
                        {p.employees} staff
                      </span>
                      <span
                        className={`text-xs font-medium ${p.allocation === 100 ? "text-red-600" : p.allocation >= 85 ? "text-amber-600" : "text-green-700"}`}
                      >
                        {p.allocation}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${p.allocation === 100 ? "bg-red-400" : p.allocation >= 85 ? "bg-amber-400" : "bg-indigo-400"}`}
                      style={{ width: `${p.allocation}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Over-allocation alerts */}
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Allocation Alerts
              </h2>
            </div>
            <div className="space-y-2">
              {allocationAlerts.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-amber-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.role} · {a.projects} active projects
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.alert === "Over-allocated" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {a.alert}
                  </span>
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
            <h2 className="text-sm font-semibold text-gray-900">
              April 2026 Payroll Snapshot
            </h2>
          </div>
          <button
            onClick={() => navigate("/apps/hr/payroll")}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
          >
            Payroll overview <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {payrollSummary.map((p) => (
            <div
              key={p.label}
              className={`p-4 rounded-lg border ${p.amount < 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
            >
              <p className="text-xs text-gray-500 mb-1">{p.label}</p>
              <p
                className={`text-lg font-bold ${p.amount < 0 ? "text-red-700" : "text-gray-900"}`}
              >
                {fmt(p.amount)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between bg-indigo-50 rounded-md px-4 py-3 border border-indigo-200">
          <span className="text-sm font-medium text-indigo-700">
            Net Payroll Liability
          </span>
          <span className="text-xl font-bold text-indigo-800">
            {fmt(netPayroll || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
