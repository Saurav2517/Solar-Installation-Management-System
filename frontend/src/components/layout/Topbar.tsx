import { RotateCcw, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resetDatabase } from '../../services/mockStore';
import type { UserRole } from '../../types/solar';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'SALES', label: 'Sales Team' },
  { value: 'WAREHOUSE', label: 'Warehouse Staff' },
  { value: 'TECHNICIAN', label: 'Field Technician' },
  { value: 'SUPPORT', label: 'Support Desk' },
  { value: 'DIRECTOR', label: 'Director' },
];

export function Topbar({ title }: { title: string }) {
  const { role, userName, setRole } = useAuth();

  const handleResetDemo = () => {
    resetDatabase();
    window.location.reload();
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">SunPower Digital Backbone · Quote to 20-Year Warranty</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
          <UserCircle2 className="h-4 w-4 text-amber-600"/>
          <span className="hidden sm:inline text-xs font-medium text-slate-700">{userName}</span>
          <select
            aria-label="Switch Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleResetDemo}
          title="Reset demo data to initial seed"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          <RotateCcw className="h-3.5 w-3.5"/>
          Reset Seed
        </button>
      </div>
    </header>
  );
}
