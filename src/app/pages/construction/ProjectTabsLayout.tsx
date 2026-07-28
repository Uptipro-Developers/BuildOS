import { Outlet, useParams, useNavigate, NavLink } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { ragColor, ragLabel } from "./mockData";
import { getConstructionProject } from "../../api/projects";
import { upsertProjectCache } from "./projectStore";
import type { Project } from "./types";

const tabs = [
  { label: "Overview", path: "overview", icon: "📋" },
  { label: "Schedule", path: "schedule", icon: "📅" },
  { label: "Daily Reports", path: "daily-reports", icon: "📄" },
  { label: "Resources", path: "resources", icon: "🚛" },
  { label: "Issues", path: "issues", icon: "⚠️" },
  { label: "Change Requests", path: "change-requests", icon: "🔀" },
  { label: "Delays", path: "delays", icon: "⏰" },
  { label: "Quality", path: "quality", icon: "✅" },
  { label: "HSE", path: "hse", icon: "🛡️" },
  { label: "Documents", path: "documents", icon: "📁" },
  { label: "Financials", path: "financials", icon: "💰" },
  { label: "Progress", path: "progress", icon: "📊" },
  { label: "Stakeholders", path: "stakeholders", icon: "👥" },
  { label: "Setup", path: "setup", icon: "⚙️" },
];

export function ProjectTabsLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getConstructionProject(id)
      .then((p) => {
        if (!active) return;
        upsertProjectCache(p as Project);
        setProject(p as Project);
      })
      .catch(() => {
        if (active) setProject(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Project ID is missing.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading project…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Project not found</p>
          <p className="text-sm text-gray-500 mt-1">No project matches ID &ldquo;{id}&rdquo;.</p>
          <button onClick={() => navigate("/apps/construction/projects")} className="mt-4 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: "#E8973A" }}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const basePath = `/apps/construction/projects/${id}`;

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/apps/construction/projects")} className="flex items-center gap-1.5 text-sm" style={{ color: "#718096" }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5" style={{ backgroundColor: "#E2E8F0" }} />
          <h1 className="text-xl font-bold" style={{ color: "#1A202C" }}>{project.name}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium`} style={{ backgroundColor: "#E8F8EF", color: "#1B7A43" }}>
            <span className={`w-2 h-2 rounded-full ${ragColor(project.ragStatus)}`} />
            {ragLabel(project.ragStatus)}
          </span>
        </div>
        <p className="text-xs" style={{ color: "#718096" }}>{project.client} · {project.location}</p>
      </div>

      <div className="flex gap-0.5 overflow-x-auto pb-0.5 border-b" style={{ borderColor: "#E2E8F0" }}>
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={`${basePath}/${tab.path}`}
            end={tab.path === "overview"}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                isActive
                  ? "text-white"
                  : "hover:bg-black/5"
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? "white" : "#718096",
              backgroundColor: isActive ? "#E8973A" : "transparent",
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
