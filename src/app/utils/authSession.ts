const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

type TokenPayload = {
  exp?: number;
  sub?: string;
  email?: string;
  role?: string;
};

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedApps?: string[];
  };
};

let refreshInFlight: Promise<string | null> | null = null;

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

function isExpired(token: string, skewSeconds = 10): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

export function clearAuthSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
}

export function saveAuthSession(data: {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedApps?: string[];
  };
}) {
  localStorage.setItem('auth_token', data.accessToken);
  localStorage.setItem('refresh_token', data.refreshToken);
  localStorage.setItem('auth_user', JSON.stringify(data.user));
}

export function hasValidAuthSession(): boolean {
  const token = localStorage.getItem('auth_token');
  const refreshToken = localStorage.getItem('refresh_token');
  if (!token || !refreshToken) return false;
  if (isExpired(refreshToken, 0)) return false;
  return !isExpired(token, 0) || !isExpired(refreshToken, 0);
}

const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_RETRY_BASE_DELAY_MS = 600;
const REFRESH_TIMEOUT_MS = 10_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// HTTP statuses that indicate a transient/recoverable failure where the refresh
// token is still potentially valid. The user must NOT be signed out for these —
// we retry instead, and if it keeps failing we leave the session intact so a
// later attempt (e.g. the next background check) can recover.
function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function refreshTimeoutSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(REFRESH_TIMEOUT_MS);
  }
  return undefined;
}

async function requestTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken || isExpired(refreshToken, 0)) {
    clearAuthSession();
    return null;
  }

  for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: refreshTimeoutSignal(),
      });

      if (res.ok) {
        const data = (await res.json()) as RefreshResponse;
        saveAuthSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
        return data.access_token;
      }

      // Definitive auth rejection: the refresh token is no longer accepted, so
      // the session really is over.
      if (res.status === 401 || res.status === 403) {
        clearAuthSession();
        return null;
      }

      // Transient server error (5xx / 408 / 429): retry with backoff, but never
      // sign the user out for it.
      if (isTransientStatus(res.status) && attempt < REFRESH_MAX_ATTEMPTS) {
        await delay(REFRESH_RETRY_BASE_DELAY_MS * attempt);
        continue;
      }

      // Any other unexpected non-OK response: do not discard a valid session on
      // a single odd reply — let a later attempt retry.
      return null;
    } catch {
      // Network error or timeout — transient. Retry without clearing the session.
      if (attempt < REFRESH_MAX_ATTEMPTS) {
        await delay(REFRESH_RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      return null;
    }
  }

  return null;
}

export async function ensureValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;

  if (!isExpired(token)) return token;

  if (!refreshInFlight) {
    refreshInFlight = requestTokenRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export function getAccessTokenUnsafe() {
  return localStorage.getItem('auth_token');
}

export function isAccessTokenExpired(): boolean {
  const token = localStorage.getItem('auth_token');
  if (!token) return true;
  return isExpired(token, 0);
}

export async function logoutServerSideIfPossible(): Promise<void> {
  const token = getAccessTokenUnsafe();
  if (!token || isExpired(token, 0)) return;

  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Ignore network/logout failures on client-side sign out.
  }
}
