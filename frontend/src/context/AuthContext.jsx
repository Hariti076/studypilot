import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { loginUser, signupUser } from '../services/api';
import { AUTH_EXPIRED_EVENT } from '../services/http';
import { clearSession, getSession, saveSession } from '../services/session';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  const start = useCallback((s) => {
    saveSession(s);
    setSession(s);
    return s.user;
  }, []);

  const login = useCallback(async (credentials) => start(await loginUser(credentials)), [start]);
  const signup = useCallback(async (details) => start(await signupUser(details)), [start]);
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Sign out when the API says our token is no longer valid, and keep tabs in sync.
  useEffect(() => {
    const onExpired = () => logout();
    const onStorage = (e) => {
      if (e.key === 'sp:session') setSession(getSession());
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, [logout]);

  const value = useMemo(
    () => ({ user: session?.user ?? null, isAuthenticated: !!session, login, signup, logout }),
    [session, login, signup, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
