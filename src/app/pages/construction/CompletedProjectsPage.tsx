import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { fetchProjects } from "../../api/projects";

export function CompletedProjectsPage() {
  const navigate = useNavigate();
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  // Search and the year select had no bindings; the years were hardcoded.
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("All Years");

  useEffect(() => {
    fetchProjects({ status: "Completed" })
      .then(setCompletedProjects)
      .catch(console.error);
  }, []);

  const years = [
    ...new Set(
      completedProjects
        .map((p) => (p.endDate ? new Date(p.endDate).getFullYear() : null))
        .filter((y): y is number => Number.isFinite(y as number)),
    ),
  ].sort((a, b) => b - a);

  const q = search.trim().toLowerCase();
  const filteredProjects = completedProjects.filter((p) => {
    if (
      q &&
      !`${p.name ?? ""} ${p.location ?? ""} ${p.client ?? ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (
      yearFilter !== "All Years" &&
      (!p.endDate ||
        String(new Date(p.endDate).getFullYear()) !== yearFilter)
    )
      return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Completed Projects
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Successfully completed projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Completed</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {completedProjects.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              $
              {(
                completedProjects.reduce((s, p) => s + (p.budget ?? 0), 0) /
                1000000
              ).toFixed(0)}
              M
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">This Year</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {
                completedProjects.filter(
                  (p) =>
                    p.endDate &&
                    new Date(p.endDate).getFullYear() ===
                      new Date().getFullYear(),
                ).length
              }
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">Avg. Duration</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">—</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search completed projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option>All Years</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() =>
              navigate(`/apps/construction/projects/${project.id}`)
            }
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {project.id}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Completed: {project.endDate}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                  <div>Budget: ${(project.budget / 1000000).toFixed(1)}M</div>
                  <div className="mt-1">
                    {project.manager ? `PM: ${project.manager}` : ""}
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
