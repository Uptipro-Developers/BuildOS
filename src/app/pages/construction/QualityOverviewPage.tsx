import { useNavigate } from "react-router";
import {
  CheckSquare,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ClipboardList,
  Search,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { projects, qualityNCRs as mockQualityNCRs, fmtDate } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listQualityNcrs } from "../../api/quality-ncrs";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Open: { bg: "#FDE8E6", text: "#B33A2E" },
  "In Progress": { bg: "#FEF6E6", text: "#B0780F" },
  Closed: { bg: "#E8F8EF", text: "#1B7A43" },
};

export function QualityOverviewPage() {
  const navigate = useNavigate();
  const [qualityNCRs, setQualityNCRs] = useState(mockQualityNCRs);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    listQualityNcrs()
      .then((data) => {
        if (active && data.length > 0) setQualityNCRs(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  const openNcrs = qualityNCRs.filter((n) => n.status === "Open");
  const inProgressNcrs = qualityNCRs.filter((n) => n.status === "In Progress");
  const closedNcrs = qualityNCRs.filter((n) => n.status === "Closed");
  const complianceRate =
    qualityNCRs.length > 0
      ? Math.round((closedNcrs.length / qualityNCRs.length) * 100)
      : 100;

  const filtered = qualityNCRs.filter(
    (n) =>
      n.ncrId.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { icon: ClipboardList, label: "Total NCRs", value: qualityNCRs.length },
    {
      icon: AlertTriangle,
      label: "Open",
      value: openNcrs.length,
      color: "#E74C3C",
    },
    {
      icon: XCircle,
      label: "In Progress",
      value: inProgressNcrs.length,
      color: "#F4A623",
    },
    {
      icon: CheckSquare,
      label: "Closed",
      value: closedNcrs.length,
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
          Quality Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          Quality NCRs across all projects
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 bg-white rounded-lg overflow-hidden"
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
                placeholder="Search NCRs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
                style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
              />
            </div>
            <button
              onClick={() => {
                const rows = filtered.map((n) => {
                  const proj = projects.find((p) => p.id === n.projectId);
                  return [
                    n.ncrId,
                    proj?.name ?? n.projectId,
                    fmtDate(n.date),
                    n.description,
                    n.raisedBy,
                    n.status,
                  ];
                });
                exportCSV(
                  "quality",
                  [
                    "NCR ID",
                    "Project",
                    "Date",
                    "Description",
                    "Raised By",
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
                    NCR ID
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
                    Date
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "#718096" }}
                  >
                    Description
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "#718096" }}
                  >
                    Raised By
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
                {filtered.map((ncr, i) => {
                  const project = projects.find((p) => p.id === ncr.projectId);
                  const st = STATUS_STYLES[ncr.status] ?? {
                    bg: "#F1F5F9",
                    text: "#475569",
                  };
                  return (
                    <tr
                      key={ncr.id}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        borderBottom:
                          i < filtered.length - 1
                            ? "1px solid #E2E8F0"
                            : "none",
                      }}
                      onClick={() =>
                        navigate(
                          `/apps/construction/projects/${ncr.projectId}/quality`,
                        )
                      }
                    >
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ color: "#1A202C" }}
                      >
                        {ncr.ncrId}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {project?.name ?? ncr.projectId}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {fmtDate(ncr.date)}
                      </td>
                      <td
                        className="px-4 py-3 max-w-[200px] truncate"
                        style={{ color: "#1A202C" }}
                      >
                        {ncr.description}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {ncr.raisedBy}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: st.bg, color: st.text }}
                        >
                          {ncr.status}
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
                      colSpan={7}
                      className="text-center py-8 text-sm"
                      style={{ color: "#718096" }}
                    >
                      No NCRs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="bg-white rounded-lg p-5"
          style={{ border: "1px solid #E2E8F0" }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: "#1A202C" }}
          >
            QA Compliance Summary
          </h2>
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#27AE60"
                  strokeWidth="3"
                  strokeDasharray={`${complianceRate} ${100 - complianceRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
                style={{ color: "#1A202C" }}
              >
                {complianceRate}%
              </span>
            </div>
            <p className="text-sm" style={{ color: "#718096" }}>
              Compliance Rate
            </p>
            <p className="text-xs mt-1" style={{ color: "#718096" }}>
              {closedNcrs.length} of {qualityNCRs.length} NCRs closed
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "#718096" }}>Open</span>
              <span className="font-medium" style={{ color: "#E74C3C" }}>
                {openNcrs.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#718096" }}>In Progress</span>
              <span className="font-medium" style={{ color: "#F4A623" }}>
                {inProgressNcrs.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#718096" }}>Closed</span>
              <span className="font-medium" style={{ color: "#27AE60" }}>
                {closedNcrs.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
