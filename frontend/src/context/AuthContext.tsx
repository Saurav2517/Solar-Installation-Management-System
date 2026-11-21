import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../types/solar';

interface AuthContextValue {
  role: UserRole;
  userName: string;
  setRole: (role: UserRole) => void;
}

const ROLE_USERS: Record<UserRole, string> = {
  SALES: 'Ananya (Sales Exec)',
  WAREHOUSE: 'Deepak (Warehouse Mgr)',
  TECHNICIAN: 'Harpreet (Site Tech)',
  SUPPORT: 'Neha (Support Desk)',
  DIRECTOR: 'Mr. Verma (Director)',
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('SALES');

  return (
    <AuthContext.Provider value={{ role, userName: ROLE_USERS[role], setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
