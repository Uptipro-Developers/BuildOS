import { createActivityRecord } from "../api/activity-history";

/**
 * Records a user action to Activity History (the ESS → Activity History page
 * reads these, filtered to the signed-in user).
 *
 * Best-effort by design: a logging failure must never break the action it
 * observes, so the write is fire-and-forget and any error is swallowed.
 */
export function logActivity(input: {
  action: string;
  module: string;
  description?: string;
}): void {
  let userId = "";
  let userName = "";
  try {
    const raw = localStorage.getItem("auth_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      userId = parsed?.id ?? "";
      userName = parsed?.name ?? "";
    }
  } catch {
    // ignore — fall back to an anonymous label below
  }

  void createActivityRecord({
    userId: userId || undefined,
    userName: userName || "Employee",
    action: input.action,
    module: input.module,
    description: input.description,
  }).catch(() => undefined);
}
