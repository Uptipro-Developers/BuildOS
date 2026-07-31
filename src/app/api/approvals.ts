import { apiFetch } from "./client";

export interface ApprovalFlowTierLevel {
    level: number;
    approver: string;
    condition: string;
}

export interface ApprovalFlow {
    workflowType: "single" | "group" | "tier";
    approvers: string[];
    tierLevels?: ApprovalFlowTierLevel[];
}

export interface ApprovalItem {
    id: string;
    module: string;
    type: string;
    title: string;
    project: string;
    requestedBy: string;
    date: string;
    amount?: number;
    status: "pending" | "approved" | "rejected";
    urgency: "normal" | "urgent";
    description: string;
    approvalFlow?: ApprovalFlow | null;
    /**
     * Whether the signed-in user may decide this item, per the Workflow Approval
     * configuration. Stamped per row by the server, so a queue listing the whole
     * company's items still shows approval controls only where they are allowed.
     * Absent on an older API response, which is treated as not allowed.
     */
    canApprove?: boolean;
    /** Whether the signed-in user raised this item; a requester never decides it. */
    isRequester?: boolean;
}

/**
 * Approval items. `mine` restricts the result to items whose configured workflow
 * names the caller as an approver, resolved server-side from the session.
 */
export function getApprovals(module?: string, mine?: boolean) {
    const params = new URLSearchParams();
    if (module) params.set("module", module);
    if (mine) params.set("mine", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApprovalItem[]>(`/admin/approvals${query}`);
}

export function approveItem(id: string, notes?: string) {
    return apiFetch<ApprovalItem>(`/admin/approvals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', notes }),
    });
}

export function rejectItem(id: string, reason?: string) {
    return apiFetch<ApprovalItem>(`/admin/approvals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', reason }),
    });
}
