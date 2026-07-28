import { useParams } from "react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Briefcase,
  Plus,
  Search,
  Calendar,
  User,
  MessageSquare,
  X,
  Building,
  Shield,
  UserCircle,
  Download,
} from "lucide-react";
import { getProjectById, stakeholders, fmtDate } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listStakeholders, createStakeholder } from "../../api/stakeholders";
import { listVisitorLogs, createVisitorLog } from "../../api/visitor-logs";
import { useNumbering } from "../../stores/numberingStore";

interface CommPlanEntry {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  commType: string;
  frequency: string;
  responsible: string;
  method: string;
}

interface EngagementLogEntry {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  date: string;
  commType: string;
  summary: string;
  outcome: string;
  followup: string;
}

interface VisitorLogEntry {
  id: string;
  date: string;
  name: string;
  organization: string;
  purpose: string;
  host: string;
  badgeNumber?: string;
}

const initialCommPlans: CommPlanEntry[] = [
  {
    id: "CP-001",
    stakeholderId: "SH-001",
    stakeholderName: "Babatunde Raji",
    commType: "Progress Meeting",
    frequency: "Monthly",
    responsible: "Project Manager",
    method: "In-person",
  },
  {
    id: "CP-002",
    stakeholderId: "SH-001",
    stakeholderName: "Babatunde Raji",
    commType: "Status Report",
    frequency: "Weekly",
    responsible: "Project Manager",
    method: "Email",
  },
  {
    id: "CP-003",
    stakeholderId: "SH-002",
    stakeholderName: "Arch. Femi Adekunle",
    commType: "Design Review",
    frequency: "Bi-weekly",
    responsible: "Design Team",
    method: "Video Call",
  },
  {
    id: "CP-004",
    stakeholderId: "SH-003",
    stakeholderName: "LASBCA",
    commType: "Inspection Notice",
    frequency: "Per Stage",
    responsible: "QA/QC",
    method: "Formal Letter",
  },
];

const initialEngagementLog: EngagementLogEntry[] = [
  {
    id: "EL-001",
    stakeholderId: "SH-001",
    stakeholderName: "Babatunde Raji",
    date: "2026-05-15",
    commType: "Progress Meeting",
    summary: "Reviewed substructure progress and foundation schedule",
    outcome: "Client approved revised foundation timeline",
    followup: "Send updated schedule by 18 May",
  },
  {
    id: "EL-002",
    stakeholderId: "SH-002",
    stakeholderName: "Arch. Femi Adekunle",
    date: "2026-05-12",
    commType: "Design Review",
    summary: "Reviewed revised elevation drawings for Tower A",
    outcome: "Minor revisions required to north facade",
    followup: "Submit revised drawings by 19 May",
  },
];

const initialVisitorLog: VisitorLogEntry[] = [];

const roleIcons: Record<string, React.ReactNode> = {
  Client: <Building className="w-3.5 h-3.5" />,
  Contractor: <HardHat className="w-3.5 h-3.5" />,
  Consultant: <UserCircle className="w-3.5 h-3.5" />,
  Regulator: <Shield className="w-3.5 h-3.5" />,
};

const roleColors: Record<string, string> = {
  Client: "bg-blue-100 text-blue-700",
  Contractor: "bg-orange-100 text-orange-700",
  Consultant: "bg-purple-100 text-purple-700",
  Regulator: "bg-red-100 text-red-700",
};

const influenceColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700",
};

function HardHat({ className }: { className?: string }) {
  return <Briefcase className={className} />;
}

type SubTab = "register" | "comm-plan" | "engagement" | "visitor";

