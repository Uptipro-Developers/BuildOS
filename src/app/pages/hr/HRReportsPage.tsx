import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Printer,
  Sheet,
  Users,
} from "lucide-react";
import { DeployedReports } from "../../components/DeployedReports";
import {
  getAttendance,
  getPayrollRuns,
  type AttendanceRecord,
  type PayrollEntry,
  type PayrollRun,
} from "../../api/hr-extras";
import {
  getWorkforceAllocations,
  type WorkforceAllocation,
} from "../../api/workforce-allocation";
import { exportCSV, type CsvCell } from "../../utils/exportCSV";
import {
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";
import {
  documentFooter,
  documentHeader,
  escapeHtml,
  printDocument,
} from "../../utils/printDocument";

/**
 * HR Reports.
 *
 * The module offers the three analytical reports the HR design specifies —
 * Attendance, Workforce Utilization and Payroll Summary — plus whatever has
 * been deployed from Admin → Report Builder.
 *
 * The three built-in reports previously sat here as static cards over
 * hardcoded department tables and fabricated "Last generated" timestamps, so
 * they were removed wholesale. Removing them left HR as the only module whose
 * Reports page had no reports of its own: Finance, Procurement, Construction
 * and Storefront all kept theirs and wired them to live endpoints. They are
 * restored here on the same footing — every figure below is aggregated from
 * `/attendance`, `/workforce-allocation` and `/payroll-runs`, and the period
 * selector actually scopes them.
 *
 * One detail deliberately departs from the mockup, because matching it would
 * mean showing something untrue: "Last generated" is blank until the report is
 * actually run in this session, rather than carrying a fixed date. All three
 * export formats the design lists are real — CSV, PDF via the print pipeline,
 * and XLSX through the `xlsx` package the schedule importer already ships.
 */

type ReportType = "attendance" | "workforce" | "payroll";

interface AttendanceRow {
  dept: string;
  employees: number;
  present: number;
  absent: number;
  late: number;
  avgHrs: number;
  presenceRate: number;
}

interface WorkforceRow {
  project: string;
  headcount: number;
  avgAlloc: number;
  overAllocated: number;
}

interface PayrollRow {
  dept: string;
  employees: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

const REPORTS: {
  type: ReportType;
  title: string;
  description: string;
  icon: typeof Clock;
  color: string;
  bgColor: string;
  formats: string[];
}[] = [
  {
    type: "attendance",
    title: "Attendance Report",
    description:
      "Monthly attendance summary per department. Includes presence rate, late arrivals, absences, and average hours worked.",
    icon: Clock,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    formats: ["PDF", "CSV", "XLSX"],
  },
  {
    type: "workforce",
    title: "Workforce Utilization Report",
    description:
      "Personnel allocation across active projects. Highlights over-allocated staff and project workload distribution.",
    icon: Users,
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    formats: ["PDF", "CSV", "XLSX"],
  },
  {
    type: "payroll",
    title: "Payroll Summary Report",
    description:
      "Payroll breakdown by department for the selected period. Includes gross pay, deductions, and net disbursement.",
    icon: DollarSign,
    color: "text-green-700",
    bgColor: "bg-green-100",
    formats: ["PDF", "CSV", "XLSX"],
  },
];

const TITLES: Record<ReportType, string> = {
  attendance: "Attendance Report",
  workforce: "Workforce Utilization Report",
  payroll: "Payroll Summary Report",
};

/** A whole-number percentage, guarding the divide-by-zero of an empty group. */
function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

const money = (n: number) => formatCurrencyByGeneralSettings(n);

export function HRReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("attendance");
  // "YYYY-MM". Defaults to the current month rather than a fixed date, so the
  // page opens on a period that can actually contain data.
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allocations, setAllocations] = useState<WorkforceAllocation[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [generatedAt, setGeneratedAt] = useState<
    Partial<Record<ReportType, string>>
  >({});

  /** The last twelve months, newest first. */
  const periods = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString(undefined, { month: "long", year: "numeric" }),
      };
    });
  }, []);

  const periodLabel =
    periods.find((p) => p.value === period)?.label ?? period;

  const load = useCallback(async (type: ReportType) => {
    if (type === "attendance") {
      const rows = await getAttendance();
      setAttendance(Array.isArray(rows) ? rows : []);
      return;
    }
    if (type === "workforce") {
      const rows = await getWorkforceAllocations();
      setAllocations(Array.isArray(rows) ? rows : []);
      return;
    }
    const rows = await getPayrollRuns();
    setRuns(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => {
    let alive = true;
    // Each source is loaded independently: one failing endpoint must not blank
    // the other two reports.
    (["attendance", "workforce", "payroll"] as ReportType[]).forEach((type) => {
      load(type).catch(() => {
        if (!alive) return;
        if (type === "attendance") setAttendance([]);
        else if (type === "workforce") setAllocations([]);
        else setRuns([]);
      });
    });
    return () => {
      alive = false;
    };
  }, [load]);

  async function generate(type: ReportType) {
    if (generating) return;
    setActiveReport(type);
    setGenerating(type);
    try {
      await load(type);
      setGeneratedAt((prev) => ({
        ...prev,
        [type]: new Date().toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }));
      toast.success(`${TITLES[type]} generated for ${periodLabel}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Could not generate ${TITLES[type]}.`,
      );
    } finally {
      setGenerating(null);
    }
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  const attendanceRows = useMemo<AttendanceRow[]>(() => {
    const inPeriod = attendance.filter((r) =>
      String(r.date ?? "").startsWith(period),
    );
    const groups = new Map<
      string,
      {
        employees: Set<string>;
        present: number;
        absent: number;
        late: number;
        hours: number;
        hourRecords: number;
      }
    >();

    inPeriod.forEach((r) => {
      const dept = r.department || "Unassigned";
      const g = groups.get(dept) ?? {
        employees: new Set<string>(),
        present: 0,
        absent: 0,
        late: 0,
        hours: 0,
        hourRecords: 0,
      };
      g.employees.add(r.employeeId || r.employeeName);
      if (r.status === "present") g.present += 1;
      else if (r.status === "late") g.late += 1;
      else if (r.status === "absent") g.absent += 1;
      // "leave" is authorised time off: it is neither attendance nor absence,
      // so it is excluded from both counts and from the presence rate.
      if (typeof r.hoursWorked === "number" && r.hoursWorked > 0) {
        g.hours += r.hoursWorked;
        g.hourRecords += 1;
      }
      groups.set(dept, g);
    });

    return Array.from(groups.entries())
      .map(([dept, g]) => {
        // A late arrival is still an attendance, so it counts towards presence.
        const attended = g.present + g.late;
        return {
          dept,
          employees: g.employees.size,
          present: attended,
          absent: g.absent,
          late: g.late,
          avgHrs:
            g.hourRecords > 0
              ? Math.round((g.hours / g.hourRecords) * 10) / 10
              : 0,
          presenceRate: pct(attended, attended + g.absent),
        };
      })
      .sort((a, b) => a.dept.localeCompare(b.dept));
  }, [attendance, period]);

  const attendanceStats = useMemo(() => {
    const inPeriod = attendance.filter((r) =>
      String(r.date ?? "").startsWith(period),
    );
    const workDays = new Set(inPeriod.map((r) => String(r.date ?? "").slice(0, 10)));
    const attended = attendanceRows.reduce((s, r) => s + r.present, 0);
    const absent = attendanceRows.reduce((s, r) => s + r.absent, 0);
    return [
      { label: "Total Work Days", value: String(workDays.size) },
      {
        label: "Avg Presence Rate",
        value: `${pct(attended, attended + absent)}%`,
      },
      { label: "Total Absence Events", value: String(absent) },
      {
        label: "Total Late Events",
        value: String(attendanceRows.reduce((s, r) => s + r.late, 0)),
      },
    ];
  }, [attendance, attendanceRows, period]);

  // ── Workforce utilization ──────────────────────────────────────────────────

  /**
   * Allocations overlapping the selected month. An allocation with no end date
   * is open-ended and counts from its start onwards.
   */
  const periodAllocations = useMemo(() => {
    const [y, m] = period.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    return allocations.filter((a) => {
      const from = a.startDate ? new Date(a.startDate) : null;
      const to = a.endDate ? new Date(a.endDate) : null;
      if (from && !Number.isNaN(from.getTime()) && from > end) return false;
      if (to && !Number.isNaN(to.getTime()) && to < start) return false;
      return true;
    });
  }, [allocations, period]);

  /**
   * Employees whose allocation across all their projects exceeds 100% — the
   * over-allocation is a property of the person, not of any one project, so it
   * has to be totalled before the per-project grouping.
   */
  const overAllocatedEmployees = useMemo(() => {
    const totals = new Map<string, number>();
    periodAllocations.forEach((a) => {
      const key = a.employeeId || a.employeeName;
      totals.set(key, (totals.get(key) ?? 0) + (Number(a.allocPct) || 0));
    });
    return new Set(
      Array.from(totals.entries())
        .filter(([, total]) => total > 100)
        .map(([key]) => key),
    );
  }, [periodAllocations]);

  const workforceRows = useMemo<WorkforceRow[]>(() => {
    const groups = new Map<
      string,
      { employees: Set<string>; allocSum: number; allocCount: number }
    >();
    periodAllocations.forEach((a) => {
      const project = a.projectName || "Unassigned";
      const g = groups.get(project) ?? {
        employees: new Set<string>(),
        allocSum: 0,
        allocCount: 0,
      };
      g.employees.add(a.employeeId || a.employeeName);
      g.allocSum += Number(a.allocPct) || 0;
      g.allocCount += 1;
      groups.set(project, g);
    });

    return Array.from(groups.entries())
      .map(([project, g]) => ({
        project,
        headcount: g.employees.size,
        avgAlloc:
          g.allocCount > 0 ? Math.round(g.allocSum / g.allocCount) : 0,
        overAllocated: Array.from(g.employees).filter((e) =>
          overAllocatedEmployees.has(e),
        ).length,
      }))
      .sort((a, b) => a.project.localeCompare(b.project));
  }, [periodAllocations, overAllocatedEmployees]);

  const workforceStats = useMemo(() => {
    const staff = new Set(
      periodAllocations.map((a) => a.employeeId || a.employeeName),
    );
    return [
      { label: "Total Assigned Staff", value: String(staff.size) },
      {
        label: "Over-Allocated Employees",
        value: String(overAllocatedEmployees.size),
      },
      { label: "Active Projects", value: String(workforceRows.length) },
    ];
  }, [periodAllocations, overAllocatedEmployees, workforceRows]);

  // ── Payroll summary ────────────────────────────────────────────────────────

  /** Entries of every run booked to the selected month. */
  const periodEntries = useMemo<PayrollEntry[]>(() => {
    const [y, m] = period.split("-").map(Number);
    return runs
      .filter((run) => run.year === y && run.month === m)
      .flatMap((run) => run.entries ?? []);
  }, [runs, period]);

  const payrollRows = useMemo<PayrollRow[]>(() => {
    const groups = new Map<string, PayrollRow>();
    periodEntries.forEach((e) => {
      const dept = e.department || "Unassigned";
      const row = groups.get(dept) ?? {
        dept,
        employees: 0,
        grossPay: 0,
        deductions: 0,
        netPay: 0,
      };
      row.employees += 1;
      row.grossPay += Number(e.grossPay) || 0;
      row.deductions += Number(e.deductions) || 0;
      row.netPay += Number(e.netPay) || 0;
      groups.set(dept, row);
    });
    return Array.from(groups.values()).sort((a, b) =>
      a.dept.localeCompare(b.dept),
    );
  }, [periodEntries]);

  const payrollStats = useMemo(() => {
    const gross = payrollRows.reduce((s, r) => s + r.grossPay, 0);
    const deductions = payrollRows.reduce((s, r) => s + r.deductions, 0);
    const net = payrollRows.reduce((s, r) => s + r.netPay, 0);
    return [
      { label: "Total Gross Payroll", value: money(gross) },
      { label: "Total Deductions", value: money(deductions) },
      { label: "Total Net Disbursed", value: money(net) },
    ];
  }, [payrollRows]);

  // ── Export ─────────────────────────────────────────────────────────────────

  /** Headers and raw (unformatted) cells for the report on screen. */
  function tableFor(type: ReportType): {
    headers: string[];
    rows: CsvCell[][];
    stats: { label: string; value: string }[];
  } {
    if (type === "attendance") {
      return {
        headers: [
          "Department",
          "Employees",
          "Present Sessions",
          "Absent",
          "Late",
          "Avg Hrs",
          "Presence Rate (%)",
        ],
        rows: attendanceRows.map((r) => [
          r.dept,
          r.employees,
          r.present,
          r.absent,
          r.late,
          r.avgHrs,
          r.presenceRate,
        ]),
        stats: attendanceStats,
      };
    }
    if (type === "workforce") {
      return {
        headers: [
          "Project",
          "Personnel",
          "Avg Allocation (%)",
          "Over-Allocated",
        ],
        rows: workforceRows.map((r) => [
          r.project,
          r.headcount,
          r.avgAlloc,
          r.overAllocated,
        ]),
        stats: workforceStats,
      };
    }
    return {
      headers: ["Department", "Employees", "Gross Pay", "Deductions", "Net Pay"],
      rows: payrollRows.map((r) => [
        r.dept,
        r.employees,
        r.grossPay,
        r.deductions,
        r.netPay,
      ]),
      stats: payrollStats,
    };
  }

  function exportCsv() {
    const { headers, rows } = tableFor(activeReport);
    if (rows.length === 0) {
      toast.error(`No data to export for ${periodLabel}.`);
      return;
    }
    // Raw numbers, not display strings, so the export stays summable.
    exportCSV(
      `${activeReport}-report-${period}`,
      headers,
      rows,
    );
  }

  async function exportXlsx() {
    const { headers, rows } = tableFor(activeReport);
    if (rows.length === 0) {
      toast.error(`No data to export for ${periodLabel}.`);
      return;
    }
    try {
      // Imported on demand, as the schedule importer does: the xlsx package is
      // the largest chunk in the bundle and must not load with the page.
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      // Dates would arrive as objects the sheet writer treats as text; the
      // report tables carry only strings and numbers, so they pass straight
      // through and stay summable in Excel.
      const aoa = [headers, ...rows.map((row) => row.map((c) => c ?? ""))];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(aoa),
        TITLES[activeReport].replace(" Report", "").slice(0, 31),
      );
      XLSX.writeFile(wb, `${activeReport}-report-${period}.xlsx`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to build the spreadsheet.",
      );
    }
  }

  function exportPdf() {
    const { headers, rows, stats } = tableFor(activeReport);
    if (rows.length === 0) {
      toast.error(`No data to print for ${periodLabel}.`);
      return;
    }
    // Currency and percentages are formatted for the document; the CSV path
    // above keeps the raw values.
    const format = (value: CsvCell, column: number) => {
      if (activeReport === "payroll" && column >= 2) {
        return money(Number(value) || 0);
      }
      return String(value ?? "");
    };
    const body =
      documentHeader(TITLES[activeReport], periodLabel, [
        ...stats.map(
          (s) => [s.label, s.value] as [string, string],
        ),
      ]) +
      `<div class="doc-section"><table><thead><tr>` +
      headers
        .map(
          (h, i) =>
            `<th${i === 0 ? "" : ' class="num"'}>${escapeHtml(h)}</th>`,
        )
        .join("") +
      `</tr></thead><tbody>` +
      rows
        .map(
          (row) =>
            `<tr>` +
            row
              .map(
                (cell, i) =>
                  `<td${i === 0 ? "" : ' class="num"'}>${escapeHtml(format(cell, i))}</td>`,
              )
              .join("") +
            `</tr>`,
        )
        .join("") +
      `</tbody></table></div>` +
      documentFooter(formatDateByGeneralSettings(new Date()));

    try {
      printDocument(`${TITLES[activeReport]} ${periodLabel}`, body);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to open the report.",
      );
    }
  }

  const { headers, rows, stats } = tableFor(activeReport);
  const statColumns = stats.length === 4 ? "grid-cols-4" : "grid-cols-3";

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
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const busy = generating === r.type;
          return (
            <div
              key={r.type}
              onClick={() => setActiveReport(r.type)}
              className={`bg-white rounded-lg border-2 p-5 cursor-pointer transition-all hover:shadow-sm ${
                activeReport === r.type
                  ? "border-indigo-400 shadow-sm"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.bgColor} ${r.color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                {generatedAt[r.type] && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {r.description}
              </p>
              <p className="text-xs text-gray-400">
                {generatedAt[r.type]
                  ? `Last generated: ${generatedAt[r.type]}`
                  : "Not generated yet"}
              </p>
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
                  disabled={busy}
                  className="flex-1 py-1.5 bg-indigo-700 text-white rounded text-xs font-medium hover:bg-indigo-800 disabled:opacity-60"
                >
                  {busy ? "Generating…" : "Generate Report"}
                </button>
                <button
                  title="Download CSV"
                  className="p-1.5 border border-gray-300 rounded hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReport(r.type);
                    // Read from the freshly selected report rather than
                    // whichever one happened to be active.
                    const { headers: h, rows: rw } = tableFor(r.type);
                    if (rw.length === 0) {
                      toast.error(`No data to export for ${periodLabel}.`);
                      return;
                    }
                    exportCSV(`${r.type}-report-${period}`, h, rw);
                  }}
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview panel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <p className="font-medium text-gray-800 text-sm">
              {TITLES[activeReport]} · {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={exportPdf}
              className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={exportXlsx}
              className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
            >
              <Sheet className="w-3.5 h-3.5" /> XLSX
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className={`grid ${statColumns} gap-4`}>
            {stats.map((s) => (
              <div key={s.label} className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {headers.map((h, i) => (
                    <th
                      key={h}
                      className={`py-2 text-xs font-medium text-gray-500 whitespace-nowrap ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="py-8 text-center text-sm text-gray-400"
                    >
                      No {TITLES[activeReport].toLowerCase()} data recorded for{" "}
                      {periodLabel}.
                    </td>
                  </tr>
                )}
                {activeReport === "attendance" &&
                  attendanceRows.map((r) => (
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
                          className={`font-medium ${
                            r.presenceRate >= 90
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        >
                          {r.presenceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}

                {activeReport === "workforce" &&
                  workforceRows.map((r) => (
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

                {activeReport === "payroll" &&
                  payrollRows.map((r) => (
                    <tr key={r.dept}>
                      <td className="py-2.5 font-medium text-gray-800">
                        {r.dept}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {r.employees}
                      </td>
                      <td className="py-2.5 text-right text-gray-600">
                        {money(r.grossPay)}
                      </td>
                      <td className="py-2.5 text-right text-red-500">
                        -{money(r.deductions)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-green-700">
                        {money(r.netPay)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeployedReports app="hr" accent="purple" />
    </div>
  );
}
