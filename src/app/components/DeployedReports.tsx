import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Play, Download, Filter as FilterIcon } from "lucide-react";
import {
  getDeployedReportTemplates,
  runReport,
  type DeployedReportTemplate,
  type ReportRunResult,
} from "../api/admin-extras";
import { exportCSV, type CsvCell } from "../utils/exportCSV";

/**
 * A date range applied on top of a template's own filters. Each app's Reports
 * page already has period controls, so the range is passed in rather than
 * duplicated here.
 */
export interface ReportDateRange {
  /** Field key to filter on. Skipped when the template's source has no such field. */
  field?: string;
  from?: string;
  to?: string;
}

/**
 * The reports an application offers, driven by what has been deployed from
 * Report Builder.
 *
 * Each app's Reports module had only its own hardcoded reports, so a template
 * built and deployed in Report Builder appeared nowhere and could not be run.
 * This lists the deployed templates for one app and runs them through the same
 * `/reports/run` endpoint the builder's preview uses, so what an admin saw when
 * building is what users get here.
 *
 * Deliberately additive: it renders alongside whatever the page already shows,
 * because those built-in reports carry behaviour (charts, drill-downs) that a
 * generic template runner does not replace.
 */
export function DeployedReports({
  app,
  dateRange,
  accent = "indigo",
}: {
  /** Which application's deployed templates to list. */
  app: string;
  /** Optional range from the page's own period controls. */
  dateRange?: ReportDateRange;
  accent?: "indigo" | "emerald" | "blue" | "teal" | "purple" | "orange";
}) {
  const ACCENTS = {
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    blue: "bg-blue-700 hover:bg-blue-800",
    teal: "bg-teal-700 hover:bg-teal-800",
    purple: "bg-purple-700 hover:bg-purple-800",
    orange: "bg-orange-600 hover:bg-orange-700",
  } as const;

  const [templates, setTemplates] = useState<DeployedReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [result, setResult] = useState<ReportRunResult | null>(null);
  const [ranTemplate, setRanTemplate] = useState<DeployedReportTemplate | null>(
    null,
  );
  // Reporting period. The `dateRange` prop existed but no page ever passed
  // one and there was no control anywhere, so every report always ran over
  // all time. Defaults to all time; the last six months are offered, which is
  // the range the HR module asked for.
  const [period, setPeriod] = useState("");

  useEffect(() => {
    let alive = true;
    getDeployedReportTemplates(app)
      .then((rows) => {
        if (alive) setTemplates(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (alive) setTemplates([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [app]);

  /** The last six months, newest first, as {value: "YYYY-MM", label}. */
  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        value,
        label: d.toLocaleString(undefined, { month: "long", year: "numeric" }),
      };
    });
  }, []);

  /**
   * The range to apply: the page's prop when given, otherwise the selected
   * month. The field is detected per template, since each one selects its own.
   */
  function rangeFor(tpl: DeployedReportTemplate): ReportDateRange | undefined {
    if (dateRange?.field) return dateRange;
    if (!period) return undefined;
    const field = (tpl.selectedFields ?? [])
      .map((f) => f.key)
      .find((k) => /date|_at$|createdAt|updatedAt/i.test(k));
    if (!field) return undefined;
    const [y, m] = period.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return {
      field,
      from: `${period}-01`,
      to: `${period}-${String(last).padStart(2, "0")}`,
    };
  }

  /** The template's own filters plus the page's date range, when one applies. */
  const filtersFor = (tpl: DeployedReportTemplate) => {
    {
      const own = (tpl.filters ?? []).filter((f) => f.field);
      const dateRange = rangeFor(tpl);
      if (!dateRange?.field || (!dateRange.from && !dateRange.to)) return own;

      // Only applied when the template actually selected that field — otherwise
      // the clause would be dropped server-side and the range would look applied
      // while doing nothing.
      const selected = new Set((tpl.selectedFields ?? []).map((f) => f.key));
      if (!selected.has(dateRange.field)) return own;

      if (dateRange.from && dateRange.to) {
        return [
          ...own,
          {
            field: dateRange.field,
            operator: "between",
            value: dateRange.from,
            valueTo: dateRange.to,
          },
        ];
      }
      return [
        ...own,
        {
          field: dateRange.field,
          operator: dateRange.from ? "greater_than" : "less_than",
          value: dateRange.from || dateRange.to || "",
        },
      ];
    }
  };

  async function generate(tpl: DeployedReportTemplate) {
    if (runningId) return;
    setRunningId(tpl.id);
    try {
      const sources = String(tpl.dataSource ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await runReport({
        sources,
        source: sources[0],
        fields: (tpl.selectedFields ?? []).map((f) => f.key),
        filters: filtersFor(tpl),
        sort: tpl.sortRules ?? [],
        limit: tpl.rowLimit || 100,
      });
      setResult(data);
      setRanTemplate(tpl);
      toast.success(`${tpl.name} generated — ${data.total} record(s).`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Could not generate ${tpl.name}.`,
      );
    } finally {
      setRunningId(null);
    }
  }

  function exportResult() {
    if (!result || !ranTemplate) return;
    // Column labels as headers, raw values as cells, so the export stays
    // sortable and summable in a spreadsheet.
    exportCSV(
      ranTemplate.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
      result.columns.map((c) => c.label),
      result.rows.map((row) =>
        result.columns.map((c) => (row[c.key] ?? "") as CsvCell),
      ),
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-400">
        Loading deployed reports…
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
        <FileText className="w-7 h-7 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          No report templates have been deployed for this application yet.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Build one in Admin → Report Builder and deploy it to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Deployed Reports
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Built and deployed from Report Builder. Generating one runs its
            saved configuration against the current filters.
          </p>
        </div>
        {!dateRange?.field && (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Period
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">All time</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col"
          >
            <div className="flex items-start gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {tpl.name}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {tpl.description || "No description"}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              {(tpl.selectedFields ?? []).length} field(s)
              {(tpl.filters ?? []).filter((f) => f.field).length > 0 && (
                <>
                  {" · "}
                  <FilterIcon className="w-3 h-3 inline -mt-0.5" />{" "}
                  {(tpl.filters ?? []).filter((f) => f.field).length} filter(s)
                </>
              )}
            </p>
            <button
              onClick={() => generate(tpl)}
              disabled={runningId === tpl.id}
              className={`mt-auto flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed ${ACCENTS[accent]}`}
            >
              <Play className="w-3.5 h-3.5" />
              {runningId === tpl.id ? "Generating…" : "Generate Report"}
            </button>
          </div>
        ))}
      </div>

      {result && ranTemplate && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {ranTemplate.name}
              </p>
              <p className="text-xs text-gray-500">
                {result.rowCount} of {result.total} record(s)
                {result.truncated && " — truncated"}
              </p>
            </div>
            <button
              onClick={exportResult}
              className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          {/* Scrolls rather than clipping: a template can select more columns
              than fit, and the trailing ones must stay reachable. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  {result.columns.map((c) => (
                    <th
                      key={c.key}
                      className="px-4 py-2.5 text-left font-medium whitespace-nowrap"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={result.columns.length || 1}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No records matched this report's filters.
                    </td>
                  </tr>
                )}
                {result.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {result.columns.map((c) => (
                      <td key={c.key} className="px-4 py-2.5 text-gray-700">
                        {row[c.key] === null || row[c.key] === undefined
                          ? "—"
                          : String(row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
