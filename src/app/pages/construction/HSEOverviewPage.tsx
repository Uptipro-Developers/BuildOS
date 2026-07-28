import { useNavigate } from "react-router";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  ChevronRight,
  Award,
  Search,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { projects, hseMatrix as mockHseMatrix, fmtDate } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listHseRecords } from "../../api/hse-records";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Valid: { bg: "#E8F8EF", text: "#1B7A43" },
  "Expiring Soon": { bg: "#FEF6E6", text: "#B0780F" },
  Expired: { bg: "#FDE8E6", text: "#B33A2E" },
};

const INCIDENTS_MOCK = [
  {
    id: "INC-001",
    type: "Near Miss",
    date: "2026-05-15",
    projectId: "PRJ-001",
    description: "Worker slipped on wet surface near foundation area",
    severity: "Low",
  },
  {
    id: "INC-002",
    type: "First Aid",
    date: "2026-05-10",
    projectId: "PRJ-002",
    description: "Minor cut from rebar end cap missing",
    severity: "Low",
  },
];

export function HSEOverviewPage() {
  const navigate = useNavigate();
  const [hseMatrix, setHseMatrix] = useState(mockHseMatrix);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    listHseRecords()
      .then((data) => {
        if (active && data.length > 0) setHseMatrix(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  const valid = hseMatrix.filter((h) => h.status === "Valid");
  const expiringSoon = hseMatrix.filter((h) => h.status === "Expiring Soon");
  const expired = hseMatrix.filter((h) => h.status === "Expired");

  const filtered = hseMatrix.filter(
    (h) =>
      h.staffMember.toLowerCase().includes(search.toLowerCase()) ||
      h.competency.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { icon: ShieldCheck, label: "Competency Records", value: hseMatrix.length },
    { icon: Award, label: "Valid", value: valid.length, color: "#27AE60" },
    {
      icon: AlertTriangle,
      label: "Expiring Soon",
      value: expiringSoon.length,
      color: "#F4A623",
    },
    { icon: Users, label: "Expired", value: expired.length, color: "#E74C3C" },
  ];

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
          HSE Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          HSE competency and incidents across all projects
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
                placeholder="Search HSE records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
                style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
              />
            </div>
            <button
              onClick={() => {
                const rows = filtered.map((h) => {
                  const proj = projects.find((p) => p.id === h.projectId);
                  return [
                    h.staffMember,
                    h.competency,
                    proj?.name ?? h.projectId,
                    fmtDate(h.dateObtained),
                    fmtDate(h.expiryDate),
                    h.status,
                  ];
                });
                exportCSV(
                  "hse",
                  [
                    "Staff",
                    "Competency",
                    "Project",
                    "Date Obtained",
                    "Expiry",
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
                    Staff
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "#718096" }}
                  >
                    Competency
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
                    Date Obtained
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "#718096" }}
                  >
                    Expiry
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
                {filtered.map((hse, i) => {
                  const project = projects.find((p) => p.id === hse.projectId);
                  const st = STATUS_STYLES[hse.status] ?? {
                    bg: "#F1F5F9",
                    text: "#475569",
                  };
                  return (
                    <tr
                      key={hse.id}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        borderBottom:
                          i < filtered.length - 1
                            ? "1px solid #E2E8F0"
                            : "none",
                      }}
                      onClick={() =>
                        navigate(
                          `/apps/construction/projects/${hse.projectId}/hse`,
                        )
                      }
                    >
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ color: "#1A202C" }}
                      >
                        {hse.staffMember}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {hse.competency}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {project?.name ?? hse.projectId}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {fmtDate(hse.dateObtained)}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#718096" }}>
                        {fmtDate(hse.expiryDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: st.bg, color: st.text }}
                        >
                          {hse.status}
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
                      No HSE records found
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
            Recent Incidents
          </h2>
          <div className="space-y-3">
            {INCIDENTS_MOCK.map((inc) => {
              const project = projects.find((p) => p.id === inc.projectId);
              const sevColor =
                inc.severity === "Low"
                  ? "#F4A623"
                  : inc.severity === "Medium"
                    ? "#E8973A"
                    : "#E74C3C";
              return (
                <div
                  key={inc.id}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: "#F7F8FA",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${sevColor}20`,
                        color: sevColor,
                      }}
                    >
                      {inc.type}
                    </span>
                    <span className="text-xs" style={{ color: "#718096" }}>
                      {fmtDate(inc.date)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#1A202C" }}>
                    {inc.description}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#718096" }}>
                    {project?.name}
                  </p>
                </div>
              );
            })}
            {INCIDENTS_MOCK.length === 0 && (
              <p className="text-sm" style={{ color: "#718096" }}>
                No incidents recorded
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
