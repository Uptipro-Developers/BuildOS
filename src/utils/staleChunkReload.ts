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

const RELOAD_STAMP = "buildos_stale_chunk_reload_at";

/**
 * How long after a recovery reload to refuse another one.
 *
 * The guard cannot simply be "reload at most once per tab": a tab can outlive
 * several deploys and should recover from each. It also cannot be cleared on
 * `load`, which is what an earlier version did — the failure this module exists
 * for happens on a lazy route *after* load, so clearing it there meant a
 * genuinely broken deploy (a chunk that 404s no matter how often we refetch)
 * reloaded forever. A cooldown gets both: repeat failures inside the window
 * surface as errors, and a deploy an hour later still recovers.
 */
const RELOAD_COOLDOWN_MS = 30_000;

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
    const last = Number(sessionStorage.getItem(RELOAD_STAMP)) || 0;
    if (last && Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_STAMP, String(Date.now()));
  } catch {
    // Private mode with storage disabled. Without storage there is no loop
    // guard at all, so bail out rather than risk an infinite refresh.
    return false;
  }

  window.location.reload();
  return true;
}

/**
 * Wraps a dynamic import so a stale chunk triggers the reload.
 *
 * This is the only interception point that actually works for a lazy route, and
 * the window listeners below cannot replace it:
 *
 *   - `React.lazy` attaches its own rejection handler to the promise this factory
 *     returns, so the rejection is *handled* and `unhandledrejection` never
 *     fires. React re-throws during render instead, which React Router catches
 *     and renders as "Unexpected Application Error! Importing a module script
 *     failed" — the error screen this module was supposed to prevent.
 *   - A failed `import()` is not an `HTMLScriptElement` load, so it fires no
 *     window `error` event either.
 *
 * On a match the returned promise is left permanently pending. The reload is
 * already navigating, and staying suspended keeps the user on RootLayout's
 * Suspense fallback rather than flashing an error boundary for the frame or two
 * before the page goes away. Anything that is not a stale chunk rethrows and
 * reaches the error boundary as normal.
 */
export function guardLazyImport<T>(factory: () => Promise<T>): () => Promise<T> {
  return () =>
    factory().catch((error) => {
      if (isStaleChunkError(error) && reloadOnce()) {
        return new Promise<T>(() => {});
      }
      throw error;
    });
}

export function installStaleChunkReload() {
  // Covers the entry chunk failing before any of the app runs — a lazy route
  // rejection is handled by guardLazyImport above, not here.
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
}
