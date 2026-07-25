import { useState } from "react";
import {
  FileText, Download, Clock, DollarSign, Users, Calendar,
  CheckCircle, Filter, BarChart2, TrendingUp, ChevronRight,
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
    description: "Monthly attendance summary per employee and department. Includes presence rate, late arrivals, absences, and total hours worked.",
    icon: <Clock className="w-6 h-6" />,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    lastGenerated: "Apr 25, 2025 – 09:30 AM",
    formats: ["PDF", "CSV", "XLSX"],
  },
  {
    type: "workforce",
    title: "Workforce Utilization Report",
    description: "Personnel allocation across all active projects. Highlights over-allocated staff, idle capacity, and department workload distribution.",
    icon: <Users className="w-6 h-6" />,
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    lastGenerated: "Apr 20, 2025 – 02:15 PM",
    formats: ["PDF", "XLSX"],
  },
  {
    type: "payroll",
    title: "Payroll Summary Report",
    description: "End-of-month payroll breakdown by employee, department, and grade level. Includes gross pay, deductions, and net disbursement totals.",
    icon: <DollarSign className="w-6 h-6" />,
    color: "text-green-700",
    bgColor: "bg-green-100",
    lastGenerated: "Apr 30, 2025 – 11:00 AM",
    formats: ["PDF", "CSV", "XLSX"],
  },
];

const attendancePreview = [
  { dept: "Engineering", employees: 8, present: 178, absent: 12, late: 22, avgHrs: 8.9, presenceRate: 91.8 },
  { dept: "Operations", employees: 2, present: 40, absent: 2, late: 4, avgHrs: 9.8, presenceRate: 95.2 },
  { dept: "Finance", employees: 2, present: 36, absent: 4, late: 6, avgHrs: 8.6, presenceRate: 85.0 },
  { dept: "Procurement", employees: 1, present: 20, absent: 1, late: 2, avgHrs: 9.1, presenceRate: 92.3 },
  { dept: "Human Resources", employees: 1, present: 21, absent: 0, late: 1, avgHrs: 9.0, presenceRate: 97.6 },
  { dept: "Health & Safety", employees: 1, present: 18, absent: 2, late: 2, avgHrs: 7.8, presenceRate: 85.7 },
];

const workforcePreview = [
  { project: "Downtown Office Complex", headcount: 4, avgAlloc: 47, overAllocated: 1 },
  { project: "Highway Interchange", headcount: 5, avgAlloc: 33, overAllocated: 2 },
  { project: "Industrial Warehouse", headcount: 3, avgAlloc: 22, overAllocated: 0 },
  { project: "Riverside Residential", headcount: 4, avgAlloc: 34, overAllocated: 0 },
  { project: "University Science Block", headcount: 3, avgAlloc: 60, overAllocated: 0 },
];

const payrollPreview = [
  { dept: "Engineering", employees: 8, grossTotal: 10240000, netTotal: 8700000 },
  { dept: "Operations", employees: 2, grossTotal: 3960000, netTotal: 3360000 },
  { dept: "Finance", employees: 2, grossTotal: 1820000, netTotal: 1544000 },
  { dept: "Procurement", employees: 1, grossTotal: 1000000, netTotal: 850000 },
  { dept: "Human Resources", employees: 1, grossTotal: 790000, netTotal: 671000 },
  { dept: "Health & Safety", employees: 1, grossTotal: 805000, netTotal: 683000 },
  { dept: "Administration", employees: 1, grossTotal: 565000, netTotal: 480000 },
  { dept: "IT & Systems", employees: 1, grossTotal: 823000, netTotal: 699000 },
];

const fmt = (n: number) => `₦${(n / 1000000).toFixed(1)}M`;

export function HRReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("attendance");
  const [period, setPeriod] = useState("April 2025");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<ReportType | null>(null);

  const periods = ["January 2025", "February 2025", "March 2025", "April 2025"];

  function generate(type: ReportType) {
    setGenerating(true);
    setActiveReport(type);
    setTimeout(() => { setGenerating(false); setGenerated(type); }, 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HR Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate, preview, and export HR analytical reports</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
          {periods.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.type}
            className={`bg-white rounded-lg border-2 p-5 cursor-pointer transition-all hover:shadow-sm ${activeReport === r.type ? "border-indigo-400 shadow-sm" : "border-gray-200"}`}
            onClick={() => setActiveReport(r.type)}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.bgColor} ${r.color}`}>
                {r.icon}
              </div>
              {generated === r.type && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{r.description}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Last: {r.lastGenerated}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {r.formats.map(f => (
                <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{f}</span>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={e => { e.stopPropagation(); generate(r.type); }}
                disabled={generating && activeReport === r.type}
                className="flex-1 py-1.5 bg-indigo-700 text-white rounded text-xs font-medium hover:bg-indigo-800 disabled:opacity-60">
                {generating && activeReport === r.type ? "Generating..." : "Generate Report"}
              </button>
              <button className="p-1.5 border border-gray-300 rounded hover:bg-gray-50" onClick={e => e.stopPropagation()}>
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
              {activeReport === "attendance" ? "Attendance Report" : activeReport === "workforce" ? "Workforce Utilization Report" : "Payroll Summary Report"} · {period}
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
                { label: "Total Work Days", value: "22" },
                { label: "Avg Presence Rate", value: "91.2%" },
                { label: "Total Absence Events", value: "21" },
                { label: "Total Late Events", value: "37" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Department</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Employees</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Present Sessions</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Absent</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Late</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Avg Hrs</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Presence Rate</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {attendancePreview.map(r => (
                  <tr key={r.dept}>
                    <td className="py-2.5 font-medium text-gray-800">{r.dept}</td>
                    <td className="py-2.5 text-right text-gray-500">{r.employees}</td>
                    <td className="py-2.5 text-right text-gray-500">{r.present}</td>
                    <td className="py-2.5 text-right text-red-500">{r.absent}</td>
                    <td className="py-2.5 text-right text-amber-600">{r.late}</td>
                    <td className="py-2.5 text-right text-gray-500">{r.avgHrs}h</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-medium ${r.presenceRate >= 90 ? "text-green-600" : "text-amber-600"}`}>{r.presenceRate}%</span>
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
                { label: "Total Assigned Staff", value: "8" },
                { label: "Over-Allocated Employees", value: "2" },
                { label: "Active Projects", value: "5" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Project</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Personnel</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Avg Allocation</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Over-Allocated</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {workforcePreview.map(r => (
                  <tr key={r.project}>
                    <td className="py-2.5 font-medium text-gray-800">{r.project}</td>
                    <td className="py-2.5 text-right text-gray-500">{r.headcount}</td>
                    <td className="py-2.5 text-right text-gray-500">{r.avgAlloc}%</td>
                    <td className="py-2.5 text-right">
                      {r.overAllocated > 0 ? <span className="text-red-600 font-medium">{r.overAllocated}</span> : <span className="text-green-500">None</span>}
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
                { label: "Total Gross Payroll", value: "₦19.2M" },
                { label: "Total Deductions", value: "₦2.88M" },
                { label: "Total Net Disbursed", value: "₦16.3M" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Department</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Employees</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Gross Pay</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Net Pay</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {payrollPreview.map(r => (
                  <tr key={r.dept}>
                    <td className="py-2.5 font-medium text-gray-800">{r.dept}</td>
                    <td className="py-2.5 text-right text-gray-500">{r.employees}</td>
                    <td className="py-2.5 text-right text-gray-600">{fmt(r.grossTotal)}</td>
                    <td className="py-2.5 text-right font-semibold text-green-700">{fmt(r.netTotal)}</td>
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
