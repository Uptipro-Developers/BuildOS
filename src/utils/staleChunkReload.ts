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
 *
 * This depends on the rewrite rule in vercel.json, whose SPA catch-all
 * deliberately excludes /assets via a negative lookahead: `/((?!assets/).*)`.
 * Client-side routing needs the catch-all, but it was also swallowing missing
 * build assets — answering a gone chunk with index.html is what made the browser
 * report "'text/html' is not a valid JavaScript MIME type", since it asked for a
 * module and got HTML. Excluding /assets keeps a missing chunk a real 404, which
 * is what isStaleChunkError below detects. A self-rewrite
 * (/assets/(.*) -> /assets/$1) does NOT work as a substitute: it is a no-op and
 * the catch-all still applies. vercel.json cannot carry this note itself — its
 * schema rejects a "//" comment key.
 */

const RELOAD_FLAG = "buildos_stale_chunk_reloaded";

/**
 * Whether a rejection looks like a chunk that no longer exists.
 *
 * Browsers word this failure very differently, and each engine has more than one
 * message depending on whether the fetch failed outright or returned the wrong
 * content type. The first version of this list missed
 * "'text/html' is not a valid JavaScript MIME type" — the exact message the app
 * threw in production — so the patterns below are deliberately broad, and the
 * MIME-type family is matched generically rather than per-engine.
 *
 * A false positive costs one page reload, guarded against looping; a false
 * negative leaves the user stranded on an error screen. Erring wide is right.
 */
function isStaleChunkError(reason: unknown): boolean {
  const message =
    reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason ?? "");

  return (
    // Fetch failed or the module could not be evaluated.
    /dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Failed to load module script/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    // The response arrived but was not JavaScript — what an SPA catch-all
    // rewrite produces when it answers a missing chunk with index.html.
    // Chrome: "Failed to load module script: Expected a JavaScript module script
    // but the server responded with a MIME type of \"text/html\"."
    // Safari: "'text/html' is not a valid JavaScript MIME type."
    /is not a valid JavaScript MIME type/i.test(message) ||
    /MIME type of "?text\/html/i.test(message) ||
    /expected a JavaScript(-or-Wasm)? module/i.test(message) ||
    // Parsing index.html as a module.
    /Unexpected token '<'/i.test(message)
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
