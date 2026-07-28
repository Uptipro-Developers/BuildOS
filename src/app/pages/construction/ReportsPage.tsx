import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  PieChart,
  CheckCircle,
  ChevronRight,
  Eye,
  Users,
} from "lucide-react";
import { projects as mockProjects, fmtCurrency } from "./mockData";
import { fetchConstructionProjects } from "../../api/projects";

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  type: string;
}

interface PreviewData {
  labels: string[];
  datasets: { label: string; values: number[]; color: string }[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: "portfolio",
    title: "Portfolio Summary",
    description:
      "Aggregate budget, spend, and progress across all projects.",
    icon: <PieChart className="w-5 h-5" />,
    color: "text-blue-600 bg-blue-50",
    type: "portfolio",
  },
  {
    id: "rag",
    title: "RAG Status Report",
    description:
      "Project health overview — on-track, at-risk, and delayed projects with key metrics.",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-orange-600 bg-orange-50",
    type: "rag",
  },
  {
    id: "schedule",
    title: "Schedule Report",
    description:
      "Timeline adherence, milestone completion, and schedule variance analysis.",
    icon: <Calendar className="w-5 h-5" />,
    color: "text-purple-600 bg-purple-50",
    type: "schedule",
  },
  {
    id: "cost",
    title: "Cost Report",
    description:
      "Budget utilisation, cost variance, and expenditure forecasting by project.",
    icon: <FileText className="w-5 h-5" />,
    color: "text-green-600 bg-green-50",
    type: "cost",
  },
  {
    id: "resource",
    title: "Resource Report",
    description: "Resource allocation, utilisation, and cost across projects.",
    icon: <Users className="w-5 h-5" />,
    color: "text-teal-600 bg-teal-50",
    type: "resource",
  },
  {
    id: "daily",
    title: "Daily Reports Summary",
    description:
      "Report submission rates, manpower trends, and daily activity metrics.",
    icon: <FileText className="w-5 h-5" />,
    color: "text-indigo-600 bg-indigo-50",
    type: "daily",
  },
];

const RAG_LABELS: Record<string, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  delayed: "Delayed",
};
const RAG_COLORS: Record<string, string> = {
  "on-track": "#27AE60",
  "at-risk": "#F4A623",
  delayed: "#E74C3C",
};

