import { useParams } from "react-router";
import { useState, useEffect } from "react";
import {
  CheckSquare,
  AlertTriangle,
  FileText,
  ClipboardList,
  Beaker,
  XCircle,
  Plus,
} from "lucide-react";
import { getProjectById, qualityNCRs, fmtDate } from "./mockData";
import type { QualityNCR } from "./types";
import { listQualityNcrs, createQualityNcr } from "../../api/quality-ncrs";
import { getAuthUserName } from "../../utils/useAuthUser";
import { useNumbering } from "../../stores/numberingStore";

type QATab = "compliance" | "inspections" | "ncrs" | "capa" | "schedule";

const subTabs: { id: QATab; label: string; icon: React.ReactNode }[] = [
  {
    id: "compliance",
    label: "QA Compliance Monitor",
    icon: <CheckSquare className="w-4 h-4" />,
  },
  {
    id: "inspections",
    label: "QC Inspections",
    icon: <ClipboardList className="w-4 h-4" />,
  },
  { id: "ncrs", label: "NCRs", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "capa", label: "CAPA", icon: <FileText className="w-4 h-4" /> },
  {
    id: "schedule",
    label: "Test & Inspection Schedule",
    icon: <Beaker className="w-4 h-4" />,
  },
];

const qaActivities = [
  {
    activity: "Concrete pour inspection — Column C12",
    plannedDate: "2026-05-20",
    responsible: "Emeka Okafor",
    compliance: "Compliant" as const,
    notes: "Slump test passed, sampling done",
  },
  {
    activity: "Steel reinforcement check — Grid B",
    plannedDate: "2026-05-22",
    responsible: "QAQC Officer",
    compliance: "Compliant" as const,
    notes: "Spacing & laps verified",
  },
  {
    activity: "Waterproofing inspection — Basement B2",
    plannedDate: "2026-05-25",
    responsible: "Sarah Adeyemi",
    compliance: "Non-Compliant" as const,
    notes: "Membrane lapping insufficient",
  },
  {
    activity: "Blockwork quality audit — Floor 1",
    plannedDate: "2026-05-28",
    responsible: "James Okafor",
    compliance: "Pending" as const,
    notes: "Awaiting completion",
  },
  {
    activity: "Plumbing pressure test — Zone A",
    plannedDate: "2026-06-01",
    responsible: "Tunde Balogun",
    compliance: "Pending" as const,
    notes: "Scheduled",
  },
];

const complianceColor: Record<string, string> = {
  Compliant: "bg-green-100 text-green-700",
  "Non-Compliant": "bg-red-100 text-red-700",
  Pending: "bg-amber-100 text-amber-700",
};

const inspections = [
  {
    type: "Visual",
    date: "2026-05-20",
    wp: "WP-004 — Concrete pour",
    inspector: "Emeka Okafor",
    finding: "Honeycombing on column face",
    result: "Fail" as const,
    followup: "Grout repair and re-inspect",
  },
  {
    type: "Dimensional",
    date: "2026-05-22",
    wp: "WP-003 — Steel fixing",
    inspector: "QAQC Officer",
    finding: "All dimensions within tolerance",
    result: "Pass" as const,
    followup: "",
  },
  {
    type: "Material Test",
    date: "2026-05-24",
    wp: "WP-004 — Concrete",
    inspector: "Lab Technician",
    finding: "Cube strength 28.2 MPa (spec 30 MPa)",
    result: "Fail" as const,
    followup: "Core drill and test",
  },
  {
    type: "Meeting",
    date: "2026-05-26",
    wp: "All packages",
    inspector: "Project Manager",
    finding: "QA procedures reviewed and updated",
    result: "Pass" as const,
    followup: "Document revision",
  },
];

const passFailColor: Record<string, string> = {
  Pass: "bg-green-100 text-green-700",
  Fail: "bg-red-100 text-red-700",
};

const ncrStatusColor: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Closed: "bg-green-100 text-green-700",
};

