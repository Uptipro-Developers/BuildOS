import { useState, useEffect } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  getAttendance,
  getPayrollRuns,
  getPayrollEntries,
} from "../../api/hr-extras";
import { getWorkforceAllocations } from "../../api/workforce-allocation";
import {
  FileText,
  Download,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
} from "lucide-react";

type ReportType = "attendance" | "workforce" | "payroll";

interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  lastGenerated: string;
  formats: string[];
}

const reports: ReportConfig[] = [
  {
    type: "attendance",
    title: "Attendance Report",
    description:
      "Monthly attendance summary per employee and department. Includes presence rate, late arrivals, absences, and total hours worked.",
    icon: <Clock className="w-6 h-6" />,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    lastGenerated: "Apr 25, 2025 – 09:30 AM",
    formats: ["PDF", "CSV", "XLSX"],
  },
  {
    type: "workforce",
    title: "Workforce Utilization Report",
    description:
      "Personnel allocation across all active projects. Highlights over-allocated staff, idle capacity, and department workload distribution.",
    icon: <Users className="w-6 h-6" />,
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    lastGenerated: "Apr 20, 2025 – 02:15 PM",
    formats: ["PDF", "XLSX"],
  },
  {
    type: "payroll",
    title: "Payroll Summary Report",
    description:
      "End-of-month payroll breakdown by employee, department, and grade level. Includes gross pay, deductions, and net disbursement totals.",
    icon: <DollarSign className="w-6 h-6" />,
    color: "text-green-700",
    bgColor: "bg-green-100",
    lastGenerated: "Apr 30, 2025 – 11:00 AM",
    formats: ["PDF", "CSV", "XLSX"],
  },
];

const fmt = (n: number) => `${getCurrencySymbol()}${(n / 1000000).toFixed(1)}M`;

