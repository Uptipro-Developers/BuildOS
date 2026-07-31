import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

/**
 * Which processes the signed-in user may approve.
 *
 * Approval rights come from the Workflow Approval configuration in Admin, which
 * names an approver per process (a single approver, a group, or a tier chain).
 * Holding the admin role is NOT what grants approval — so a page must not decide
 * whether to show Approve/Reject by inspecting the user's role. It asks here, and
 * the server answers with the same matching that decides whose approval queue an
 * item lands in.
 *
 * Failing closed is deliberate: if the lookup fails, no approval controls render.
 * An approver briefly unable to approve is recoverable; showing the button to
 * someone the configuration never named is not.
 */
export function useApprovalRights() {
  const [processIds, setProcessIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiFetch<{ processIds: string[] }>("/admin/my-approval-processes")
      .then((data) => {
        if (!alive) return;
        setProcessIds(Array.isArray(data?.processIds) ? data.processIds : []);
      })
      .catch(() => {
        if (alive) setProcessIds([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Whether the user is a configured approver for this process. */
  const canApprove = useCallback(
    (processId: string) => processIds.includes(processId),
    [processIds],
  );

  return { canApprove, approvableProcessIds: processIds, loading };
}
