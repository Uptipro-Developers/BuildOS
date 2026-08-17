/**
 * The one place the API base URL is decided — every other file (client.ts,
 * authSession.ts, the login/activate/reset-password flows that fetch before
 * a token exists) imports this instead of repeating its own copy of the
 * fallback. Five separate copies of the same ternary is how a URL gets
 * updated in four of them and left stale in the fifth.
 *
 * Resolution order:
 *   1. `VITE_API_URL`, if set — this is what should actually distinguish
 *      Local / Staging / Production. Set it per Vercel environment
 *      (Project Settings → Environment Variables → scope to Production or
 *      Preview) so each deployment points at its own Railway API without
 *      any code change or branch here.
 *   2. Local dev server (`vite dev`) falls back to the local backend.
 *   3. Anything else (a deployed build with no VITE_API_URL configured)
 *      falls back to Production — a safe, working default, but relying on
 *      it for Staging means Staging is silently talking to the Production
 *      API. Set VITE_API_URL on the Preview environment in Vercel so this
 *      fallback is never actually reached there.
 */
// const EXPLICIT_API_URL = import.meta.env.VITE_API_URL;
const URL = window.location.href;
const FALLBACK_API_URL = import.meta.env.DEV
  ? "http://localhost:3001/api"
  : URL.includes('development') ? 'https://buildos-staging.up.railway.app/api' : "https://buildos-production-e328.up.railway.app/api";

// console.log(FALLBACK_API_URL, URL, EXPLICIT_API_URL)
// export const API_BASE_URL = (EXPLICIT_API_URL || FALLBACK_API_URL).replace(/\/$/, "");
export const API_BASE_URL = (FALLBACK_API_URL).replace(/\/$/, "");
