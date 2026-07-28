import { useState, useEffect } from "react";

export type ApprovalType = "single" | "group" | "tier";

export interface TierLevel {
  level: number;
  approver: string;
  condition: string;
}

export interface ProcessWorkflow {
  id: string;
  process: string;
  app: string;
  workflowType: ApprovalType;
  approver?: string;
  groupApprovers?: string[];
  tierLevels?: TierLevel[];
}

export interface PipelineStep {
  label: string;
  actor?: string;
  status: "completed" | "active" | "pending" | "rejected";
  date?: string;
  note?: string;
}

interface WorkflowConfig {
  workflows: ProcessWorkflow[];
}

const DEFAULT_PROCESSES: {
  label: string;
  app: string;
  requiresApproval: boolean;
}[] = [
  { label: "Request Material", app: "ESS", requiresApproval: true },
  { label: "Submit Expense", app: "ESS", requiresApproval: true },
  { label: "Request Leave", app: "ESS", requiresApproval: true },
  { label: "Report Issue", app: "ESS", requiresApproval: true },
  { label: "Request Change", app: "ESS", requiresApproval: true },
];

export function getPipelineForRequest(
  requestType: string,
  workflows: ProcessWorkflow[],
): PipelineStep[] {
  const processLabel = {
    finance: "Submit Expense",
    leave: "Request Leave",
    issue: "Report Issue",
    change: "Request Change",
    material: "Request Material",
  }[requestType];

  if (!processLabel) return [];

  const wf = workflows.find((w) => w.process === processLabel);
  if (!wf) return defaultPipeline(processLabel);

  if (wf.workflowType === "single" && wf.approver) {
    return [
      { label: "Submit Request", actor: "You", status: "completed" },
      { label: "Approval", actor: wf.approver, status: "active" },
      { label: "Complete", status: "pending" },
    ];
  }

  if (wf.workflowType === "tier" && wf.tierLevels) {
    const steps: PipelineStep[] = [
      { label: "Submit Request", actor: "You", status: "completed" },
    ];
    wf.tierLevels.forEach((tl, i) => {
      steps.push({
        label: `Level ${tl.level} Approval`,
        actor: tl.approver,
        status: i === 0 ? "active" : "pending",
        note: tl.condition || undefined,
      });
    });
    steps.push({ label: "Complete", status: "pending" });
    return steps;
  }

  if (wf.workflowType === "group" && wf.groupApprovers) {
    return [
      { label: "Submit Request", actor: "You", status: "completed" },
      {
        label: "Group Review",
        actor: wf.groupApprovers.join(", "),
        status: "active",
      },
      { label: "Complete", status: "pending" },
    ];
  }

  return defaultPipeline(processLabel);
}

function defaultPipeline(processLabel: string): PipelineStep[] {
  const steps: Record<string, PipelineStep[]> = {
    "Request Material": [
      { label: "Request Submitted", actor: "You", status: "completed" },
      { label: "Team Lead Review", status: "active" },
      { label: "Store Manager", status: "pending" },
      { label: "Material Issued", status: "pending" },
    ],
    "Submit Expense": [
      { label: "Request Submitted", actor: "You", status: "completed" },
      { label: "Finance Review", status: "active" },
      { label: "CFO Approval", status: "pending" },
      { label: "Paid", status: "pending" },
    ],
    "Request Leave": [
      { label: "Request Submitted", actor: "You", status: "completed" },
      { label: "Line Manager", status: "active" },
      { label: "HR Review", status: "pending" },
      { label: "Approved", status: "pending" },
    ],
    "Report Issue": [
      { label: "Issue Reported", actor: "You", status: "completed" },
      { label: "Initial Review", status: "active" },
      { label: "Resolution", status: "pending" },
      { label: "Closed", status: "pending" },
    ],
    "Request Change": [
      { label: "Change Requested", actor: "You", status: "completed" },
      { label: "Impact Assessment", status: "active" },
      { label: "Change Board Review", status: "pending" },
      { label: "Implemented", status: "pending" },
    ],
  };
  return (
    steps[processLabel] ?? [
      { label: "Submitted", actor: "You", status: "completed" },
      { label: "Pending Review", status: "active" },
      { label: "Approved", status: "pending" },
    ]
  );
}

let _config: WorkflowConfig = {
  workflows: [],
};

const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((l) => l());
}

export function getWorkflows(): ProcessWorkflow[] {
  return _config.workflows;
}

export function setWorkflows(workflows: ProcessWorkflow[]) {
  _config = { workflows };
  notify();
}

export function addWorkflow(wf: ProcessWorkflow) {
  setWorkflows([..._config.workflows, wf]);
}

export function useWorkflows(): { workflows: ProcessWorkflow[] } {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  return { workflows: _config.workflows };
}

export { DEFAULT_PROCESSES };
