import { useParams } from "react-router";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  FileText,
  ClipboardList,
  BookOpen,
  Siren,
  Award,
  Plus,
  XCircle,
} from "lucide-react";
import { getProjectById, hseMatrix, fmtDate } from "./mockData";
import { listHseRecords, createHseRecord } from "../../api/hse-records";
import { fetchEmployees } from "../../api/employees";
import { useNumbering } from "../../stores/numberingStore";

type HSETab =
  | "toolbox"
  | "incidents"
  | "permits"
  | "audits"
  | "drills"
  | "competency";

const subTabs: { id: HSETab; label: string; icon: React.ReactNode }[] = [
  {
    id: "toolbox",
    label: "Toolbox Talks",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: "incidents",
    label: "Incident Log",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  {
    id: "permits",
    label: "Permits to Work",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "audits",
    label: "HSE Audits & Inspections",
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    id: "drills",
    label: "Emergency Drills",
    icon: <Siren className="w-4 h-4" />,
  },
  {
    id: "competency",
    label: "HSE Competency Matrix",
    icon: <Award className="w-4 h-4" />,
  },
];

const toolboxTalks = [
  {
    date: "2026-05-20",
    topic: "Safe Lifting Techniques",
    facilitator: "Diana Park",
    attendees: "24",
    notes: "All crew attended; demo conducted",
  },
  {
    date: "2026-05-22",
    topic: "Working at Height",
    facilitator: "James Okafor",
    attendees: "18",
    notes: "Focused on scaffolding safety",
  },
  {
    date: "2026-05-25",
    topic: "Fire Safety & Evacuation",
    facilitator: "Diana Park",
    attendees: "30",
    notes: "Quarterly fire safety refresher",
  },
  {
    date: "2026-05-28",
    topic: "PPE Compliance",
    facilitator: "Sarah Adeyemi",
    attendees: "22",
    notes: "Spot checks planned for next week",
  },
];

const incidents = [
  {
    id: "INC-001",
    date: "2026-05-15",
    type: "Near Miss" as const,
    description: "Falling tool from scaffolding — no injury",
    person: "N/A",
    wp: "WP-003",
    rootCause: "Tool lanyard not used",
    correctiveAction: "Retrain crew on tool tethering",
    status: "Closed" as const,
  },
  {
    id: "INC-002",
    date: "2026-05-19",
    type: "First Aid" as const,
    description: "Minor cut from rebar tie wire",
    person: "James Okafor",
    wp: "WP-003",
    rootCause: "Gloves not worn",
    correctiveAction: "Issued warning; PPE reminder",
    status: "Closed" as const,
  },
  {
    id: "INC-003",
    date: "2026-05-26",
    type: "Near Miss" as const,
    description: "Excavation edge collapse near worker",
    person: "N/A",
    wp: "WP-001",
    rootCause: "Inadequate shoring",
    correctiveAction: "Stop work; install trench box; re-inspect",
    status: "Open" as const,
  },
];

const incidentTypeColor: Record<string, string> = {
  "Near Miss": "bg-amber-100 text-amber-700",
  "First Aid": "bg-yellow-100 text-yellow-700",
  LTI: "bg-red-100 text-red-700",
  Fatality: "bg-red-900 text-white",
};

const incStatusColor: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "Under Investigation": "bg-blue-100 text-blue-700",
  Closed: "bg-green-100 text-green-700",
};

const permits = [
  {
    type: "Hot Work",
    issuedTo: "Steel Fixers United",
    area: "Basement B2 — welding",
    dateIssued: "2026-05-20",
    expiry: "2026-05-27",
    status: "Active" as const,
  },
  {
    type: "Work at Height",
    issuedTo: "Alhaji Masonry Services",
    area: "Scaffolding — Floor 1",
    dateIssued: "2026-05-18",
    expiry: "2026-05-25",
    status: "Expired" as const,
  },
  {
    type: "Excavation",
    issuedTo: "JBN Construction",
    area: "Trench — Grid A",
    dateIssued: "2026-05-22",
    expiry: "2026-06-05",
    status: "Active" as const,
  },
  {
    type: "Confined Space",
    issuedTo: "MEP Team",
    area: "Basement B2 — sump pit",
    dateIssued: "2026-05-10",
    expiry: "2026-05-17",
    status: "Closed" as const,
  },
];

const permitStatusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Expired: "bg-red-100 text-red-700",
  Closed: "bg-gray-100 text-gray-600",
};

