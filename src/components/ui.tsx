import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { titleCase } from '../lib/format';

export type Tone = 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'orange';

const TONE: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};

export function Badge({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

type StatusKind =
  | 'enquiry'
  | 'survey'
  | 'quote'
  | 'order'
  | 'installation'
  | 'ticket'
  | 'invoice'
  | 'subsidy'
  | 'serial'
  | 'expense';

const STATUS: Record<StatusKind, Record<string, { label: string; tone: Tone }>> = {
  enquiry: {
    new: { label: 'New', tone: 'blue' },
    contacted: { label: 'Contacted', tone: 'slate' },
    qualified: { label: 'Qualified', tone: 'violet' },
    survey_scheduled: { label: 'Survey booked', tone: 'amber' },
    surveyed: { label: 'Surveyed', tone: 'amber' },
    survey_approved: { label: 'Survey approved', tone: 'green' },
    quoted: { label: 'Quoted', tone: 'blue' },
    won: { label: 'Won', tone: 'green' },
    lost: { label: 'Lost', tone: 'red' },
  },
  survey: {
    scheduled: { label: 'Scheduled', tone: 'amber' },
    completed: { label: 'Completed', tone: 'blue' },
    approved: { label: 'Approved', tone: 'green' },
    rejected: { label: 'Rejected', tone: 'red' },
  },
  quote: {
    draft: { label: 'Draft', tone: 'slate' },
    sent: { label: 'Sent', tone: 'blue' },
    accepted: { label: 'Accepted', tone: 'green' },
    rejected: { label: 'Rejected', tone: 'red' },
    expired: { label: 'Expired', tone: 'slate' },
  },
  order: {
    requested: { label: 'Awaiting confirmation', tone: 'amber' },
    confirmed: { label: 'Confirmed', tone: 'blue' },
    dispatched: { label: 'Dispatched', tone: 'violet' },
    installed: { label: 'Installed', tone: 'amber' },
    closed: { label: 'Closed', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'red' },
  },
  installation: {
    scheduled: { label: 'Scheduled', tone: 'amber' },
    in_progress: { label: 'In progress', tone: 'blue' },
    completed: { label: 'Signed off', tone: 'green' },
  },
  ticket: {
    open: { label: 'Open', tone: 'red' },
    assigned: { label: 'Assigned', tone: 'amber' },
    in_progress: { label: 'In progress', tone: 'blue' },
    resolved: { label: 'Awaiting customer', tone: 'violet' },
    confirmed: { label: 'Customer confirmed', tone: 'green' },
    closed: { label: 'Closed', tone: 'green' },
  },
  invoice: {
    draft: { label: 'Draft', tone: 'slate' },
    sent: { label: 'Sent', tone: 'blue' },
    paid: { label: 'Paid', tone: 'green' },
  },
  subsidy: {
    documents_pending: { label: 'Documents pending', tone: 'amber' },
    submitted: { label: 'Submitted', tone: 'blue' },
    under_review: { label: 'Under review', tone: 'violet' },
    approved: { label: 'Approved', tone: 'green' },
    received: { label: 'Received', tone: 'green' },
    rejected: { label: 'Rejected', tone: 'red' },
  },
  serial: {
    in_stock: { label: 'In stock', tone: 'slate' },
    reserved: { label: 'Reserved', tone: 'amber' },
    dispatched: { label: 'Dispatched', tone: 'blue' },
    installed: { label: 'Installed', tone: 'green' },
    returned: { label: 'Returned', tone: 'violet' },
    faulty: { label: 'Faulty', tone: 'red' },
  },
  expense: {
    stock: { label: 'Stock', tone: 'violet' },
    salaries: { label: 'Salaries', tone: 'blue' },
    transport: { label: 'Transport', tone: 'amber' },
    office: { label: 'Office', tone: 'slate' },
    marketing: { label: 'Marketing', tone: 'orange' },
    other: { label: 'Other', tone: 'slate' },
  },
};

export function statusMeta(kind: StatusKind, status: string) {
  return STATUS[kind]?.[status] ?? { label: titleCase(status), tone: 'slate' as Tone };
}

export function StatusBadge({ kind, status }: { kind: StatusKind; status: string }) {
  const meta = statusMeta(kind, status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const BTN_VARIANT = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export function Btn({
  variant = 'primary',
  size,
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN_VARIANT; size?: 'sm' }) {
  return (
    <button
      type={type}
      className={`btn ${BTN_VARIANT[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      {...rest}
    />
  );
}

export function LinkBtn({
  to,
  children,
  variant = 'primary',
  size,
  className = '',
}: {
  to: string;
  children: ReactNode;
  variant?: keyof typeof BTN_VARIANT;
  size?: 'sm';
  className?: string;
}) {
  return (
    <Link to={to} className={`btn ${BTN_VARIANT[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className = '',
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`input ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return <select className={`input ${className}`} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`input min-h-[80px] ${className}`} {...rest} />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  backTo,
  backLabel = 'Back',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backTo && (
          <Link to={backTo} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
            ← {backLabel}
          </Link>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`card ${className}`}>
      {children}
    </div>
  );
}

export function SectionHead({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-5 py-4 ${className}`}>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M3 7h18M3 12h18M3 17h10" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = 'slate',
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <span className={`rounded-lg p-1.5 ${TONE[tone]}`}>{icon}</span>}
      </div>
      <p className="mono mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-rose-200 bg-rose-50 px-5 py-4">
      <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {onRetry && (
        <button className="btn btn-ghost btn-sm mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button className="fixed inset-0 cursor-default bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
      <div className={`relative mx-auto my-6 w-[calc(100%-2rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="card overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
            active === t.id
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.label}
          {t.count != null && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export function Progress({ value, tone = 'green' }: { value: number; tone?: 'green' | 'amber' | 'red' }) {
  const color = tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ------------------------------ toasts ------------------------------ */

type ToastTone = 'success' | 'error';
const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: ToastTone }>>([]);

  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              t.tone === 'error'
                ? 'bg-rose-600 text-white ring-rose-700'
                : 'bg-slate-900 text-white ring-slate-800'
            }`}
          >
            <span className="mt-0.5">{t.tone === 'error' ? '⚠' : '✓'}</span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