const capas = [
  {
    type: "Corrective" as const,
    description: "Grout repair for honeycombing on column C12",
    linkedNCR: "NCR-0023",
    responsible: "Emeka Okafor",
    targetDate: "2026-06-05",
    status: "In Progress" as const,
  },
  {
    type: "Corrective" as const,
    description: "Revise concrete mix design for columns",
    linkedNCR: "NCR-0023",
    responsible: "QAQC Officer",
    targetDate: "2026-06-10",
    status: "Open" as const,
  },
  {
    type: "Preventive" as const,
    description: "Additional slump testing for all pours",
    linkedNCR: "-",
    responsible: "Lab Team",
    targetDate: "2026-06-01",
    status: "Closed" as const,
  },
];

const capaStatusColor: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Closed: "bg-green-100 text-green-700",
};

const testSchedule = [
  {
    material: "Concrete Cube — Column C12",
    testType: "Compressive Strength (28d)",
    recommended: "Yes" as const,
    planned: "2026-05-20",
    actual: "2026-05-20",
    result: "28.2 MPa",
    passFail: "Fail" as const,
  },
  {
    material: "Concrete Cube — Slab S05",
    testType: "Compressive Strength (28d)",
    recommended: "Yes" as const,
    planned: "2026-06-01",
    actual: "",
    result: "",
    passFail: null,
  },
  {
    material: "Fine Aggregate",
    testType: "Sieve Analysis",
    recommended: "Yes" as const,
    planned: "2026-05-15",
    actual: "2026-05-15",
    result: "Fineness Modulus 2.6",
    passFail: "Pass" as const,
  },
  {
    material: "Steel Rebars Y16",
    testType: "Tensile Strength",
    recommended: "Yes" as const,
    planned: "2026-05-10",
    actual: "2026-05-12",
    result: "560 MPa (spec 500 min)",
    passFail: "Pass" as const,
  },
  {
    material: "Waterproofing Membrane",
    testType: "Adhesion Test",
    recommended: "No" as const,
    planned: "2026-05-25",
    actual: "",
    result: "",
    passFail: null,
  },
];

const yesNoColor: Record<string, string> = {
  Yes: "bg-green-100 text-green-700",
  No: "bg-gray-100 text-gray-600",
};

