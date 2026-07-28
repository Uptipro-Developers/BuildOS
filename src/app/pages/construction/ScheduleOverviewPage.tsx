import { useNavigate } from "react-router";
import {
  ChevronRight,
  Clock,
  CheckSquare,
  AlertTriangle,
  Search,
  Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  projects as mockProjects,
  tasks,
  ragColor,
  ragLabel,
} from "./mockData";
import { fetchConstructionProjects } from "../../api/projects";
import { exportCSV } from "../../utils/exportCSV";

export function ScheduleOverviewPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState(mockProjects);

  useEffect(() => {
    fetchConstructionProjects()
      .then((data) => {
        if (data.length > 0) setProjects(data as typeof mockProjects);
      })
      .catch(() => {});
  }, []);

  const taskCountsByProject = projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id && t.level === 4);
    const completed = pt.filter((t) => t.percentComplete === 100).length;
    const inProgress = pt.filter(
      (t) => t.percentComplete > 0 && t.percentComplete < 100,
    ).length;
    const delayed = pt.filter((t) => t.ragStatus === "delayed").length;
    return {
      project: p,
      total: pt.length,
      completed,
      inProgress,
      delayed,
      rag: p.ragStatus,
    };
  });

  const filtered = taskCountsByProject.filter(
    (r) =>
      r.project.name.toLowerCase().includes(search.toLowerCase()) ||
      r.project.id.toLowerCase().includes(search.toLowerCase()),
  );

  const totalWp = taskCountsByProject.reduce((s, r) => s + r.total, 0);
  const totalCompleted = taskCountsByProject.reduce(
    (s, r) => s + r.completed,
    0,
  );
  const totalInProgress = taskCountsByProject.reduce(
    (s, r) => s + r.inProgress,
    0,
  );
  const totalDelayed = taskCountsByProject.reduce((s, r) => s + r.delayed, 0);

  const stats = [
    { icon: CheckSquare, label: "Total Work Packages", value: totalWp },
    {
      icon: CheckSquare,
      label: "Completed",
      value: totalCompleted,
      color: "#27AE60",
    },
    {
      icon: Clock,
      label: "In Progress",
      value: totalInProgress,
      color: "#F4A623",
    },
    {
      icon: AlertTriangle,
      label: "Delayed",
      value: totalDelayed,
      color: "#E74C3C",
    },
  ];

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
          Schedule Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          Schedule summary across all projects
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
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = filtered.map((r) => [
                r.project.name,
                String(r.total),
                String(r.completed),
                String(r.inProgress),
                String(r.delayed),
                ragLabel(r.rag),
              ]);
              exportCSV(
                "schedule",
                [
                  "Project",
                  "Tasks",
                  "Completed",
                  "In Progress",
                  "Delayed",
                  "Overall RAG",
                ],
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
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Project
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Tasks
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Completed
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  In Progress
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Delayed
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Overall RAG
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const ragClass = ragColor(r.rag);
                return (
                  <tr
                    key={r.project.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                    }}
                    onClick={() =>
                      navigate(
                        `/apps/construction/projects/${r.project.id}/schedule`,
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "#1A202C" }}>
                        {r.project.name}
                      </p>
                      <p className="text-xs" style={{ color: "#718096" }}>
                        {r.project.id}
                      </p>
                    </td>
                    <td
                      className="text-center px-4 py-3 font-medium"
                      style={{ color: "#1A202C" }}
                    >
                      {r.total}
                    </td>
                    <td
                      className="text-center px-4 py-3"
                      style={{ color: "#27AE60" }}
                    >
                      {r.completed}
                    </td>
                    <td
                      className="text-center px-4 py-3"
                      style={{ color: "#F4A623" }}
                    >
                      {r.inProgress}
                    </td>
                    <td
                      className="text-center px-4 py-3"
                      style={{ color: "#E74C3C" }}
                    >
                      {r.delayed}
                    </td>
                    <td className="text-center px-4 py-3">
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: ragClass
                            .replace("bg-", "bg-")
                            .replace("500", "100"),
                          color: ragClass
                            .replace("bg-", "text-")
                            .replace("500", "700"),
                        }}
                      >
                        <span className={`w-2 h-2 rounded-full ${ragClass}`} />
                        {ragLabel(r.rag)}
                      </div>
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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-sm"
                    style={{ color: "#718096" }}
                  >
                    No schedule data found
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
