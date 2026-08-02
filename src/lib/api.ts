import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '';

/** Shared axios instance — sends cookies and attaches the CSRF token. */
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

function readCookie(name: string): string | null {
  const escaped = name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

let inMemoryCsrf: string | null = null;

/**
 * Fallback CSRF token for cross-domain deployments where the SPA cannot read
 * the API's cookie. Populated by the auth layer from an API response.
 *
 * NOTE: this is only a fallback. The server validates the request header
 * against the CSRF *cookie* the browser sends, so when the cookie is readable
 * (same-site / proxied) we must echo that live value — see the interceptor.
 */
export function setCsrfToken(token: string | null): void {
  inMemoryCsrf = token;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // Prefer the live cookie: it is exactly what the browser sends and what the
    // server compares against, so it always matches. `inMemoryCsrf` is only a
    // fallback for cross-domain, where the cookie is not JS-readable. (Reading
    // the cookie first also avoids a token desync from the two parallel token
    // primers on app load, which was causing intermittent 403s on mutations.)
    const csrf = readCookie('nexus.csrf') ?? inMemoryCsrf;
    if (csrf && config.headers) config.headers.set('x-csrf-token', csrf);
  }
  return config;
});

export interface ApiError {
  message: string;
  code?: number | string;
  details?: unknown;
}

/** Normalises any thrown value into a predictable ApiError. */
export function extractApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const payload = err.response?.data as { error?: ApiError } | undefined;
    if (payload?.error) return payload.error;
    return { message: err.message };
  }
  return { message: 'Something went wrong. Please try again.' };
}