export function HRReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("attendance");
  const [period, setPeriod] = useState("April 2025");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<ReportType | null>(null);

  type AttRow = {
    dept: string;
    employees: number;
    present: number;
    absent: number;
    late: number;
    avgHrs: number;
    presenceRate: number;
  };
  type WorkRow = {
    project: string;
    headcount: number;
    avgAlloc: number;
    overAllocated: number;
  };
  type PayRow = {
    dept: string;
    employees: number;
    grossTotal: number;
    netTotal: number;
  };

  const [attendancePreview, setAttendancePreview] = useState<AttRow[]>([]);
  const [workforcePreview, setWorkforcePreview] = useState<WorkRow[]>([]);
  const [payrollPreview, setPayrollPreview] = useState<PayRow[]>([]);

  useEffect(() => {
    getAttendance()
      .then((recs) => {
        const deptMap = new Map<
          string,
          {
            present: number;
            absent: number;
            late: number;
            hrs: number[];
            emps: Set<string>;
          }
        >();
        recs.forEach((r: any) => {
          const d = r.department ?? "Unknown";
          const cur = deptMap.get(d) ?? {
            present: 0,
            absent: 0,
            late: 0,
            hrs: [],
            emps: new Set(),
          };
          if (r.status === "present") cur.present++;
          else if (r.status === "absent") cur.absent++;
          else if (r.status === "late") cur.late++;
          if (r.hoursWorked) cur.hrs.push(r.hoursWorked);
          if (r.employeeId) cur.emps.add(r.employeeId);
          deptMap.set(d, cur);
        });
        setAttendancePreview(
          Array.from(deptMap.entries()).map(([dept, v]) => ({
            dept,
            employees: v.emps.size,
            present: v.present,
            absent: v.absent,
            late: v.late,
            avgHrs: v.hrs.length
              ? Math.round(
                  (v.hrs.reduce((a, b) => a + b, 0) / v.hrs.length) * 10,
                ) / 10
              : 0,
            presenceRate:
              v.present + v.absent + v.late > 0
                ? Math.round(
                    (v.present / (v.present + v.absent + v.late)) * 1000,
                  ) / 10
                : 0,
          })),
        );
      })
      .catch(() => {});

    getWorkforceAllocations()
      .then((allocs: any[]) => {
        const projMap = new Map<
          string,
          { headcount: number; totalAlloc: number; overCount: number }
        >();
        allocs.forEach((a) => {
          const proj = a.projectName ?? "Unknown";
          const cur = projMap.get(proj) ?? {
            headcount: 0,
            totalAlloc: 0,
            overCount: 0,
          };
          projMap.set(proj, {
            headcount: cur.headcount + 1,
            totalAlloc: cur.totalAlloc + (a.allocPct ?? 0),
            overCount: cur.overCount + ((a.allocPct ?? 0) > 100 ? 1 : 0),
          });
        });
        setWorkforcePreview(
          Array.from(projMap.entries()).map(([project, v]) => ({
            project,
            headcount: v.headcount,
            avgAlloc: v.headcount ? Math.round(v.totalAlloc / v.headcount) : 0,
            overAllocated: v.overCount,
          })),
        );
      })
      .catch(() => {});

    getPayrollRuns()
      .then((runs) => {
        const latest = runs[0];
        if (!latest) return;
        return getPayrollEntries(latest.id).then((ents) => {
          const dMap = new Map<
            string,
            { employees: number; grossTotal: number; netTotal: number }
          >();
          ents.forEach((e: any) => {
            const d = e.department ?? "Unknown";
            const cur = dMap.get(d) ?? {
              employees: 0,
              grossTotal: 0,
              netTotal: 0,
            };
            dMap.set(d, {
              employees: cur.employees + 1,
              grossTotal: cur.grossTotal + e.grossPay,
              netTotal: cur.netTotal + e.netPay,
            });
          });
          setPayrollPreview(
            Array.from(dMap.entries()).map(([dept, v]) => ({ dept, ...v })),
          );
        });
      })
      .catch(() => {});
  }, []);

  const periods = ["January 2025", "February 2025", "March 2025", "April 2025"];

  function generate(type: ReportType) {
    setGenerating(true);
    setActiveReport(type);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(type);
    }, 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HR Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate, preview, and export HR analytical reports
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
        >
          {periods.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-3 gap-4">
        {reports.map((r) => (
          <div
            key={r.type}
            className={`bg-white rounded-lg border-2 p-5 cursor-pointer transition-all hover:shadow-sm ${activeReport === r.type ? "border-indigo-400 shadow-sm" : "border-gray-200"}`}
            onClick={() => setActiveReport(r.type)}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.bgColor} ${r.color}`}
              >
                {r.icon}
              </div>
              {generated === r.type && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              {r.description}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Last: {r.lastGenerated}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {r.formats.map((f) => (
                <span
                  key={f}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium"
                >
                  {f}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  generate(r.type);
                }}
                disabled={generating && activeReport === r.type}
                className="flex-1 py-1.5 bg-indigo-700 text-white rounded text-xs font-medium hover:bg-indigo-800 disabled:opacity-60"
              >
                {generating && activeReport === r.type
                  ? "Generating..."
                  : "Generate Report"}
              </button>
              <button
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Panel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <p className="font-medium text-gray-800 text-sm">
              {activeReport === "attendance"
                ? "Attendance Report"
                : activeReport === "workforce"
                  ? "Workforce Utilization Report"
                  : "Payroll Summary Report"}{" "}
              · {period}
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        {/* Attendance preview */}
        {activeReport === "attendance" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "Total Work Days",
                  value: String(
                    new Set(attendancePreview.map(() => 0)).size || 22,
                  ),
                },
                {
                  label: "Avg Presence Rate",
                  value: attendancePreview.length
                    ? (
                        attendancePreview.reduce(
                          (s, r) => s + r.presenceRate,
                          0,
                        ) / attendancePreview.length
                      ).toFixed(1) + "%"
                    : "—",
                },
                {
                  label: "Total Absence Events",
                  value: String(
                    attendancePreview.reduce((s, r) => s + r.absent, 0),
                  ),
                },
                {
                  label: "Total Late Events",
                  value: String(
                    attendancePreview.reduce((s, r) => s + r.late, 0),
                  ),
                },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">
                    Department
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Employees
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Present Sessions
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Absent
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Late
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Avg Hrs
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Presence Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendancePreview.map((r) => (
                  <tr key={r.dept}>
                    <td className="py-2.5 font-medium text-gray-800">
                      {r.dept}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {r.employees}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {r.present}
                    </td>
                    <td className="py-2.5 text-right text-red-500">
                      {r.absent}
                    </td>
                    <td className="py-2.5 text-right text-amber-600">
                      {r.late}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {r.avgHrs}h
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`font-medium ${r.presenceRate >= 90 ? "text-green-600" : "text-amber-600"}`}
                      >
                        {r.presenceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Workforce preview */}
        {activeReport === "workforce" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Total Assigned Staff",
                  value: String(
                    new Set(workforcePreview.map((r) => r.headcount)).size
                      ? workforcePreview.reduce((s, r) => s + r.headcount, 0)
                      : 0,
                  ),
                },
                {
                  label: "Over-Allocated Employees",
                  value: String(
                    workforcePreview.reduce((s, r) => s + r.overAllocated, 0),
                  ),
                },
                {
                  label: "Active Projects",
                  value: String(workforcePreview.length),
                },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">
                    Project
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Personnel
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Avg Allocation
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Over-Allocated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {workforcePreview.map((r) => (
                  <tr key={r.project}>
                    <td className="py-2.5 font-medium text-gray-800">
                      {r.project}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {r.headcount}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {r.avgAlloc}%
                    </td>
                    <td className="py-2.5 text-right">
                      {r.overAllocated > 0 ? (
                        <span className="text-red-600 font-medium">
                          {r.overAllocated}
                        </span>
                      ) : (
                        <span className="text-green-500">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payroll preview */}
        {activeReport === "payroll" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Total Gross Payroll",
                  value: fmt(
                    payrollPreview.reduce((s, r) => s + r.grossTotal, 0),
                  ),
                },
                {
                  label: "Total Deductions",
                  value: fmt(
                    payrollPreview.reduce(
                      (s, r) => s + r.grossTotal - r.netTotal,
                      0,
                    ),
                  ),
                },
                {
                  label: "Total Net Disbursed",
                  value: fmt(
                    payrollPreview.reduce((s, r) => s + r.netTotal, 0),
                  ),
                },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">
                    Department
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Employees
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Gross Pay
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">
                    Net Pay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payrollPreview.map((r) => (
                  <tr key={r.dept}>
                    <td className="py-2.5 font-medium text-gray-800">
                      {r.dept}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {r.employees}
                    </td>
                    <td className="py-2.5 text-right text-gray-600">
                      {fmt(r.grossTotal)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-green-700">
                      {fmt(r.netTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
