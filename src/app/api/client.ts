import { clearAuthSession, ensureValidAccessToken } from '../utils/authSession';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
    const token = await ensureValidAccessToken();

    const doFetch = (authToken: string | null) =>
        fetch(`${BASE_URL}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                ...options?.headers,
            },
            ...options,
        });

    let res = await doFetch(token);
    if (res.status === 401) {
        const refreshedToken = await ensureValidAccessToken();
        if (!refreshedToken) {
            clearAuthSession();
            throw new Error('Session expired. Please log in again.');
        }
        res = await doFetch(refreshedToken);
    }

    if (!res.ok) {
        const rawText = await res.text();
        let message = rawText || `Request failed with status ${res.status}`;

        try {
            const parsed = rawText ? JSON.parse(rawText) : null;
            const apiMessage = parsed?.message;
            if (Array.isArray(apiMessage)) {
                message = apiMessage.join(', ');
            } else if (typeof apiMessage === 'string' && apiMessage.trim()) {
                message = apiMessage;
            } else if (typeof parsed?.error === 'string' && parsed.error.trim()) {
                message = parsed.error;
            }
        } catch {
            // Keep the raw text message when response body is not JSON.
        }

        if (res.status === 401) {
            clearAuthSession();
            throw new Error('Session expired. Please log in again.');
        }
        throw new Error(message);
    }

    const statusNoContent = res.status === 204;
    if (statusNoContent) {
        return undefined as T;
    }

    return (await res.json()) as T;
}

/**
 * Some backend controllers wrap responses in a `{ success, data, ... }`
 * envelope while others return the payload directly. These helpers
 * normalise both shapes so callers always get the payload.
 */
export function unwrapApiResult<T>(res: unknown): T {
    if (
        res !== null &&
        typeof res === 'object' &&
        !Array.isArray(res) &&
        'success' in res &&
        'data' in res
    ) {
        return (res as { data: T }).data;
    }
    return res as T;
}

/**
 * Normalises a list response to a plain array. Handles raw arrays,
 * `{ success, data: [...] }` envelopes and `{ data: [...], total }`
 * paginated envelopes. Returns an empty array for anything else.
 */
export function toApiArray<T>(res: unknown): T[] {
    if (Array.isArray(res)) return res as T[];
    if (res !== null && typeof res === 'object') {
        const data = (res as { data?: unknown }).data;
        if (Array.isArray(data)) return data as T[];
    }
    return [];
}
