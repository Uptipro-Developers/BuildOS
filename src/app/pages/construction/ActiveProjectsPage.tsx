import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Calendar,
  MapPin,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { fetchProjects } from "../../api/projects";
import { formatNumberByGeneralSettings } from "../../utils/generalSettings";

export function ActiveProjectsPage() {
  const navigate = useNavigate();
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  // The search box and both selects had no bindings, so the filter bar was
  // decorative. The contractor list was three hardcoded sample names.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [contractorFilter, setContractorFilter] = useState("All Contractors");

  useEffect(() => {
    fetchProjects()
      .then((all) =>
        setActiveProjects(
          all.filter(
            (p) => p.status !== "Completed" && p.status !== "Cancelled",
          ),
        ),
      )
      .catch(console.error);
  }, []);

  const contractors = [
    ...new Set(
      activeProjects.map((p) => p.contractor ?? p.client).filter(Boolean),
    ),
  ].sort();

  const q = search.trim().toLowerCase();
  const filteredProjects = activeProjects.filter((p) => {
    if (
      q &&
      !`${p.name ?? ""} ${p.location ?? ""} ${p.client ?? ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (statusFilter !== "All Status" && p.status !== statusFilter) return false;
    if (
      contractorFilter !== "All Contractors" &&
      (p.contractor ?? p.client) !== contractorFilter
    )
      return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Track":
        return "bg-green-100 text-green-700";
      case "At Risk":
        return "bg-yellow-100 text-yellow-700";
      case "Delayed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return "bg-green-500";
    if (progress >= 40) return "bg-blue-500";
    return "bg-yellow-500";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Active Projects
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Currently in-progress projects
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {activeProjects.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">Total Workforce</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {formatNumberByGeneralSettings(
                activeProjects.reduce((s, p) => s + (p.workforce ?? 0), 0),
              )}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">On Track</p>
            <p className="text-2xl font-semibold text-green-600 mt-1">
              {
                activeProjects.filter(
                  (p) => p.status === "Active" || p.status === "On Track",
                ).length
              }
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">At Risk / Delayed</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">
                {
                  activeProjects.filter(
                    (p) =>
                      p.status === "At Risk" ||
                      p.status === "Delayed" ||
                      p.status === "On Hold",
                  ).length
                }
              </p>
            </div>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search active projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option>All Status</option>
            <option>On Track</option>
            <option>At Risk</option>
            <option>Delayed</option>
          </select>
          <select
            value={contractorFilter}
            onChange={(e) => setContractorFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option>All Contractors</option>
            {contractors.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() =>
              navigate(`/apps/construction/projects/${project.id}`)
            }
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {project.id}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                      project.status,
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {project.startDate} - {project.endDate}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Location:</span>{" "}
                    {project.location}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(
                        project.progress,
                      )}`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Budget Info */}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Budget:</span> $
                    {(project.budget / 1000000).toFixed(1)}M
                  </div>
                  <div>
                    <span className="font-medium">Spent:</span> $
                    {(project.spent / 1000000).toFixed(1)}M (
                    {Math.round((project.spent / project.budget) * 100)}%)
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">PM:</span>{" "}
                    {project.manager || "—"}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/apps/construction/projects/${project.id}`);
                }}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
