import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Building2, FileText, AlertTriangle, CheckSquare, Clock, Truck } from "lucide-react";
import { useState } from "react";
import type { Project } from "./types";
import { getProjectById, getTasksByProject, getVendorsByProject, getReportsByProject, getIssuesByProject, fmtCurrency, fmtDate, ragColor, ragLabel } from "./mockData";
import { ProcessGuidance } from "../../components/ProcessGuidance";

const RAG_HEX: Record<string, { dot: string; bg: string; text: string }> = {
  "bg-green-500": { dot: "#27AE60", bg: "#E8F8EF", text: "#1B7A43" },
  "bg-amber-500": { dot: "#F4A623", bg: "#FEF6E6", text: "#B0780F" },
  "bg-red-500":   { dot: "#E74C3C", bg: "#FDE8E6", text: "#B33A2E" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "#F1F5F9", text: "#475569" },
  submitted: { bg: "#E8F8EF", text: "#1B7A43" },
};

export function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-500">Project ID is missing.</p>
          <button
            onClick={() => navigate("/apps/construction")}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const project = getProjectById(id);
  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">Project not found</h2>
          <p className="text-sm text-gray-500 mt-1">
            No project matches ID &ldquo;<span className="font-mono">{id}</span>&rdquo;.
          </p>
          <button
            onClick={() => navigate("/apps/construction")}
            className="mt-4 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#E8973A" }}
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const projectTasks = getTasksByProject(id);
  const projectVendors = getVendorsByProject(id);
  const projectReports = getReportsByProject(id);
  const projectIssues = getIssuesByProject(id);

  const workPackageCount = projectTasks.filter(t => t.level === 4).length;
  const avgPercentComplete = projectTasks.length > 0
    ? Math.round(projectTasks.reduce((s, t) => s + t.percentComplete, 0) / projectTasks.length)
    : 0;

  const sortedReports = [...projectReports].sort(
    (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  );
  const lastReport = sortedReports[0] ?? null;
  const recentReports = sortedReports.slice(0, 5);
  const openIssues = projectIssues.filter(
    i => i.status !== "Resolved" && i.status !== "Closed"
  );

  const ragClass = ragColor(project.ragStatus);
  const ragStyle = RAG_HEX[ragClass] ?? { dot: "#718096", bg: "#F7F8FA", text: "#4A5568" };

  const basePath = `/apps/construction/projects/${id}`;

  const infoCards = [
    { icon: Building2, label: "Client", value: project.client },
    { icon: MapPin, label: "Location", value: project.location },
    { icon: Users, label: "Project Manager", value: project.projectManager },
    { icon: DollarSign, label: "Budget", value: `${fmtCurrency(project.spent)} of ${fmtCurrency(project.budget)}` },
  ];

  const quickStats = [
    { icon: CheckSquare, label: "Work Packages", value: workPackageCount },
    { icon: Truck, label: "Resources", value: projectVendors.length },
    { icon: Clock, label: "% Complete", value: `${avgPercentComplete}%` },
    { icon: FileText, label: "Last Report", value: lastReport ? fmtDate(lastReport.reportDate) : "N/A" },
  ];

  const keyInfoRows: { label: string; value: React.ReactNode }[] = [
    { label: "Contract Type", value: project.contractType },
    { label: "Main Contractor", value: project.mainContractor },
    { label: "Planned Start", value: fmtDate(project.plannedStartDate) },
    { label: "Planned End", value: fmtDate(project.plannedEndDate) },
  ];
  if (project.sector) {
    const typeStr = project.category
      ? `${project.sector} → ${project.category}${project.descriptor ? ` — ${project.descriptor}` : ""}`
      : project.sector;
    keyInfoRows.splice(0, 0, { label: "Project Type", value: <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEF6E6", color: "#B0780F" }}>{typeStr}</span> });
  }
  if (project.structure && project.structure.length > 0) {
    const total = project.structure.length;
    const innerTotal = project.structure.reduce((s, item) => s + (item.attributes?.floors ?? item.attributes?.segments ?? item.attributes?.bays ?? item.attributes?.rooms ?? item.attributes?.span ?? 0), 0);
    keyInfoRows.splice(3, 0, { label: "Structure", value: `${total} item${total > 1 ? "s" : ""}${innerTotal > 0 ? ` (${innerTotal} sub-units)` : ""}` });
  }
  keyInfoRows.push({ label: "Cluster", value: project.clusterId });

  const quickActions = [
    { label: "View Schedule", path: "schedule", icon: Calendar },
    { label: "New Daily Report", path: "daily-reports/new", icon: FileText },
    { label: "View Resources", path: "resources", icon: Truck },
    { label: "View Issues", path: "issues", icon: AlertTriangle },
  ];

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-screen p-6 space-y-6">

      {/* Back button + heading + RAG badge */}
      <div>
        <button
          onClick={() => navigate("/apps/construction")}
          className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "#718096" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="flex items-center gap-3 mt-4">
          <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
            {project.name}
          </h1>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: ragStyle.bg, color: ragStyle.text }}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ragClass}`} />
            {ragLabel(project.ragStatus)}
          </div>
        </div>
      </div>

      {/* Workflow Process Guidance */}
      <ProcessGuidance
        title="Project Workflow"
        currentStatus={project.setupComplete ? "Active" : "Setup In Progress"}
        steps={[
          { id: "basic", label: "Basic Information", status: project.setupProgress !== undefined && project.setupProgress >= 20 ? "completed" : "current" },
          { id: "type", label: "Project Classification", status: project.sector ? "completed" : project.setupProgress ? "current" : "pending" },
          { id: "resources", label: "Resource Registration", status: project.setupComplete ? "completed" : project.setupProgress && project.setupProgress >= 40 ? "current" : "pending" },
          { id: "schedule", label: "Schedule & Calendar", status: project.setupComplete ? "completed" : project.setupProgress && project.setupProgress >= 60 ? "current" : "pending" },
          { id: "baseline", label: "Baseline Locked", status: project.setupComplete ? "completed" : "pending" },
        ]}
        nextStep={project.setupComplete ? "Submit Daily Reports" : "Continue Setup"}
        responsible={project.projectManager}
        dueDate={project.plannedEndDate ? fmtDate(project.plannedEndDate) : undefined}
        variant="compact"
      />

      {/* Project Info Bar — 4 cards */}
      <div className="grid grid-cols-4 gap-4">
        {infoCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-lg p-4 flex items-center gap-4"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#E8973A15", color: "#E8973A" }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: "#718096" }}>{card.label}</p>
                <p className="text-sm font-semibold truncate" style={{ color: "#1A202C" }}>
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats row — 4 cards */}
      <div className="grid grid-cols-4 gap-4">
        {quickStats.map(stat => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-lg p-4 flex items-center gap-3"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <Icon className="w-5 h-5" style={{ color: "#718096" }} />
              <div>
                <p className="text-xl font-bold" style={{ color: "#1A202C" }}>
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: "#718096" }}>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Information */}
      <div className="bg-white rounded-lg p-5" style={{ border: "1px solid #E2E8F0" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "#1A202C" }}>
          Key Information
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {keyInfoRows.map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span style={{ color: "#718096" }}>{row.label}:</span>
              <span className="font-medium" style={{ color: "#1A202C" }}>{row.value}</span>
            </div>
          ))}
        </div>
        <p className="text-sm mt-4 leading-relaxed" style={{ color: "#718096" }}>
          {project.description}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(`${basePath}/${action.path}`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#E8973A", color: "white" }}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-5" style={{ border: "1px solid #E2E8F0" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#1A202C" }}>
            Recent Activity
          </h2>
          {openIssues.length > 0 && (
            <div
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: "#FDE8E6", color: "#B33A2E" }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {openIssues.length} open {openIssues.length === 1 ? "issue" : "issues"}
            </div>
          )}
        </div>

        {recentReports.length === 0 && openIssues.length === 0 ? (
          <p className="text-sm" style={{ color: "#718096" }}>
            No recent activity for this project.
          </p>
        ) : (
          <div className="space-y-3">
            {recentReports.map(report => {
              const s = STATUS_STYLES[report.status] ?? { bg: "#F1F5F9", text: "#475569" };
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid #F1F5F9" }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" style={{ color: "#718096" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#1A202C" }}>
                        Daily Report &mdash; {fmtDate(report.reportDate)}
                      </p>
                      <p className="text-xs" style={{ color: "#718096" }}>
                        by {report.submittedBy}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: s.bg, color: s.text }}
                  >
                    {report.status}
                  </span>
                </div>
              );
            })}
            {openIssues.length > 0 && (
              <div
                className="flex items-center gap-3 pt-2"
                style={{ color: "#B33A2E" }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">
                  {openIssues.length} open {openIssues.length === 1 ? "issue" : "issues"} requiring attention
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
