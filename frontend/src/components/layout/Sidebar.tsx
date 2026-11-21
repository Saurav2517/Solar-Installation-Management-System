import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  FileSpreadsheet,
  Truck,
  Wrench,
  ShieldAlert,
  BarChart3,
  Sun,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/inquiries', label: '1. Leads & Surveys', icon: ClipboardList },
  { to: '/quotes', label: '2. Quotes & Auto-BOM', icon: FileSpreadsheet },
  { to: '/dispatch', label: '3. Warehouse & Serials', icon: Truck },
  { to: '/field-jobs', label: '4. On-Roof Field View', icon: Wrench },
  { to: '/support', label: '5. Warranty & Tickets', icon: ShieldAlert },
  { to: '/director', label: '6. Director Dashboard', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 text-slate-100 border-r border-slate-800">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
          <Sun className="h-6 w-6"/>
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">SunPower Solutions</p>
          <p className="text-xs text-slate-400">Solar Ops ERP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0"/>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4 text-xs text-slate-400">
        40+ Rooftops/mo · 15 Technicians
      </div>
    </aside>
  );
}
