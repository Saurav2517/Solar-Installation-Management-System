import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import type { Role } from '../../shared/types';

const ALL: Role[] = ['director', 'sales', 'warehouse', 'crew', 'support'];

const NAV: Array<{
  group: string;
  items: Array<{ to: string; label: string; icon: string; roles: Role[]; end?: boolean }>;
}> = [
  {
    group: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'grid', roles: ALL, end: true }],
  },
  {
    group: 'Sales',
    items: [
      { to: '/enquiries', label: 'Enquiries', icon: 'inbox', roles: ['director', 'sales', 'support'] },
      { to: '/surveys', label: 'Site surveys', icon: 'clipboard', roles: ['director', 'sales', 'crew'] },
      { to: '/quotes', label: 'Quotes', icon: 'file', roles: ['director', 'sales'] },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/orders', label: 'Orders', icon: 'package', roles: ['director', 'sales', 'warehouse', 'support'] },
      { to: '/dispatch', label: 'Dispatch', icon: 'truck', roles: ['director', 'warehouse'] },
      { to: '/installations', label: 'Installations', icon: 'wrench', roles: ['director', 'crew', 'warehouse'] },
    ],
  },
  {
    group: 'Stores',
    items: [{ to: '/inventory', label: 'Inventory & serials', icon: 'boxes', roles: ['director', 'warehouse', 'support'] }],
  },
  {
    group: 'Service',
    items: [{ to: '/tickets', label: 'Service tickets', icon: 'headset', roles: ALL }],
  },
  {
    group: 'Money',
    items: [
      { to: '/billing', label: 'Billing & subsidy', icon: 'receipt', roles: ['director', 'sales', 'support'] },
      { to: '/technicians', label: 'Crew & payroll', icon: 'users', roles: ['director', 'crew'] },
      { to: '/reports', label: 'Reports', icon: 'chart', roles: ['director'] },
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const { account, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const role: Role = 'director';

  // Keep the Orders badge current so new customer requests are visible from any page.
  useEffect(() => {
    let alive = true;
    api
      .get<{ orders: Array<{ status: string }> }>('/orders')
      .then((res) => {
        if (alive) setPendingOrders(res.orders.filter((o) => o.status === 'requested').length);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length,
  );

  const current = NAV.flatMap((g) => g.items).find(
    (i) => location.pathname === i.to || (i.to !== '/' && location.pathname.startsWith(i.to)),
  );

  const resetData = async () => {
    if (!window.confirm('Reset all demo data back to the seeded week? This cannot be undone.')) return;
    await api.post('/reset');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {open && (
        <button
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
            <Icon name="sun" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">SunPower Solutions</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Solar operations</p>
          </div>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                          isActive
                            ? 'bg-white/10 text-white shadow-inner'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}>
                            <Icon name={item.icon} className="h-4 w-4" />
                          </span>
                          {item.label}
                          {item.to === '/orders' && pendingOrders > 0 && (
                            <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                              {pendingOrders}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <Link to="/enquire" className="flex items-center gap-2 text-[11px] font-medium text-slate-400 hover:text-amber-400">
            <Icon name="arrowRight" className="h-3.5 w-3.5" />
            Public enquiry form
          </Link>
          <button
            onClick={() => void resetData()}
            className="mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-500 hover:text-slate-300"
          >
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Reset demo data
          </button>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="truncate text-[10px] text-slate-600">{account?.name ?? 'SunPower staff'}</p>
            <button onClick={signOut} className="text-[10px] font-semibold text-slate-500 hover:text-amber-400">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{current?.label ?? 'SunPower OS'}</p>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-800">{account?.name ?? 'SunPower staff'}</p>
                <p className="text-[10px] text-slate-500">{account?.email}</p>
              </div>
              <button onClick={signOut} className="btn btn-ghost btn-sm" title="Sign out of the admin portal">
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
            <Link to="/enquiries?new=1" className="btn btn-accent btn-sm">
              <Icon name="plus" className="h-3.5 w-3.5" />
              New enquiry
            </Link>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
            {NAV.flatMap((g) => g.items)
              .filter((i) => i.roles.includes(role))
              .slice(0, 8)
              .map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
