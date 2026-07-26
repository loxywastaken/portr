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
 * Populated by the auth layer from an API response so CSRF works cross-domain,
 * where the SPA cannot read the API's cookie. Falls back to the cookie for
 * same-site / proxied deployments.
 */
export function setCsrfToken(token: string | null): void {
  inMemoryCsrf = token;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = inMemoryCsrf ?? readCookie('nexus.csrf');
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
