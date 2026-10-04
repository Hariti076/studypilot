import { getToken } from './session';

/**
 * Base URL of the real backend. Leave VITE_API_URL unset (see .env.example) to use the built-in mock backend.
 */
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const USE_MOCK = !API_URL;

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Fired when the server rejects our token, so AuthContext can sign the user out. */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

/**
 * Thin fetch wrapper: JSON in/out, bearer token, timeout, and uniform ApiError handling.
 * Backend errors are expected as `{ "message": "..." }`.
 */
export async function request(path, { method = 'GET', body, auth = true, timeout = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      err.name === 'AbortError' ? 'The request timed out. Please try again.' : 'Cannot reach the server. Check your connection and try again.'
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    const message =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.detail === 'string' && data.detail) ||
      (res.status >= 500 ? 'Cannot reach the planner API. Start the backend on port 8000 and try again.' : `Request failed (${res.status}).`);
    throw new ApiError(message, { status: res.status, details: data });
  }
  return data;
}