const audits = [
  {
    date: "2026-05-18",
    area: "Site-wide",
    auditor: "Diana Park",
    finding: "PPE compliance 94%; 3 violations noted",
    severity: "Low" as const,
    responsible: "Foreman",
    targetClose: "2026-05-25",
    status: "Closed" as const,
  },
  {
    date: "2026-05-21",
    area: "Scaffolding — East Wing",
    auditor: "James Okafor",
    finding: "Missing guardrails on level 2 platform",
    severity: "High" as const,
    responsible: "Alhaji Masonry",
    targetClose: "2026-05-24",
    status: "Open" as const,
  },
  {
    date: "2026-05-24",
    area: "Chemical Storage",
    auditor: "Sarah Adeyemi",
    finding: "Incomplete SDS register",
    severity: "Medium" as const,
    responsible: "Store Keeper",
    targetClose: "2026-06-01",
    status: "In Progress" as const,
  },
];

const severityColor: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};

const auditStatusColor: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Closed: "bg-green-100 text-green-700",
};

const drills = [
  {
    type: "Fire Evacuation",
    date: "2026-04-15",
    participants: "45",
    outcome: "Evacuation complete in 4:30 min (target 5:00)",
    lessonsLearned: "Stairwell signage needs improvement",
  },
  {
    type: "First Aid Response",
    date: "2026-03-20",
    participants: "12",
    outcome: "All first aiders demonstrated correct CPR technique",
    lessonsLearned: "AED refresher needed for 3 staff",
  },
  {
    type: "Spill Containment",
    date: "2026-05-10",
    participants: "8",
    outcome: "Chemical spill simulated; response team activated within 3 min",
    lessonsLearned: "Spill kit location should be better marked",
  },
];

