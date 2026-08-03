import { toast } from "sonner";

/**
 * Reports a failed page load.
 *
 * Load failures used to be swallowed by `.catch(console.error)`: a page whose
 * data never arrived rendered as empty, which is indistinguishable from a page
 * that genuinely has no records. "No purchase orders yet" and "the server did
 * not answer" are very different things to show someone.
 *
 * Toasting each failure directly would be worse than silence, though — several
 * pages fire four or five loads in parallel, so one unreachable API would stack
 * five identical toasts on arrival. Everything reported here collapses into a
 * single toast: sonner replaces rather than stacks when an id is reused, and
 * once more than one thing has failed the message drops the specific label,
 * because at that point the problem is the connection rather than any one list.
 */

const TOAST_ID = "load-failure";
/** Labels that have failed in the current burst. */
const failed = new Set<string>();
let resetTimer: ReturnType<typeof setTimeout> | undefined;

export function notifyLoadFailure(label: string, error?: unknown): void {
  // Keep the detail in the console — this replaces `console.error`, it does not
  // discard what that gave a developer.
  if (error !== undefined) console.error(`Failed to load ${label}:`, error);

  failed.add(label);

  toast.error(
    failed.size === 1
      ? `Could not load ${label}.`
      : "Could not load some of this page's data.",
    {
      id: TOAST_ID,
      description:
        failed.size === 1
          ? "It may not be up to date. Refresh to try again."
          : `Affected: ${[...failed].join(", ")}. Refresh to try again.`,
    },
  );

  // The burst is per page-load, not for the life of the session: a later
  // failure after the user has moved on should name itself again.
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => failed.clear(), 5000);
}
