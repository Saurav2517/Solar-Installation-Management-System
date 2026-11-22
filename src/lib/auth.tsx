import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loading } from '../components/ui';
import { api, getToken, setToken } from './api';
import type { Account, AccountRole } from '../../shared/types';

interface AuthValue {
  account: Account | null;
  ready: boolean;
  signIn: (email: string, password: string, role: AccountRole) => Promise<Account>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        const { account: me } = await api.get<{ account: Account }>('/auth/me');
        if (!cancelled) setAccount(me);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    const onUnauthorized = () => setAccount(null);
    window.addEventListener('sp:unauthorized', onUnauthorized);
    void restore();

    return () => {
      cancelled = true;
      window.removeEventListener('sp:unauthorized', onUnauthorized);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, role: AccountRole) => {
    const result = await api.post<{ token: string; account: Account }>('/auth/login', { email, password, role });
    setToken(result.token);
    setAccount(result.account);
    return result.account;
  }, []);

  const signOut = useCallback(() => {
    void api.post('/auth/logout').catch(() => undefined);
    setToken(null);
    setAccount(null);
  }, []);

  const value = useMemo(() => ({ account, ready, signIn, signOut }), [account, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { account, ready } = useAuth();
  if (!ready) return <Loading label="Checking your session…" />;
  if (!account) return <Navigate to="/login" replace />;
  if (account.role !== 'admin') return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

export function RequireCustomer({ children }: { children: ReactNode }) {
  const { account, ready } = useAuth();
  if (!ready) return <Loading label="Checking your session…" />;
  if (!account) return <Navigate to="/login" replace />;
  if (account.role !== 'customer') return <Navigate to="/" replace />;
  return <>{children}</>;
}
