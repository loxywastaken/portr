import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setCsrfToken } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import type { AuthUser } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: AuthUser; csrfToken?: string | null }>('/auth/me');
      setUser(data.user);
      if (data.csrfToken) setCsrfToken(data.csrfToken);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Prime the CSRF token even before login (works cross-domain).
    api
      .get<{ csrfToken: string | null }>('/csrf')
      .then(({ data }) => setCsrfToken(data.csrfToken))
      .catch(() => undefined);
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = `${API_URL}/api/auth/login`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore — clear locally regardless */
    } finally {
      disconnectSocket();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
