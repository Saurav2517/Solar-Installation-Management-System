import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ThemeToggle } from '../components/ThemeToggle';
import { Btn, Field, Input, Select, Textarea, useToast } from '../components/ui';
import { api } from '../lib/api';
import { inr, inrCompact } from '../lib/format';
import type { CapacityKw, SystemType } from '../../shared/types';
import { SUPPORTED_CITIES, pincodeErrorForCity } from '../../shared/pincodes';
import { phoneError } from '../../shared/validation';

interface PackageRow {
  kw: number;
  type: SystemType;
  subtotal: number;
  total: number;
  subsidy: number;
  panels: number;
  batteries: number;
}

const TYPES: Array<{ id: SystemType; label: string; blurb: string }> = [
  { id: 'on-grid', label: 'On-Grid', blurb: 'Connected to the grid, no battery' },
  { id: 'off-grid', label: 'Off-Grid', blurb: 'Battery backup for power cuts' },
  { id: 'hardware', label: 'Panel set', blurb: 'Panels, stands and wiring only' },
];

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: 'Bengaluru',
  pincode: '',
  capacityKw: '3',
  wantsSubsidy: true,
  monthlyBill: '',
  roofAreaSqft: '',
  notes: '',
};

export default function Intake() {
  const toast = useToast();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [type, setType] = useState<SystemType>('on-grid');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    api
      .get<{ packages: PackageRow[] }>('/packages')
      .then((res) => setPackages(res.packages))
      .catch(() => setPackages([]))
      .finally(() => setLoadingPackages(false));
  }, []);

  const submit = async () => {
    setError(null);
    const pinErr = pincodeErrorForCity(form.pincode, form.city);
    if (pinErr) { setError(pinErr); return; }
    if (form.monthlyBill && (Number.isNaN(Number(form.monthlyBill)) || Number(form.monthlyBill) < 0)) { setError('Monthly electricity bill cannot be negative'); return; }
    if (form.roofAreaSqft && (Number.isNaN(Number(form.roofAreaSqft)) || Number(form.roofAreaSqft) < 0)) { setError('Roof area cannot be negative'); return; }
    if (!form.name.trim()) { setError('Your name is required'); return; }
    const phoneErr = phoneError(form.phone);
    if (phoneErr) { setError(phoneErr); return; }
    if (!form.address.trim()) { setError('Rooftop address is required'); return; }
    setBusy(true);
    try {
      const res = await api.post<{ enquiry: { ref: string } }>('/enquiries', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        capacityKw: Number(form.capacityKw) as CapacityKw,
        systemType: type,
        wantsSubsidy: form.wantsSubsidy,
        monthlyBill: form.monthlyBill ? Number(form.monthlyBill) : undefined,
        roofAreaSqft: form.roofAreaSqft ? Number(form.roofAreaSqft) : undefined,
        notes: form.notes,
        source: 'web',
      });
      setSubmitted(res.enquiry.ref);
      toast('Enquiry received — the sales desk will call you');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const visible = packages.filter((p) => p.type === type);

  return (
    <div className="min-h-screen bg-[#fdf8ee] text-slate-900 dark:bg-[#0b1220]">
      <header className="border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
              <Icon name="sun" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">SunPower Solutions</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-amber-700">Rooftop solar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-amber-700">
              Sign in →
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-800 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Installing 40 rooftops a month across Bengaluru
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Go solar without the paperwork.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-slate-600 sm:text-base">
            One team from the first roof measurement to the 20-year warranty. We handle the subsidy files, the serial
            numbers, the crew and the service calls.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'Free roof survey — direction, tilt and cable distance measured',
              'Fixed quote with every panel, inverter, stand and safety part listed',
              'Subsidy paperwork filed by us under PM Surya Ghar',
              'Every inverter and panel serial registered for warranty',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Icon name="check" className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-6 border-t border-amber-200/70 pt-5">
            <div>
              <p className="text-2xl font-bold">1–5 kW</p>
              <p className="text-[11px] text-slate-500">On-grid &amp; off-grid</p>
            </div>
            <div>
              <p className="text-2xl font-bold">20 yrs</p>
              <p className="text-[11px] text-slate-500">Panel warranty</p>
            </div>
            <div>
              <p className="text-2xl font-bold">15</p>
              <p className="text-[11px] text-slate-500">In-house technicians</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-xl sm:p-6">
          {submitted ? (
            <div className="py-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="check" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-bold">Enquiry received</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your reference is <strong className="font-mono">{submitted}</strong>. Our sales team will call you within
                one working day.
              </p>
              <p className="mt-2 text-xs text-slate-500">Keep this reference for any follow-up.</p>
              <button
                className="btn btn-ghost btn-sm mt-5"
                onClick={() => {
                  setSubmitted(null);
                  setForm(INITIAL_FORM);
                }}
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold tracking-tight">Get a free quote</h2>
              <p className="mt-0.5 text-xs text-slate-500">Takes a minute. No obligation.</p>
              <div className="mt-4 grid gap-3">
                <Field label="Your name">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit number"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="\d{10}"
                    />
                  </Field>
                  <Field label="Email">
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" />
                  </Field>
                </div>
                <Field label="Rooftop address">
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="House / plot, street, area"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City">
                    <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                      {SUPPORTED_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Pincode">
                    <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} maxLength={6} inputMode="numeric" pattern="\d{6}" placeholder="6-digit" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="System size">
                    <Select value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })}>
                      {[1, 2, 3, 4, 5].map((kw) => (
                        <option key={kw} value={kw}>
                          {kw} kW
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Type">
                    <Select value={type} onChange={(e) => setType(e.target.value as SystemType)}>
                      <option value="on-grid">On-Grid</option>
                      <option value="off-grid">Off-Grid (battery)</option>
                      <option value="hardware">Panel set only</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Monthly bill (₹)">
                    <Input
                      type="number"
                      min={0}
                      value={form.monthlyBill}
                      onChange={(e) => setForm({ ...form, monthlyBill: e.target.value })}
                      placeholder="e.g. 4200"
                    />
                  </Field>
                  <Field label="Shadow-free roof (sq ft)">
                    <Input
                      type="number"
                      min={0}
                      value={form.roofAreaSqft}
                      onChange={(e) => setForm({ ...form, roofAreaSqft: e.target.value })}
                      placeholder="e.g. 320"
                    />
                  </Field>
                </div>
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.wantsSubsidy}
                    onChange={(e) => setForm({ ...form, wantsSubsidy: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600"
                  />
                  I want SunPower to file the government rooftop subsidy for me
                </label>
                <Field label="Anything else?">
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Roof type, shading, when you want it installed…"
                  />
                </Field>
                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
                <Btn variant="accent" className="w-full py-2.5" disabled={busy} onClick={() => void submit()}>
                  {busy ? 'Sending…' : 'Request my free quote'}
                </Btn>
                <p className="text-center text-[10px] text-slate-400">
                  By sending, you agree to be contacted about your enquiry. We never sell your number.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ready-made systems, 1 kW to 5 kW</h2>
              <p className="mt-1 text-sm text-slate-500">
                Prices include panels, inverter, stands, wiring, safety parts and installation.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    type === t.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                  title={t.blurb}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loadingPackages ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading packages…</p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {visible.map((p) => (
                <div key={`${p.type}-${p.kw}`} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">{p.kw} kW</p>
                    {p.type === 'off-grid' && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Battery</span>
                    )}
                    {p.type === 'hardware' && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">DIY</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{TYPES.find((t) => t.id === p.type)?.blurb}</p>
                  <p className="mt-3 text-xl font-bold tracking-tight">{inr(p.total)}</p>
                  <p className="text-[10px] text-slate-400">incl. GST</p>
                  {p.subsidy > 0 && (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                      {inr(p.subsidy)} subsidy · net {inrCompact(p.total - p.subsidy)}
                    </p>
                  )}
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
                    <li>{p.panels} × 550W panels</li>
                    {p.type !== 'hardware' && <li>{p.kw} kW inverter</li>}
                    {p.batteries > 0 && <li>{p.batteries} × 5.12 kWh battery</li>}
                    <li>Stands, cables &amp; earthing</li>
                    {p.type !== 'hardware' && <li>Installation &amp; testing</li>}
                  </ul>
                  <button
                    className="btn btn-ghost btn-sm mt-4 w-full"
                    onClick={() => {
                      setType(p.type);
                      setForm({ ...form, capacityKw: String(p.kw) });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Enquire
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-[11px] text-slate-500">
            Subsidy shown for residential on-grid systems under PM Surya Ghar. Final amount depends on government approval
            and net-meter installation. Off-grid systems are not eligible.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-xl font-bold tracking-tight">How it works</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: 'phone', title: '1 · We call you', text: 'A quick call to check your bill, roof space and grid connection.' },
            { icon: 'clipboard', title: '2 · Free survey', text: 'A technician measures direction, tilt and cable distance on site.' },
            { icon: 'file', title: '3 · Fixed quote', text: 'Every part listed. Approve it and pay an advance to book the crew.' },
            { icon: 'wrench', title: '4 · Install & warranty', text: 'We install, test and register every serial for warranty.' },
          ].map((step) => (
            <div key={step.title} className="rounded-xl bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Icon name={step.icon} className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-bold">{step.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-amber-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold">SunPower Solutions</p>
            <p className="text-[10px] text-slate-500">Rooftop solar · Bengaluru · +91 98450 10101</p>
          </div>
          <Link to="/login" className="text-[11px] font-semibold text-slate-500 hover:text-amber-700">
            Admin &amp; customer login
          </Link>
        </div>
      </footer>
    </div>
  );
}
