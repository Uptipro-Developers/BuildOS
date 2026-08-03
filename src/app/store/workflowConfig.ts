import type { ProcessWorkflow } from "../api/admin-extras";

export interface PipelineStep {
  label: string;
  actor?: string;
  status: "completed" | "active" | "pending" | "rejected";
  date?: string;
  note?: string;
}

/**
 * ESS request type → the process id its approval workflow is configured under.
 *
 * This module used to hold its own in-memory `workflows` array that nothing ever
 * populated, so `getWorkflows()` always returned `[]` and every submitted
 * request fell through to `defaultPipeline()` — a fixed list of invented steps.
 * Whatever an admin configured under Workflow Approval was never consulted.
 *
 * It also matched on old action-grained labels ("Request Leave", "Submit
 * Expense"). The process catalogue is entity-grained now, so those labels match
 * nothing even against real data; matching is by process id, with the label kept
 * only as a fallback for a workflow saved before ids were stored.
 */
const PROCESS_FOR_REQUEST: Record<string, { id: string; label: string }> = {
  material: { id: "p_material_requests", label: "Material Requests" },
  finance: { id: "p_expenses", label: "Expenses" },
  leave: { id: "p_leave_requests", label: "Leave Requests" },
  issue: { id: "p_ess_issues", label: "Logged Issues" },
  change: { id: "p_change_requests", label: "Change Requests" },
};

/**
 * The approval pipeline shown after a request is submitted, built from the
 * workflow an admin configured for that process.
 *
 * `workflows` must be the persisted set from `/admin/process-workflows`; passing
 * an empty array yields the generic two-step pipeline rather than a fabricated
 * module-specific one, so an unconfigured process reads as unconfigured.
 */
export function getPipelineForRequest(
  requestType: string,
  workflows: ProcessWorkflow[],
): PipelineStep[] {
  const process = PROCESS_FOR_REQUEST[requestType];
  if (!process) return genericPipeline();

  const wf = workflows.find(
    (w) => w.processId === process.id || w.process === process.label,
  );
  if (!wf) return genericPipeline();

  const submitted: PipelineStep = {
    label: "Submit Request",
    actor: "You",
    status: "completed",
  };

  if (wf.workflowType === "single" && wf.approver) {
    return [
      submitted,
      { label: "Approval", actor: wf.approver, status: "active" },
      { label: "Complete", status: "pending" },
    ];
  }

  if (wf.workflowType === "tier" && wf.tierLevels?.length) {
    return [
      submitted,
      ...[...wf.tierLevels]
        .sort((a, b) => a.level - b.level)
        .map((tl, i) => ({
          label: `Level ${tl.level} Approval`,
          actor: tl.approver,
          status: (i === 0 ? "active" : "pending") as PipelineStep["status"],
          note: tl.condition || undefined,
        })),
      { label: "Complete", status: "pending" },
    ];
  }

  if (wf.workflowType === "group" && wf.groupApprovers?.length) {
    return [
      submitted,
      {
        label: "Group Review",
        actor: wf.groupApprovers.join(", "),
        status: "active",
        // An "all" group needs every approver; "any" clears on the first one.
        // Showing the same step for both misrepresented how many sign-offs the
        // request still needs.
        note:
          wf.groupApprovalMode === "all"
            ? "All approvers must approve"
            : "Any one approver may approve",
      },
      { label: "Complete", status: "pending" },
    ];
  }

  return genericPipeline();
}

/**
 * The pipeline for a process with no configured workflow. Deliberately generic:
 * the previous per-process step lists ("Team Lead Review", "Store Manager",
 * "CFO Approval") named approvers that no configuration had ever set.
 */
function genericPipeline(): PipelineStep[] {
  return [
    { label: "Submitted", actor: "You", status: "completed" },
    { label: "Pending Review", status: "active" },
    { label: "Approved", status: "pending" },
  ];
}
