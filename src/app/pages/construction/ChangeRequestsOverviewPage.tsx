import { useNavigate } from "react-router";
import {
  GitCompare,
  CheckCircle,
  Clock,
  ChevronRight,
  Search,
  DollarSign,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  projects,
  changeRequests as mockChangeRequests,
  fmtDate,
  fmtCurrency,
} from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listChangeRequests } from "../../api/change-requests";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Proposed: { bg: "#F1F5F9", text: "#475569" },
  "Under Review": { bg: "#FEF6E6", text: "#B0780F" },
  Approved: { bg: "#E8F8EF", text: "#1B7A43" },
  Rejected: { bg: "#FDE8E6", text: "#B33A2E" },
  Implemented: { bg: "#E8F0FE", text: "#1A5BB3" },
  Closed: { bg: "#E8F8EF", text: "#1B7A43" },
};

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Scope: { bg: "#E8F0FE", text: "#1A5BB3" },
  Cost: { bg: "#FDE8E6", text: "#B33A2E" },
  Design: { bg: "#E8F8EF", text: "#1B7A43" },
  Schedule: { bg: "#FEF6E6", text: "#B0780F" },
};

export function ChangeRequestsOverviewPage() {
  const navigate = useNavigate();
  const [changeRequests, setChangeRequests] = useState(mockChangeRequests);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    listChangeRequests()
      .then((data) => {
        if (active && data.length > 0) setChangeRequests(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  const underReview = changeRequests.filter(
    (cr) => cr.status === "Under Review",
  );
  const approved = changeRequests.filter((cr) => cr.status === "Approved");
  const totalCostImpact = changeRequests.reduce(
    (s, cr) => s + cr.costImpact,
    0,
  );

  const stats = [
    { icon: GitCompare, label: "Total CRs", value: changeRequests.length },
    {
      icon: Clock,
      label: "Under Review",
      value: underReview.length,
      color: "#F4A623",
    },
    {
      icon: CheckCircle,
      label: "Approved",
      value: approved.length,
      color: "#27AE60",
    },
    {
      icon: DollarSign,
      label: "Total Cost Impact",
      value: fmtCurrency(totalCostImpact),
      color: "#E8973A",
    },
  ];

  const filtered = changeRequests.filter(
    (cr) =>
      cr.description.toLowerCase().includes(search.toLowerCase()) ||
      cr.crNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
          Change Requests Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          Change requests across all projects
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
        className="bg-white rounded-lg p-4"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#718096" }}
            />
            <input
              type="text"
              placeholder="Search change requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = filtered.map((cr) => {
                const proj = projects.find((p) => p.id === cr.projectId);
                return [
                  cr.crNumber,
                  proj?.name ?? cr.projectId,
                  cr.changeTypes.join(", "),
                  cr.description,
                  cr.status,
                  fmtCurrency(cr.costImpact),
                  fmtDate(cr.dateRaised),
                ];
              });
              exportCSV(
                "change-requests",
                [
                  "CR ID",
                  "Project",
                  "Type",
                  "Description",
                  "Status",
                  "Cost Impact",
                  "Date",
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
                  CR ID
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
                  Type
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
                  Status
                </th>
                <th
                  className="text-right px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Cost Impact
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Date
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((cr, i) => {
                const project = projects.find((p) => p.id === cr.projectId);
                const st = STATUS_STYLES[cr.status] ?? {
                  bg: "#F1F5F9",
                  text: "#475569",
                };
                return (
                  <tr
                    key={cr.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                    }}
                    onClick={() =>
                      navigate(
                        `/apps/construction/projects/${cr.projectId}/change-requests`,
                      )
                    }
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#1A202C" }}
                    >
                      {cr.crNumber}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {project?.name ?? cr.projectId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {cr.changeTypes.map((t) => {
                          const tc = TYPE_STYLES[t] ?? {
                            bg: "#F1F5F9",
                            text: "#475569",
                          };
                          return (
                            <span
                              key={t}
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: tc.bg, color: tc.text }}
                            >
                              {t}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 max-w-[240px] truncate"
                      style={{ color: "#1A202C" }}
                    >
                      {cr.description}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: st.bg, color: st.text }}
                      >
                        {cr.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right font-medium"
                      style={{ color: "#E74C3C" }}
                    >
                      {fmtCurrency(cr.costImpact)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {fmtDate(cr.dateRaised)}
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
                    No change requests found
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
