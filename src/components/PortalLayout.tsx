import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/portal', label: 'Shop', icon: 'package', end: true },
  { to: '/portal/orders', label: 'My orders', icon: 'receipt', end: false },
];

export default function PortalLayout() {
  const { account, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/portal" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
              <Icon name="sun" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-slate-900">SunPower Solutions</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Customer portal</span>
            </span>
          </NavLink>

          <nav className="ml-2 flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon name={item.icon} className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-800">{account?.name}</p>
              <p className="text-[10px] text-slate-500">{account?.email}</p>
            </div>
            <button
              onClick={() => {
                signOut();
                navigate('/login', { replace: true });
              }}
              className="btn btn-ghost btn-sm"
            >
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-[11px] text-slate-500 sm:px-6">
        SunPower Solutions · Bengaluru · +91 98450 10101 · GSTIN 29ABCDE1234F1Z5
      </footer>
    </div>
  );
}