function NCRModal({
  onClose,
  projectId,
}: {
  onClose: (ncr: QualityNCR | null) => void;
  projectId: string;
}) {
  const { getNextId } = useNumbering();
  const [form, setForm] = useState({
    description: "",
    taskId: "",
    raisedBy: "",
    correctiveAction: "",
    responsiblePerson: "",
    targetCloseDate: "",
  });
  function handleSubmit() {
    if (!form.description.trim()) return;
    const newNcr: QualityNCR = {
      id: getNextId("NonConformance"),
      projectId,
      ncrId: `NCR-${String(qualityNCRs.length + 23).padStart(4, "0")}`,
      date: new Date().toISOString().split("T")[0],
      description: form.description,
      taskId: form.taskId || "WP-001",
      raisedBy: form.raisedBy || getAuthUserName() || "Current User",
      correctiveAction: form.correctiveAction,
      responsiblePerson: form.responsiblePerson,
      targetCloseDate: form.targetCloseDate,
      status: "Open",
    };
    const { id: _omit, ...payload } = newNcr;
    createQualityNcr(payload)
      .then((saved) => onClose(saved))
      .catch(() => onClose(newNcr));
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => onClose(null)}
    >
      <div
        className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-lg mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Raise New NCR
          </h3>
          <button
            onClick={() => onClose(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Describe the non-conformance..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Work Package
              </label>
              <select
                value={form.taskId}
                onChange={(e) => setForm({ ...form, taskId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select</option>
                <option>WP-001</option>
                <option>WP-002</option>
                <option>WP-003</option>
                <option>WP-004</option>
                <option>WP-005</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Raised By
              </label>
              <input
                value={form.raisedBy}
                onChange={(e) => setForm({ ...form, raisedBy: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Name"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Corrective Action
            </label>
            <input
              value={form.correctiveAction}
              onChange={(e) =>
                setForm({ ...form, correctiveAction: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Proposed action"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Responsible Person
              </label>
              <input
                value={form.responsiblePerson}
                onChange={(e) =>
                  setForm({ ...form, responsiblePerson: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Target Close Date
              </label>
              <input
                type="date"
                value={form.targetCloseDate}
                onChange={(e) =>
                  setForm({ ...form, targetCloseDate: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onClose(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function QualityPage() {
  const { id } = useParams();
  const project = id ? getProjectById(id) : undefined;
  const [activeTab, setActiveTab] = useState<QATab>("compliance");
  const [showNCRModal, setShowNCRModal] = useState(false);
  const [ncrVersion] = useState(0);

  const [ncrData, setNcrData] = useState<QualityNCR[]>(() =>
    qualityNCRs.filter((n) => n.projectId === id),
  );
  useEffect(() => {
    if (!id) return;
    let active = true;
    listQualityNcrs(id)
      .then((data) => {
        if (active && data.length > 0) setNcrData(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);
  void ncrVersion;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Quality Management
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {project ? project.name : "Quality control & assurance"}
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
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

      {/* QA Compliance Monitor */}
      {activeTab === "compliance" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              QA Compliance Monitor
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Activity",
                    "Planned Date",
                    "Responsible Person",
                    "Compliance Status",
                    "Notes",
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
                {qaActivities.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{a.activity}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(a.plannedDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.responsible}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={a.compliance}
                        className={complianceColor[a.compliance]}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {a.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC Inspections */}
      {activeTab === "inspections" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              QC Inspections
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Inspection Type",
                    "Date",
                    "Work Package",
                    "Inspector",
                    "Finding",
                    "Result",
                    "Follow-up",
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
                {inspections.map((ins, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge
                        label={ins.type}
                        className="bg-blue-50 text-blue-700"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(ins.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ins.wp}</td>
                    <td className="px-4 py-3 text-gray-600">{ins.inspector}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {ins.finding}
                    </td>
                    <td className="px-4 py-3">
                      {ins.result && (
                        <Badge
                          label={ins.result}
                          className={passFailColor[ins.result]}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                      {ins.followup || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NCRs */}
      {activeTab === "ncrs" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Non-Conformance Records (NCRs)
            </h3>
            <button
              onClick={() => setShowNCRModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add NCR
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "NCR ID",
                    "Date",
                    "Description",
                    "Work Package",
                    "Raised By",
                    "Corrective Action",
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
                {ncrData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No NCRs recorded for this project
                    </td>
                  </tr>
                ) : (
                  ncrData.map((ncr) => (
                    <tr key={ncr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-orange-600 font-medium">
                        {ncr.ncrId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(ncr.date)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate">
                        {ncr.description}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ncr.taskId}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {ncr.raisedBy}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {ncr.correctiveAction}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ncr.responsiblePerson}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(ncr.targetCloseDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={ncr.status}
                          className={ncrStatusColor[ncr.status]}
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

      {/* CAPA */}
      {activeTab === "capa" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Corrective & Preventive Actions (CAPA)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Type",
                    "Description",
                    "Linked NCR",
                    "Responsible",
                    "Target Date",
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
                {capas.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge
                        label={c.type}
                        className={
                          c.type === "Corrective"
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-blue-700"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[280px] truncate">
                      {c.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">
                      {c.linkedNCR}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.responsible}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(c.targetDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={c.status}
                        className={capaStatusColor[c.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test & Inspection Schedule */}
      {activeTab === "schedule" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Test & Inspection Schedule
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Material / Element",
                    "Test Type",
                    "Recommended",
                    "Planned Test Date",
                    "Actual Test Date",
                    "Result",
                    "Pass/Fail",
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
                {testSchedule.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{t.material}</td>
                    <td className="px-4 py-3 text-gray-600">{t.testType}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={t.recommended}
                        className={yesNoColor[t.recommended]}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {fmtDate(t.planned)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.actual ? (
                        fmtDate(t.actual)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {t.result || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {t.passFail ? (
                        <Badge
                          label={t.passFail}
                          className={passFailColor[t.passFail]}
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNCRModal && (
        <NCRModal
          onClose={(r) => {
            setShowNCRModal(false);
            if (r) setNcrData((prev) => [...prev, r]);
          }}
          projectId={id || ""}
        />
      )}
    </div>
  );
}
