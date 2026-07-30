/**
 * Recovers a session left open across a frontend deploy.
 *
 * Every route in this app is a `lazy(() => import(...))`, and Vite gives each
 * chunk a content hash. When a new build deploys, those hashes change and the old
 * files stop existing — so a tab that loaded the previous build asks for chunk
 * names that are gone the moment the user navigates. React Router surfaces that
 * as "Failed to fetch dynamically imported module" on its error boundary, and the
 * user is stuck until they happen to hard-reload.
 *
 * This reloads once, which fetches the current index.html and its current chunk
 * names. The reload is guarded by a sessionStorage flag so a genuine, persistent
 * load failure — an offline network, a broken deploy — surfaces as an error
 * instead of an infinite refresh loop.
 */

const RELOAD_FLAG = "buildos_stale_chunk_reloaded";

/** Whether a rejection looks like a chunk that no longer exists. */
function isStaleChunkError(reason: unknown): boolean {
  const message =
    reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason ?? "");

  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    // Safari's wording when the response is not JavaScript, which is what a
    // catch-all SPA rewrite produces when it answers with index.html.
    /Unexpected token '<'/i.test(message) ||
    /expected a JavaScript(-or-Wasm)? module/i.test(message)
  );
}

function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // Private mode with storage disabled — reloading once is still better than
    // leaving the user on a dead route, and without storage there is no loop
    // guard, so bail out rather than risk one.
    return false;
  }

  window.location.reload();
  return true;
}

export function installStaleChunkReload() {
  // A failed lazy route rejects a promise that nothing awaits.
  window.addEventListener("unhandledrejection", (event) => {
    if (isStaleChunkError(event.reason)) {
      event.preventDefault();
      reloadOnce();
    }
  });

  // A failed module <script> reports through error events instead.
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLScriptElement | null;
      if (target?.tagName === "SCRIPT" && target.src?.includes("/assets/")) {
        reloadOnce();
        return;
      }
      if (isStaleChunkError(event.error ?? event.message)) reloadOnce();
    },
    true,
  );

  // Once the app is running on the current build, clear the guard so a later
  // deploy in the same tab can recover too.
  window.addEventListener("load", () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      // Nothing to clear.
    }
  });
}
