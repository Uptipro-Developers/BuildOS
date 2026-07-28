import { useParams, useNavigate } from "react-router";
import {
  Plus,
  FileText,
  Filter,
  Search,
  Sun,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Eye,
  CheckCircle,
  Edit,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getReportsByProject, getProjectById, fmtDate } from "./mockData";
import type { DailyReport } from "./types";
import { listDailyReports } from "../../api/daily-reports";

const weatherIcon = (w: string) => {
  switch (w) {
    case "Sunny":
      return <Sun className="w-4 h-4 text-amber-500" />;
    case "Cloudy":
      return <Cloud className="w-4 h-4 text-gray-400" />;
    case "Drizzle":
      return <CloudDrizzle className="w-4 h-4 text-blue-400" />;
    case "Rainy":
      return <CloudRain className="w-4 h-4 text-blue-600" />;
    default:
      return <Sun className="w-4 h-4 text-gray-300" />;
  }
};

export function DailyReportsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = getProjectById(projectId || "");
  const allReports = getReportsByProject(projectId || "");
  const basePath = `/apps/construction/projects/${projectId}/daily-reports`;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Local state for review actions (approve/reject)
  const [localReports, setLocalReports] = useState<DailyReport[]>(allReports);
  const reports = localReports;

  // Load reports from the backend, falling back to mock data when unavailable.
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    listDailyReports(projectId)
      .then((data) => {
        if (active && data.length > 0) setLocalReports(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const approveReport = (reportId: string) => {
    setLocalReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: "submitted" as const,
              reviewedBy: "Project Manager",
              reviewedAt: new Date().toISOString(),
              reviewNotes: undefined,
            }
          : r,
      ),
    );
  };
  const rejectReport = (reportId: string) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setLocalReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: "draft" as const,
              reviewedBy: "Project Manager",
              reviewedAt: new Date().toISOString(),
              reviewNotes: reason,
            }
          : r,
      ),
    );
  };

  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateFrom && r.reportDate < dateFrom) return false;
    if (dateTo && r.reportDate > dateTo) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !r.id.toLowerCase().includes(q) &&
        !r.submittedBy.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalMandays = filtered.reduce(
    (s, r) => s + r.manpower.reduce((m, p) => m + p.mandays, 0),
    0,
  );
  const totalEquip = filtered.reduce((s, r) => s + r.equipment.length, 0);

  return (
    <div className="space-y-6" style={{ backgroundColor: "#F7F8FA" }}>
      {/* Toast / notification area intentionally left blank for extensibility */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Daily Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project?.name || "Project"} · {allReports.length} reports
          </p>
        </div>
        <button
          onClick={() => navigate(`${basePath}/new`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Reports
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {filtered.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Total Man-days
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalMandays}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Equipment Entries
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalEquip}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by ID or submitted by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-sm border-none outline-none bg-transparent py-1"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-md px-2 py-1.5 outline-none focus:border-[#E8973A]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-md px-2 py-1.5 outline-none focus:border-[#E8973A]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-md px-2 py-1.5 outline-none focus:border-[#E8973A]"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending-review">Pending Review</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Weather
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Submitted By
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Status
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Manpower
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Equipment
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-2">
                    No daily reports found
                  </p>
                  <button
                    onClick={() => navigate(`${basePath}/new`)}
                    className="text-sm font-medium hover:underline"
                    style={{ color: "#E8973A" }}
                  >
                    Create your first report
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`${basePath}/${r.id}`)}
                  className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {fmtDate(r.reportDate)}
                  </td>
                  <td className="px-4 py-3">{weatherIcon(r.weather)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {r.submittedBy}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "draft"
                          ? "bg-amber-100 text-amber-700"
                          : r.status === "pending-review"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {r.status === "draft" ? (
                        <Edit className="w-3 h-3" />
                      ) : r.status === "pending-review" ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {r.status === "draft"
                        ? "Draft"
                        : r.status === "pending-review"
                          ? "Pending Review"
                          : "Submitted"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {r.manpower.length}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {r.equipment.length}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${basePath}/${r.id}`);
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${basePath}/${r.id}/edit`);
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {r.status === "pending-review" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approveReport(r.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                            title="Approve"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectReport(r.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                            title="Reject"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
