import { useNavigate } from "react-router";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Search,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { projects, delays as mockDelays, fmtDate } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listDelays } from "../../api/delays";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Open: { bg: "#FDE8E6", text: "#B33A2E" },
  "Recovery Underway": { bg: "#FEF6E6", text: "#B0780F" },
  Resolved: { bg: "#E8F8EF", text: "#1B7A43" },
};

export function DelaysOverviewPage() {
  const navigate = useNavigate();
  const [delays, setDelays] = useState(mockDelays);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    listDelays()
      .then((data) => {
        if (active && data.length > 0) setDelays(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  const open = delays.filter((d) => d.status === "Open");
  const recovery = delays.filter((d) => d.status === "Recovery Underway");
  const resolved = delays.filter((d) => d.status === "Resolved");

  const filtered = delays.filter(
    (d) =>
      d.taskName.toLowerCase().includes(search.toLowerCase()) ||
      d.rootCause.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { icon: Clock, label: "Total Delays", value: delays.length },
    {
      icon: AlertTriangle,
      label: "Open",
      value: open.length,
      color: "#E74C3C",
    },
    {
      icon: Clock,
      label: "Recovery Underway",
      value: recovery.length,
      color: "#F4A623",
    },
    {
      icon: CheckCircle,
      label: "Resolved",
      value: resolved.length,
      color: "#27AE60",
    },
  ];

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
          Delays Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          Delays across all projects
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
              placeholder="Search delays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = filtered.map((d) => {
                const proj = projects.find((p) => p.id === d.projectId);
                return [
                  d.taskName,
                  proj?.name ?? d.projectId,
                  d.stagePhase,
                  fmtDate(d.plannedEndDate),
                  String(d.daysDelayed),
                  d.rootCause,
                  d.status,
                ];
              });
              exportCSV(
                "delays",
                [
                  "Task",
                  "Project",
                  "Stage",
                  "Planned End",
                  "Days Delayed",
                  "Root Cause",
                  "Status",
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
                  Task
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Project
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Stage
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Planned End
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Days Delayed
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Root Cause
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Status
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((delay, i) => {
                const project = projects.find((p) => p.id === delay.projectId);
                const st = STATUS_STYLES[delay.status] ?? {
                  bg: "#F1F5F9",
                  text: "#475569",
                };
                return (
                  <tr
                    key={delay.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                    }}
                    onClick={() =>
                      navigate(
                        `/apps/construction/projects/${delay.projectId}/delays`,
                      )
                    }
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#1A202C" }}
                    >
                      {delay.taskName}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {project?.name ?? delay.projectId}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {delay.stagePhase}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {fmtDate(delay.plannedEndDate)}
                    </td>
                    <td
                      className="text-center px-4 py-3 font-medium"
                      style={{ color: "#E74C3C" }}
                    >
                      {delay.daysDelayed}
                    </td>
                    <td
                      className="px-4 py-3 max-w-[200px] truncate"
                      style={{ color: "#718096" }}
                    >
                      {delay.rootCause}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: st.bg, color: st.text }}
                      >
                        {delay.status}
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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-sm"
                    style={{ color: "#718096" }}
                  >
                    No delays found
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