function generatePreview(
  type: string,
  projects: typeof mockProjects,
): PreviewData {
  switch (type) {
    case "portfolio":
      return {
        labels: projects.map((p) => p.name.slice(0, 12)),
        datasets: [
          {
            label: "Budget",
            values: projects.map((p) => p.budget),
            color: "#E8973A",
          },
          {
            label: "Spent",
            values: projects.map((p) => p.spent),
            color: "#3B82F6",
          },
        ],
      };
    case "rag": {
      const counts = { "on-track": 0, "at-risk": 0, delayed: 0 };
      projects.forEach((p) => {
        if (p.status !== "Completed") counts[p.ragStatus]++;
      });
      return {
        labels: ["On Track", "At Risk", "Delayed"],
        datasets: [
          {
            label: "Projects",
            values: [counts["on-track"], counts["at-risk"], counts["delayed"]],
            color: "#E8973A",
          },
        ],
      };
    }
    case "schedule":
      return {
        labels: projects
          .filter((p) => p.status !== "Completed")
          .map((p) => p.name.slice(0, 12)),
        datasets: [
          {
            label: "Progress %",
            values: projects
              .filter((p) => p.status !== "Completed")
              .map((p) => Math.round((p.spent / p.budget) * 100)),
            color: "#E8973A",
          },
        ],
      };
    case "cost":
      return {
        labels: projects.map((p) => p.name.slice(0, 12)),
        datasets: [
          {
            label: "Utilisation %",
            values: projects.map((p) => Math.round((p.spent / p.budget) * 100)),
            color: "#E8973A",
          },
        ],
      };
    case "resource":
      return {
        labels: ["Labour", "Materials", "Equipment", "Subcontractors"],
        datasets: [
          { label: `Cost (${getCurrencySymbol()}M)`, values: [28, 35, 15, 22], color: "#14B8A6" },
        ],
      };
    case "daily":
      return {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          { label: "Reports", values: [12, 15, 10, 18], color: "#6366F1" },
        ],
      };
    default:
      return { labels: [], datasets: [] };
  }
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [generatedIds, setGeneratedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [projects, setProjects] = useState(mockProjects);

  useEffect(() => {
    fetchConstructionProjects()
      .then((data) => {
        if (data.length > 0) setProjects(data as typeof mockProjects);
      })
      .catch(() => {});
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function handleGenerate(id: string) {
    setGeneratedIds((prev) => new Set(prev).add(id));
    setTimeout(() => showToast("Report generated"), 1000);
  }

  const previewData = previewId ? generatePreview(previewId, projects) : null;

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-5"
    >
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
            Reports
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#718096" }}>
            Construction analytics and report templates
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "#718096" }}
        >
          <span>
            Total Portfolio:{" "}
            <strong style={{ color: "#1A202C" }}>
              {fmtCurrency(totalBudget)}
            </strong>
          </span>
        </div>
      </div>

      {/* Portfolio summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Projects",
            value: projects.length,
            sub: `${projects.filter((p) => p.status === "Active").length} active`,
          },
          { label: "Total Budget", value: fmtCurrency(totalBudget) },
          {
            label: "Total Spent",
            value: fmtCurrency(totalSpent),
            color: "#3B82F6",
          },
          {
            label: "Avg Utilisation",
            value: `${Math.round((totalSpent / totalBudget) * 100)}%`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4"
            style={{ border: "1px solid #E2E8F0" }}
          >
            <p className="text-xs" style={{ color: "#718096" }}>
              {s.label}
            </p>
            <p
              className="text-xl font-bold"
              style={{ color: s.color || "#1A202C" }}
            >
              {s.value}
            </p>
            {s.sub && (
              <p className="text-xs" style={{ color: "#A0AEC0" }}>
                {s.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-2 gap-4">
        {reportTemplates.map((r) => {
          const isGenerated = generatedIds.has(r.id);
          const isPreview = previewId === r.id;
          return (
            <div
              key={r.id}
              className="bg-white rounded-xl p-5 transition-all"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <div className="flex items-start gap-4 mb-4">
                <span className={`p-2.5 rounded-xl ${r.color}`}>{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "#1A202C" }}
                  >
                    {r.title}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "#A0AEC0" }}>
                    {r.description}
                  </p>
                </div>
                {isGenerated && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              {/* Mini preview chart */}
              {isPreview && previewData && (
                <div
                  className="mb-4 p-3 rounded-lg"
                  style={{ backgroundColor: "#F7F8FA" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-3 h-3" style={{ color: "#A0AEC0" }} />
                    <span
                      className="text-xs font-medium"
                      style={{ color: "#718096" }}
                    >
                      Preview
                    </span>
                  </div>
                  <div className="flex items-end gap-1 h-24">
                    {previewData.labels.slice(0, 7).map((label, i) => {
                      const maxVal = Math.max(
                        ...previewData.datasets.flatMap((d) => d.values),
                        1,
                      );
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                        >
                          {previewData.datasets.map((ds, di) => {
                            const v = ds.values[i] ?? 0;
                            const h = Math.max((v / maxVal) * 100, 3);
                            return (
                              <div
                                key={di}
                                className="w-full rounded-t-sm"
                                style={{
                                  height: `${h}%`,
                                  backgroundColor: ds.color,
                                  opacity: 1 - di * 0.2,
                                }}
                              />
                            );
                          })}
                          <span
                            className="text-[8px] truncate w-full text-center"
                            style={{ color: "#A0AEC0" }}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleGenerate(r.id);
                    setPreviewId(isPreview ? null : r.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    isGenerated ? "bg-green-600 hover:bg-green-700" : ""
                  }`}
                  style={isGenerated ? {} : { backgroundColor: "#E8973A" }}
                >
                  {isGenerated ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Generated
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-3.5 h-3.5" /> Generate
                    </>
                  )}
                </button>
                <button
                  onClick={() => showToast(`Exporting "${r.title}" as PDF`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
                  style={{ border: "1px solid #E2E8F0", color: "#718096" }}
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RAG Health Breakdown */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: "#E2E8F0" }}
        >
          <BarChart3 className="w-4 h-4" style={{ color: "#E8973A" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#1A202C" }}>
            RAG Health Breakdown
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(["on-track", "at-risk", "delayed"] as const).map((r) => {
              const count = projects.filter(
                (p) => p.ragStatus === r && p.status === "Active",
              ).length;
              const pct = Math.round(
                (count /
                  Math.max(
                    projects.filter((p) => p.status === "Active").length,
                    1,
                  )) *
                  100,
              );
              return (
                <div
                  key={r}
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: `${RAG_COLORS[r]}15` }}
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: RAG_COLORS[r] }}
                  >
                    {count}
                  </p>
                  <p
                    className="text-xs font-medium mt-1"
                    style={{ color: RAG_COLORS[r] }}
                  >
                    {RAG_LABELS[r]} — {pct}%
                  </p>
                </div>
              );
            })}
          </div>
          <div className="flex rounded-full h-3 overflow-hidden">
            {(["on-track", "at-risk", "delayed"] as const).map((r) => {
              const count = projects.filter(
                (p) => p.ragStatus === r && p.status === "Active",
              ).length;
              const pct =
                (count /
                  Math.max(
                    projects.filter((p) => p.status === "Active").length,
                    1,
                  )) *
                100;
              if (pct === 0) return null;
              return (
                <div
                  key={r}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: RAG_COLORS[r],
                    minWidth: 4,
                  }}
                  title={`${RAG_LABELS[r]}: ${count}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Project summary table */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "#1A202C" }}>
            Project Summary
          </h3>
          <button
            onClick={() => showToast("Exporting project summary table")}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#E8973A" }}
          >
            <Download className="w-3.5 h-3.5" /> Export Table
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
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#718096" }}
                >
                  Project
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#718096" }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#718096" }}
                >
                  Budget
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#718096" }}
                >
                  Spent
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#718096" }}
                >
                  Utilisation
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#718096" }}
                >
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E2E8F0" }}>
              {projects.map((p) => {
                const pct = Math.round((p.spent / p.budget) * 100);
                const statusBadge =
                  p.status === "Active"
                    ? { bg: "#E8F8EF", text: "#1B7A43" }
                    : p.status === "On Hold"
                      ? { bg: "#FEF6E6", text: "#B0780F" }
                      : p.status === "Completed"
                        ? { bg: "#F1F5F9", text: "#475569" }
                        : { bg: "#FDE8E6", text: "#B33A2E" };
                const ragColor = {
                  "on-track": "#27AE60",
                  "at-risk": "#F4A623",
                  delayed: "#E74C3C",
                }[p.ragStatus];
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50"
                    style={{ borderBottom: "1px solid #E2E8F0" }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#1A202C" }}
                    >
                      {p.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ragColor }}
                        />
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.text,
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: "#1A202C" }}
                    >
                      {fmtCurrency(p.budget)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ color: "#718096" }}
                    >
                      {fmtCurrency(p.spent)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="w-16 rounded-full h-1.5"
                          style={{ backgroundColor: "#E2E8F0" }}
                        >
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct > 90
                                  ? "#E74C3C"
                                  : pct > 75
                                    ? "#F4A623"
                                    : "#27AE60",
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: "#718096" }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          navigate(
                            `/apps/construction/projects/${p.id}/overview`,
                          )
                        }
                        className="text-xs font-medium"
                        style={{ color: "#E8973A" }}
                      >
                        View <ChevronRight className="w-3 h-3 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "#FEF6E6", border: "1px solid #F4A623" }}
      >
        <p className="text-sm" style={{ color: "#B0780F" }}>
          <strong>Need more detailed reports?</strong> Use the Admin → Report
          Builder to create custom report templates with specific metrics and
          filters.
        </p>
      </div>
    </div>
  );
}
