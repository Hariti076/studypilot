/** Auth session persistence (token + user). Kept separate so http.js and AuthContext can share it. */
const KEY = 'sp:session';

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && s.token && s.user ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — session lives in memory only */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const getToken = () => getSession()?.token ?? null;