const hseColor: Record<string, string> = {
  Valid: "bg-green-100 text-green-700",
  "Expiring Soon": "bg-amber-100 text-amber-700",
  Expired: "bg-red-100 text-red-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function HSEPage() {
  const { getNextId } = useNumbering();
  const { id } = useParams();
  const project = id ? getProjectById(id) : undefined;
  const [activeTab, setActiveTab] = useState<HSETab>("toolbox");
  const [showToolboxModal, setShowToolboxModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [localToolboxTalks, setLocalToolboxTalks] = useState(toolboxTalks);
  const [localIncidents, setLocalIncidents] = useState(incidents);
  const [localPermits, setLocalPermits] = useState(permits);
  const [localAudits, setLocalAudits] = useState(audits);
  const [localDrills, setLocalDrills] = useState(drills);
  const [localMatrix, setLocalMatrix] = useState(
    hseMatrix.filter((m) => m.projectId === id),
  );
  const [staffList, setStaffList] = useState<string[]>([]);

  // Load employees for personnel dropdowns.
  useEffect(() => {
    let active = true;
    fetchEmployees({ status: "active" })
      .then((employees) => {
        if (!active) return;
        setStaffList(
          employees
            .map((e) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim())
            .filter(Boolean),
        );
      })
      .catch(() => {
        /* leave dropdowns empty on failure */
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    listHseRecords(id)
      .then((data) => {
        if (active && data.length > 0) setLocalMatrix(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);

  const matrixData = localMatrix;
  const [tbForm, setTbForm] = useState({
    date: "",
    topic: "",
    facilitator: "",
    attendees: "",
    notes: "",
  });
  const [incForm, setIncForm] = useState({
    date: "",
    type: "Near Miss" as string,
    description: "",
    person: "",
    wp: "",
    rootCause: "",
    correctiveAction: "",
    status: "Open" as string,
  });
  const [permitForm, setPermitForm] = useState({
    type: "",
    issuedTo: "",
    area: "",
    dateIssued: "",
    expiry: "",
    status: "Active" as string,
  });
  const [auditForm, setAuditForm] = useState({
    date: "",
    area: "",
    auditor: "",
    finding: "",
    severity: "Low" as string,
    responsible: "",
    targetClose: "",
    status: "Open" as string,
  });
  const [drillForm, setDrillForm] = useState({
    type: "",
    date: "",
    participants: "",
    outcome: "",
    lessonsLearned: "",
  });
  const [compForm, setCompForm] = useState({
    staffMember: "",
    competency: "",
    dateObtained: "",
    expiryDate: "",
    status: "Valid" as string,
  });

  const projectTasks = id
    ? [
        "WP-001",
        "WP-002",
        "WP-003",
        "WP-004",
        "WP-005",
        "WP-006",
        "WP-007",
        "WP-008",
        "WP-009",
        "WP-010",
      ]
    : [];

  function addToolboxTalk() {
    setLocalToolboxTalks((prev) => [
      ...prev,
      {
        ...tbForm,
        date: tbForm.date || new Date().toISOString().split("T")[0],
      },
    ]);
    setShowToolboxModal(false);
    setTbForm({
      date: "",
      topic: "",
      facilitator: "",
      attendees: "",
      notes: "",
    });
  }
  function addIncident() {
    setLocalIncidents((prev) => [
      ...prev,
      {
        id: getNextId("Incident"),
        date: incForm.date || new Date().toISOString().split("T")[0],
        type: incForm.type as any,
        description: incForm.description,
        person: incForm.person,
        wp: incForm.wp,
        rootCause: incForm.rootCause,
        correctiveAction: incForm.correctiveAction,
        status: incForm.status as any,
      },
    ]);
    setShowIncidentModal(false);
    setIncForm({
      date: "",
      type: "Near Miss",
      description: "",
      person: "",
      wp: "",
      rootCause: "",
      correctiveAction: "",
      status: "Open",
    });
  }
  function addPermit() {
    setLocalPermits((prev) => [
      ...prev,
      {
        type: permitForm.type,
        issuedTo: permitForm.issuedTo,
        area: permitForm.area,
        dateIssued:
          permitForm.dateIssued || new Date().toISOString().split("T")[0],
        expiry: permitForm.expiry,
        status: permitForm.status as any,
      },
    ]);
    setShowPermitModal(false);
    setPermitForm({
      type: "",
      issuedTo: "",
      area: "",
      dateIssued: "",
      expiry: "",
      status: "Active",
    });
  }
  function addAudit() {
    setLocalAudits((prev) => [
      ...prev,
      {
        date: auditForm.date || new Date().toISOString().split("T")[0],
        area: auditForm.area,
        auditor: auditForm.auditor,
        finding: auditForm.finding,
        severity: auditForm.severity as any,
        responsible: auditForm.responsible,
        targetClose: auditForm.targetClose,
        status: auditForm.status as any,
      },
    ]);
    setShowAuditModal(false);
    setAuditForm({
      date: "",
      area: "",
      auditor: "",
      finding: "",
      severity: "Low",
      responsible: "",
      targetClose: "",
      status: "Open",
    });
  }
  function addDrill() {
    setLocalDrills((prev) => [
      ...prev,
      {
        type: drillForm.type,
        date: drillForm.date || new Date().toISOString().split("T")[0],
        participants: drillForm.participants,
        outcome: drillForm.outcome,
        lessonsLearned: drillForm.lessonsLearned,
      },
    ]);
    setShowDrillModal(false);
    setDrillForm({
      type: "",
      date: "",
      participants: "",
      outcome: "",
      lessonsLearned: "",
    });
  }
  function addCompetency() {
    const record = {
      projectId: id || "",
      staffMember: compForm.staffMember,
      competency: compForm.competency,
      dateObtained: compForm.dateObtained,
      expiryDate: compForm.expiryDate,
      status: compForm.status,
    };
    createHseRecord(record as any)
      .then((saved) => setLocalMatrix((prev) => [...prev, saved]))
      .catch(() =>
        setLocalMatrix((prev) => [
          ...prev,
          {
            id: getNextId("HSERecord"),
            ...record,
            status: compForm.status as any,
          },
        ]),
      );
    setShowCompetencyModal(false);
    setCompForm({
      staffMember: "",
      competency: "",
      dateObtained: "",
      expiryDate: "",
      status: "Valid",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Health, Safety & Environment
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {project ? project.name : "HSE management"}
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-orange-600 text-orange-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbox Talks */}
      {activeTab === "toolbox" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Toolbox Talks
            </h3>
            <button
              onClick={() => setShowToolboxModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Talk
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Date", "Topic", "Facilitator", "Attendees", "Notes"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {localToolboxTalks.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(t.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {t.topic}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.facilitator}</td>
                    <td className="px-4 py-3 text-gray-600">{t.attendees}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[240px] truncate">
                      {t.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incident Log */}
      {activeTab === "incidents" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Incident Log
            </h3>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Report Incident
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Incident ID",
                    "Date",
                    "Type",
                    "Description",
                    "Person",
                    "Work Package",
                    "Root Cause",
                    "Corrective Action",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {localIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-orange-600 font-medium">
                      {inc.id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(inc.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={inc.type}
                        className={incidentTypeColor[inc.type]}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate">
                      {inc.description}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inc.person}</td>
                    <td className="px-4 py-3 text-gray-600">{inc.wp}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {inc.rootCause}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {inc.correctiveAction}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={inc.status}
                        className={incStatusColor[inc.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permits to Work */}
      {activeTab === "permits" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Permits to Work
            </h3>
            <button
              onClick={() => setShowPermitModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Issue Permit
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Permit Type",
                    "Issued To",
                    "Area",
                    "Date Issued",
                    "Expiry",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {localPermits.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge
                        label={p.type}
                        className="bg-blue-50 text-blue-700"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {p.issuedTo}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.area}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(p.dateIssued)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(p.expiry)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={p.status}
                        className={permitStatusColor[p.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HSE Audits & Inspections */}
      {activeTab === "audits" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              HSE Audits & Inspections
            </h3>
            <button
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> New Audit
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Date",
                    "Area",
                    "Auditor",
                    "Finding",
                    "Severity",
                    "Responsible",
                    "Target Close",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {localAudits.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(a.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {a.area}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.auditor}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate">
                      {a.finding}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={a.severity}
                        className={severityColor[a.severity]}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.responsible}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(a.targetClose)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={a.status}
                        className={auditStatusColor[a.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emergency Drills */}
      {activeTab === "drills" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Emergency Drills
            </h3>
            <button
              onClick={() => setShowDrillModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule Drill
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Drill Type",
                    "Date",
                    "Participants",
                    "Outcome",
                    "Lessons Learned",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {localDrills.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge
                        label={d.type}
                        className="bg-purple-50 text-purple-700"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(d.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.participants}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[280px] truncate">
                      {d.outcome}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[240px] truncate">
                      {d.lessonsLearned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HSE Competency Matrix */}
      {activeTab === "competency" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              HSE Competency Matrix
            </h3>
            <button
              onClick={() => setShowCompetencyModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Record
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Staff",
                    "Competency",
                    "Date Obtained",
                    "Expiry",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No competency records for this project
                    </td>
                  </tr>
                ) : (
                  matrixData.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {m.staffMember}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {m.competency}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(m.dateObtained)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(m.expiryDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={m.status}
                          className={hseColor[m.status]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Toolbox Talk Modal */}
      {showToolboxModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowToolboxModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Add Toolbox Talk
              </h3>
              <button
                onClick={() => setShowToolboxModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={tbForm.date}
                  onChange={(e) =>
                    setTbForm({ ...tbForm, date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Topic
                </label>
                <input
                  value={tbForm.topic}
                  onChange={(e) =>
                    setTbForm({ ...tbForm, topic: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Safe Lifting"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Facilitator
                </label>
                <select
                  value={tbForm.facilitator}
                  onChange={(e) =>
                    setTbForm({ ...tbForm, facilitator: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {staffList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Attendees
                </label>
                <input
                  value={tbForm.attendees}
                  onChange={(e) =>
                    setTbForm({ ...tbForm, attendees: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 24"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  value={tbForm.notes}
                  onChange={(e) =>
                    setTbForm({ ...tbForm, notes: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowToolboxModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addToolboxTalk}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: "#E8973A" }}
              >
                Add Talk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowIncidentModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-lg mx-4 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Report Incident
              </h3>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={incForm.date}
                    onChange={(e) =>
                      setIncForm({ ...incForm, date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Type
                  </label>
                  <select
                    value={incForm.type}
                    onChange={(e) =>
                      setIncForm({ ...incForm, type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option>Near Miss</option>
                    <option>First Aid</option>
                    <option>LTI</option>
                    <option>Fatality</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={incForm.description}
                  onChange={(e) =>
                    setIncForm({ ...incForm, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Person Involved
                  </label>
                  <input
                    value={incForm.person}
                    onChange={(e) =>
                      setIncForm({ ...incForm, person: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Work Package
                  </label>
                  <select
                    value={incForm.wp}
                    onChange={(e) =>
                      setIncForm({ ...incForm, wp: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {projectTasks.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Root Cause
                </label>
                <input
                  value={incForm.rootCause}
                  onChange={(e) =>
                    setIncForm({ ...incForm, rootCause: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Corrective Action
                </label>
                <input
                  value={incForm.correctiveAction}
                  onChange={(e) =>
                    setIncForm({ ...incForm, correctiveAction: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={incForm.status}
                  onChange={(e) =>
                    setIncForm({ ...incForm, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option>Open</option>
                  <option>Under Investigation</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowIncidentModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addIncident}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: "#E8973A" }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permit Modal */}
      {showPermitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPermitModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Issue Permit
              </h3>
              <button
                onClick={() => setShowPermitModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Permit Type
                  </label>
                  <select
                    value={permitForm.type}
                    onChange={(e) =>
                      setPermitForm({ ...permitForm, type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option>Hot Work</option>
                    <option>Work at Height</option>
                    <option>Excavation</option>
                    <option>Confined Space</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Issued To
                  </label>
                  <input
                    value={permitForm.issuedTo}
                    onChange={(e) =>
                      setPermitForm({ ...permitForm, issuedTo: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Area
                </label>
                <input
                  value={permitForm.area}
                  onChange={(e) =>
                    setPermitForm({ ...permitForm, area: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date Issued
                  </label>
                  <input
                    type="date"
                    value={permitForm.dateIssued}
                    onChange={(e) =>
                      setPermitForm({
                        ...permitForm,
                        dateIssued: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Expiry
                  </label>
                  <input
                    type="date"
                    value={permitForm.expiry}
                    onChange={(e) =>
                      setPermitForm({ ...permitForm, expiry: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={permitForm.status}
                  onChange={(e) =>
                    setPermitForm({ ...permitForm, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option>Active</option>
                  <option>Expired</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowPermitModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addPermit}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: "#E8973A" }}
              >
                Issue Permit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAuditModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                New HSE Audit
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={auditForm.date}
                    onChange={(e) =>
                      setAuditForm({ ...auditForm, date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Area
                  </label>
                  <input
                    value={auditForm.area}
                    onChange={(e) =>
                      setAuditForm({ ...auditForm, area: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Auditor
                </label>
                <select
                  value={auditForm.auditor}
                  onChange={(e) =>
                    setAuditForm({ ...auditForm, auditor: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {staffList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Finding
                </label>
                <textarea
                  value={auditForm.finding}
                  onChange={(e) =>
                    setAuditForm({ ...auditForm, finding: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Severity
                  </label>
                  <select
                    value={auditForm.severity}
                    onChange={(e) =>
                      setAuditForm({ ...auditForm, severity: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Responsible
                  </label>
                  <input
                    value={auditForm.responsible}
                    onChange={(e) =>
                      setAuditForm({
                        ...auditForm,
                        responsible: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Target Close
                  </label>
                  <input
                    type="date"
                    value={auditForm.targetClose}
                    onChange={(e) =>
                      setAuditForm({
                        ...auditForm,
                        targetClose: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={auditForm.status}
                    onChange={(e) =>
                      setAuditForm({ ...auditForm, status: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Closed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addAudit}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: "#E8973A" }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill Modal */}
      {showDrillModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDrillModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Schedule Emergency Drill
              </h3>
              <button
                onClick={() => setShowDrillModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Drill Type
                  </label>
                  <select
                    value={drillForm.type}
                    onChange={(e) =>
                      setDrillForm({ ...drillForm, type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option>Fire Evacuation</option>
                    <option>First Aid Response</option>
                    <option>Spill Containment</option>
                    <option>Earthquake Drill</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={drillForm.date}
                    onChange={(e) =>
                      setDrillForm({ ...drillForm, date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Participants
                </label>
                <input
                  value={drillForm.participants}
                  onChange={(e) =>
                    setDrillForm({ ...drillForm, participants: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 45"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Outcome
                </label>
                <textarea
                  value={drillForm.outcome}
                  onChange={(e) =>
                    setDrillForm({ ...drillForm, outcome: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lessons Learned
                </label>
                <textarea
                  value={drillForm.lessonsLearned}
                  onChange={(e) =>
                    setDrillForm({
                      ...drillForm,
                      lessonsLearned: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowDrillModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addDrill}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: "#E8973A" }}
              >
                Schedule Drill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competency Record Modal */}
      {showCompetencyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCompetencyModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Add Competency Record
              </h3>
              <button
                onClick={() => setShowCompetencyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Staff Member
                </label>
                <select
                  value={compForm.staffMember}
                  onChange={(e) =>
                    setCompForm({ ...compForm, staffMember: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {staffList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Competency
                </label>
                <select
                  value={compForm.competency}
                  onChange={(e) =>
                    setCompForm({ ...compForm, competency: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option>First Aid at Work</option>
                  <option>Fire Marshal Training</option>
                  <option>Working at Height</option>
                  <option>Confined Space</option>
                  <option>IOSH Managing Safely</option>
                  <option>NEBOSH Certificate</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date Obtained
                  </label>
                  <input
                    type="date"
                    value={compForm.dateObtained}
                    onChange={(e) =>
                      setCompForm({ ...compForm, dateObtained: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={compForm.expiryDate}
                    onChange={(e) =>
                      setCompForm({ ...compForm, expiryDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={compForm.status}
                  onChange={(e) =>
                    setCompForm({ ...compForm, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option>Valid</option>
                  <option>Expiring Soon</option>
                  <option>Expired</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowCompetencyModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addCompetency}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: "#E8973A" }}
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
