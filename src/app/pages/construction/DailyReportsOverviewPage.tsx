import { useNavigate } from "react-router";
import {
  FileText,
  Sun,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Eye,
  ChevronRight,
  ArrowUpDown,
  Search,
  Download,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import {
  projects,
  dailyReports as mockDailyReports,
  fmtDate,
} from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listDailyReports } from "../../api/daily-reports";

const WEATHER_ICON: Record<string, typeof Sun> = {
  Sunny: Sun,
  Cloudy: Cloud,
  Drizzle: CloudDrizzle,
  Rainy: CloudRain,
};
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#F1F5F9", text: "#475569" },
  submitted: { bg: "#E8F8EF", text: "#1B7A43" },
};

export function DailyReportsOverviewPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dailyReports, setDailyReports] = useState(mockDailyReports);
  useEffect(() => {
    let active = true;
    listDailyReports()
      .then((data) => {
        if (active && data.length > 0) setDailyReports(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleSort(field: string) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const thisWeek = dailyReports.filter(
    (r) => new Date(r.reportDate) >= weekAgo,
  );

  const stats = [
    { icon: FileText, label: "Total Reports", value: dailyReports.length },
    {
      icon: FileText,
      label: "Drafts",
      value: dailyReports.filter((r) => r.status === "draft").length,
      color: "#F4A623",
    },
    {
      icon: FileText,
      label: "Submitted",
      value: dailyReports.filter((r) => r.status === "submitted").length,
      color: "#27AE60",
    },
    {
      icon: Eye,
      label: "Reports this week",
      value: thisWeek.length,
      color: "#E8973A",
    },
  ];

  const sorted = useMemo(() => {
    let list = [...dailyReports];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.submittedBy.toLowerCase().includes(q) ||
          projects
            .find((p) => p.id === r.projectId)
            ?.name.toLowerCase()
            .includes(q) ||
          r.weather.toLowerCase().includes(q),
      );
    }
    if (sortField) {
      list.sort((a, b) => {
        let va: string | number, vb: string | number;
        if (sortField === "project") {
          va = projects.find((p) => p.id === a.projectId)?.name ?? a.projectId;
          vb = projects.find((p) => p.id === b.projectId)?.name ?? b.projectId;
        } else {
          va = (a as any)[sortField] ?? "";
          vb = (b as any)[sortField] ?? "";
        }
        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    } else {
      list.sort(
        (a, b) =>
          new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
      );
    }
    return list;
  }, [search, sortField, sortDir]);

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
          Daily Reports Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          Daily reports across all projects
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-lg p-4 flex items-center gap-3"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: s.color ?? "#718096" }}
              />
              <div>
                <p className="text-xl font-bold" style={{ color: "#1A202C" }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: "#718096" }}>
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="bg-white rounded-lg overflow-hidden"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center gap-3 p-4 pb-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#718096" }}
            />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = sorted.map((r) => {
                const proj = projects.find((p) => p.id === r.projectId);
                return [
                  proj?.name ?? r.projectId,
                  fmtDate(r.reportDate),
                  r.weather,
                  r.submittedBy,
                  r.status,
                ];
              });
              exportCSV(
                "daily-reports",
                ["Project", "Date", "Weather", "Submitted By", "Status"],
                rows,
              );
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: "#F7F8FA",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                {[
                  { key: "project", label: "Project" },
                  { key: "reportDate", label: "Date" },
                  { key: "weather", label: "Weather" },
                  { key: "submittedBy", label: "Submitted By" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 transition-colors"
                    style={{ color: "#718096" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    </span>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const WeatherIcon = WEATHER_ICON[r.weather] ?? Sun;
                const project = projects.find((p) => p.id === r.projectId);
                const st = STATUS_STYLES[r.status] ?? {
                  bg: "#F1F5F9",
                  text: "#475569",
                };
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < sorted.length - 1 ? "1px solid #E2E8F0" : "none",
                    }}
                    onClick={() =>
                      navigate(
                        `/apps/construction/projects/${r.projectId}/daily-reports`,
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "#1A202C" }}>
                        {project?.name ?? r.projectId}
                      </p>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#1A202C" }}>
                      {fmtDate(r.reportDate)}
                    </td>
                    <td className="px-4 py-3">
                      <WeatherIcon
                        className="w-4 h-4"
                        style={{ color: "#718096" }}
                      />
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {r.submittedBy}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: st.bg, color: st.text }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight
                        className="w-4 h-4"
                        style={{ color: "#718096" }}
                      />
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-sm"
                    style={{ color: "#718096" }}
                  >
                    No daily reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
