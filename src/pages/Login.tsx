import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ThemeToggle } from '../components/ThemeToggle';
import { Btn, Field, Input } from '../components/ui';
import { useAuth } from '../lib/auth';
import type { AccountRole } from '../../shared/types';

const DEMO: Record<AccountRole, { email: string; password: string; label: string; note: string }> = {
  admin: {
    email: 'admin@sunpower.in',
    password: 'admin123',
    label: 'Priya Sharma · Director',
    note: 'Enquiries, quotes, orders, dispatch, billing and reports',
  },
  customer: {
    email: 'nagaraj.hegde@gmail.com',
    password: 'customer123',
    label: 'Nagaraj Hegde · Customer',
    note: 'Shop for a solar system and follow your order',
  },
};

const TABS: Array<{ id: AccountRole; label: string; icon: string }> = [
  { id: 'admin', label: 'Admin', icon: 'grid' },
  { id: 'customer', label: 'Customer', icon: 'users' },
];

export default function Login() {
  const navigate = useNavigate();
  const { account, ready, signIn } = useAuth();
  const [role, setRole] = useState<AccountRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && account) navigate(account.role === 'admin' ? '/' : '/portal', { replace: true });
  }, [ready, account, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const signedIn = await signIn(email.trim(), password, role);
      navigate(signedIn.role === 'admin' ? '/' : '/portal', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO[role].email);
    setPassword(DEMO[role].password);
    setError(null);
  };

  return (
    <div className="grid min-h-screen bg-slate-100 lg:grid-cols-2">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="hidden flex-col justify-between bg-slate-900 p-10 text-slate-300 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
            <Icon name="sun" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">SunPower Solutions</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Solar operations</p>
          </div>
        </div>

        <div className="max-w-sm">
          <h1 className="text-3xl font-bold leading-tight text-white">
            One system for the office, one shop for your customers.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Staff sign in to run surveys, quotes, dispatch, installation and billing. Customers sign in to build a
            system, place an order and track it — every request lands straight in the SunPower order book.
          </p>
          <ul className="mt-6 space-y-2 text-[13px] text-slate-400">
            <li className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4 text-amber-400" />
              Two logins only — admin and customer
            </li>
            <li className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4 text-amber-400" />
              Customer orders appear as requests for staff to confirm
            </li>
            <li className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4 text-amber-400" />
              Serial-tracked warranty from dispatch to service
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-slate-600">SunPower OS · Bengaluru · demo build</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
              <Icon name="sun" className="h-5 w-5" />
            </span>
            <p className="text-sm font-bold tracking-tight">SunPower Solutions</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-xs text-slate-500">Choose the login you were given, then enter your credentials.</p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setRole(tab.id);
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    role === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon name={tab.icon} className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={DEMO[role].email}
                  required
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </Field>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                  {error}
                </p>
              )}

              <Btn type="submit" variant="primary" className="w-full justify-center" disabled={busy}>
                {busy ? 'Signing in…' : `Sign in as ${role}`}
              </Btn>
            </form>

            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Demo {role} login</p>
              <p className="mt-1 text-xs text-slate-700">{DEMO[role].label}</p>
              <p className="text-[11px] text-slate-500">{DEMO[role].note}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-600">
                {DEMO[role].email} · {DEMO[role].password}
              </p>
              <button type="button" onClick={fillDemo} className="mt-2 text-[11px] font-semibold text-amber-700 hover:underline">
                Fill these credentials
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            Looking for a quote instead?{' '}
            <Link to="/enquire" className="font-semibold text-amber-700 hover:underline">
              Use the public enquiry form
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