export function StakeholdersPage() {
  const { getNextId } = useNumbering();
  const { id } = useParams<{ id: string }>();
  const project = getProjectById(id ?? "");
  const [activeTab, setActiveTab] = useState<SubTab>("register");
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [search, setSearch] = useState("");
  const [localStakeholders, setLocalStakeholders] = useState(stakeholders);
  useEffect(() => {
    if (!id) return;
    let active = true;
    listStakeholders(id)
      .then((data) => {
        if (active && data.length > 0) setLocalStakeholders(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);
  const [commPlans] = useState(initialCommPlans);
  const [engagementLog, setEngagementLog] = useState(initialEngagementLog);
  const [visitorLog, setVisitorLog] = useState(initialVisitorLog);
  useEffect(() => {
    if (!id) return;
    let active = true;
    listVisitorLogs(id)
      .then((data) => {
        if (active) setVisitorLog(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [showAddEngagement, setShowAddEngagement] = useState(false);
  const [showLogCommunication, setShowLogCommunication] = useState(false);
  const [commLogForm, setCommLogForm] = useState({
    stakeholderId: "",
    commType: "",
    summary: "",
    outcome: "",
    followup: "",
  });

  const projectStakeholders = useMemo(
    () => localStakeholders.filter((s) => s.projectId === (id ?? "")),
    [localStakeholders, id],
  );
  const filteredStakeholders = projectStakeholders.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.organization.toLowerCase().includes(search.toLowerCase()),
  );

  const [addForm, setAddForm] = useState({
    name: "",
    organization: "",
    role: "Consultant" as string,
    influence: "Medium" as string,
    impact: "Medium" as string,
    notes: "",
    email: "",
    phone: "",
  });

  const [visitorForm, setVisitorForm] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    organization: "",
    purpose: "",
    host: "",
  });

  const [engagementForm, setEngagementForm] = useState({
    date: new Date().toISOString().split("T")[0],
    stakeholderId: "",
    commType: "",
    summary: "",
    outcome: "",
    followup: "",
  });

  const subTabs: {
    id: SubTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: "register",
      label: "Stakeholder Register",
      icon: <Users className="w-3.5 h-3.5" />,
      count: projectStakeholders.length,
    },
    {
      id: "comm-plan",
      label: "Communication Plan",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      count: commPlans.length,
    },
    {
      id: "engagement",
      label: "Engagement Log",
      icon: <Calendar className="w-3.5 h-3.5" />,
      count: engagementLog.length,
    },
    {
      id: "visitor",
      label: "Visitor Log",
      icon: <User className="w-3.5 h-3.5" />,
      count: visitorLog.length,
    },
  ];

  function handleAddStakeholder() {
    if (!addForm.name || !addForm.organization) return;
    const newSh = {
      id: getNextId("Stakeholder"),
      projectId: id ?? "",
      name: addForm.name,
      organization: addForm.organization,
      role: addForm.role,
      email: addForm.email || undefined,
      phone: addForm.phone || undefined,
      influenceLevel: addForm.influence as "High" | "Medium" | "Low",
      impactLevel: addForm.impact as "High" | "Medium" | "Low",
      notes: addForm.notes,
    };
    const { id: _omit, ...payload } = newSh;
    createStakeholder(payload)
      .then((saved) => setLocalStakeholders((prev) => [...prev, saved]))
      .catch(() => setLocalStakeholders((prev) => [...prev, newSh]));
    setShowAddStakeholder(false);
    setAddForm({
      name: "",
      organization: "",
      role: "Consultant",
      influence: "Medium",
      impact: "Medium",
      notes: "",
      email: "",
      phone: "",
    });
  }

  async function handleAddVisitor() {
    if (!visitorForm.name || !id) return;
    try {
      const created = await createVisitorLog({ projectId: id, ...visitorForm });
      setVisitorLog((prev) => [created, ...prev]);
    } catch {
      /* leave the list unchanged on failure */
    }
    setShowAddVisitor(false);
    setVisitorForm({
      date: new Date().toISOString().split("T")[0],
      name: "",
      organization: "",
      purpose: "",
      host: "",
    });
  }

  function handleAddEngagement() {
    if (!engagementForm.stakeholderId || !engagementForm.summary) return;
    const sh = localStakeholders.find(
      (s) => s.id === engagementForm.stakeholderId,
    );
    setEngagementLog((prev) => [
      ...prev,
      {
        id: `EL-${Date.now()}`,
        stakeholderId: engagementForm.stakeholderId,
        stakeholderName: sh?.name ?? "Unknown",
        date: engagementForm.date,
        commType: engagementForm.commType,
        summary: engagementForm.summary,
        outcome: engagementForm.outcome,
        followup: engagementForm.followup,
      },
    ]);
    setShowAddEngagement(false);
    setEngagementForm({
      date: new Date().toISOString().split("T")[0],
      stakeholderId: "",
      commType: "",
      summary: "",
      outcome: "",
      followup: "",
    });
  }

  function handleLogCommunication() {
    if (!commLogForm.stakeholderId || !commLogForm.summary) return;
    const sh = localStakeholders.find(
      (s) => s.id === commLogForm.stakeholderId,
    );
    setEngagementLog((prev) => [
      ...prev,
      {
        id: `EL-${Date.now()}`,
        stakeholderId: commLogForm.stakeholderId,
        stakeholderName: sh?.name ?? "Unknown",
        date: new Date().toISOString().split("T")[0],
        commType: commLogForm.commType,
        summary: commLogForm.summary,
        outcome: commLogForm.outcome,
        followup: commLogForm.followup,
      },
    ]);
    setShowLogCommunication(false);
    setCommLogForm({
      stakeholderId: "",
      commType: "",
      summary: "",
      outcome: "",
      followup: "",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stakeholders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project?.name ?? "Project"} — Stakeholder management
          </p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex border-b border-gray-200">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.icon} {t.label}
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-1">
              {t.count ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Stakeholder Register */}
      {activeTab === "register" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stakeholders..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
              />
            </div>
            <button
              onClick={() => {
                const rows = localStakeholders.map((sh) => [
                  sh.name,
                  sh.organization,
                  sh.role,
                  sh.email || "",
                  sh.phone || "",
                  sh.influenceLevel,
                  sh.impactLevel,
                  sh.notes || "",
                ]);
                exportCSV(
                  "stakeholders-register",
                  [
                    "Name",
                    "Organization",
                    "Role",
                    "Email",
                    "Phone",
                    "Influence",
                    "Impact",
                    "Notes",
                  ],
                  rows,
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setShowAddStakeholder(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Stakeholder
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Influence
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Impact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStakeholders.map((sh) => (
                  <tr key={sh.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {sh.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className="font-medium text-gray-900">
                          {sh.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {sh.organization}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${roleColors[sh.role] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {roleIcons[sh.role] ?? null} {sh.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sh.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sh.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${influenceColors[sh.influenceLevel]}`}
                      >
                        {sh.influenceLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${influenceColors[sh.impactLevel]}`}
                      >
                        {sh.impactLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {sh.notes || "—"}
                    </td>
                  </tr>
                ))}
                {filteredStakeholders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No stakeholders found
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Communication Plan */}
      {activeTab === "comm-plan" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                const rows = commPlans.map((cp) => [
                  cp.stakeholderName,
                  cp.commType,
                  cp.frequency,
                  cp.responsible,
                  cp.method,
                ]);
                exportCSV(
                  "communication-plan",
                  ["Stakeholder", "Type", "Frequency", "Responsible", "Method"],
                  rows,
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setShowLogCommunication(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Log Communication
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Communication Plan
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Stakeholder
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Communication Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Responsible
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commPlans.map((cp) => (
                  <tr key={cp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {cp.stakeholderName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {cp.commType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {cp.frequency}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {cp.responsible}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {cp.method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Engagement Log */}
      {activeTab === "engagement" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                const rows = engagementLog.map((el) => [
                  fmtDate(el.date),
                  el.stakeholderName,
                  el.commType,
                  el.summary,
                  el.outcome,
                  el.followup,
                ]);
                exportCSV(
                  "engagement-log",
                  [
                    "Date",
                    "Stakeholder",
                    "Type",
                    "Summary",
                    "Outcome",
                    "Follow-up",
                  ],
                  rows,
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setShowAddEngagement(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Log Engagement
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Stakeholder
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Comm Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Outcome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Follow-up
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {engagementLog.map((el) => (
                  <tr key={el.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {fmtDate(el.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {el.stakeholderName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {el.commType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                      {el.summary}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                      {el.outcome || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">
                      {el.followup || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visitor Log */}
      {activeTab === "visitor" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                const rows = visitorLog.map((v) => [
                  v.name,
                  v.organization,
                  v.purpose,
                  fmtDate(v.date),
                  v.host,
                  v.badgeNumber || "",
                ]);
                exportCSV(
                  "visitor-log",
                  ["Name", "Organization", "Purpose", "Date", "Host", "Badge"],
                  rows,
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setShowAddVisitor(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Log Visitor
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Visitor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Purpose
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Accompanied By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visitorLog.map((vl) => (
                  <tr key={vl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {fmtDate(vl.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {vl.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vl.organization}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {vl.purpose}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {vl.host}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stakeholder Modal */}
      {showAddStakeholder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Add Stakeholder
              </h3>
              <button
                onClick={() => setShowAddStakeholder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization *
                  </label>
                  <input
                    value={addForm.organization}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        organization: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, role: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Client">Client</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Regulator">Regulator</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="+234-..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Influence
                  </label>
                  <select
                    value={addForm.influence}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, influence: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impact
                  </label>
                  <select
                    value={addForm.impact}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, impact: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAddStakeholder(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStakeholder}
                disabled={!addForm.name || !addForm.organization}
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Visitor Modal */}
      {showAddVisitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Log Visitor
              </h3>
              <button
                onClick={() => setShowAddVisitor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={visitorForm.date}
                    onChange={(e) =>
                      setVisitorForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visitor Name *
                  </label>
                  <input
                    value={visitorForm.name}
                    onChange={(e) =>
                      setVisitorForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    value={visitorForm.organization}
                    onChange={(e) =>
                      setVisitorForm((f) => ({
                        ...f,
                        organization: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accompanied By
                  </label>
                  <input
                    value={visitorForm.host}
                    onChange={(e) =>
                      setVisitorForm((f) => ({
                        ...f,
                        host: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <input
                  value={visitorForm.purpose}
                  onChange={(e) =>
                    setVisitorForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAddVisitor(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVisitor}
                disabled={!visitorForm.name}
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Engagement Modal */}
      {showAddEngagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Log Engagement
              </h3>
              <button
                onClick={() => setShowAddEngagement(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={engagementForm.date}
                    onChange={(e) =>
                      setEngagementForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stakeholder *
                  </label>
                  <select
                    value={engagementForm.stakeholderId}
                    onChange={(e) =>
                      setEngagementForm((f) => ({
                        ...f,
                        stakeholderId: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select…</option>
                    {localStakeholders.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.name} — {sh.organization}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication Type
                </label>
                <input
                  value={engagementForm.commType}
                  onChange={(e) =>
                    setEngagementForm((f) => ({
                      ...f,
                      commType: e.target.value,
                    }))
                  }
                  placeholder="e.g. Progress Meeting"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary *
                </label>
                <textarea
                  rows={2}
                  value={engagementForm.summary}
                  onChange={(e) =>
                    setEngagementForm((f) => ({
                      ...f,
                      summary: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outcome
                  </label>
                  <input
                    value={engagementForm.outcome}
                    onChange={(e) =>
                      setEngagementForm((f) => ({
                        ...f,
                        outcome: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up
                  </label>
                  <input
                    value={engagementForm.followup}
                    onChange={(e) =>
                      setEngagementForm((f) => ({
                        ...f,
                        followup: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAddEngagement(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEngagement}
                disabled={
                  !engagementForm.stakeholderId || !engagementForm.summary
                }
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Communication Modal */}
      {showLogCommunication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Log Communication
              </h3>
              <button
                onClick={() => setShowLogCommunication(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stakeholder *
                </label>
                <select
                  value={commLogForm.stakeholderId}
                  onChange={(e) =>
                    setCommLogForm((f) => ({
                      ...f,
                      stakeholderId: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select…</option>
                  {localStakeholders.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} — {sh.organization}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication Type
                </label>
                <select
                  value={commLogForm.commType}
                  onChange={(e) =>
                    setCommLogForm((f) => ({ ...f, commType: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select type…</option>
                  <option value="Progress Meeting">Progress Meeting</option>
                  <option value="Status Report">Status Report</option>
                  <option value="Design Review">Design Review</option>
                  <option value="Inspection Notice">Inspection Notice</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary *
                </label>
                <textarea
                  rows={2}
                  value={commLogForm.summary}
                  onChange={(e) =>
                    setCommLogForm((f) => ({ ...f, summary: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outcome
                  </label>
                  <input
                    value={commLogForm.outcome}
                    onChange={(e) =>
                      setCommLogForm((f) => ({ ...f, outcome: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up
                  </label>
                  <input
                    value={commLogForm.followup}
                    onChange={(e) =>
                      setCommLogForm((f) => ({
                        ...f,
                        followup: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowLogCommunication(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogCommunication}
                disabled={!commLogForm.stakeholderId || !commLogForm.summary}
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
