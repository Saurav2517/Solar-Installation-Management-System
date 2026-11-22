import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Btn,
  Card,
  Empty,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, inr, timeAgo } from '../lib/format';
import type { EnquiriesData, EnquiryRow } from '../lib/types';
import type { CapacityKw, EnquirySource, SystemType } from '../../shared/types';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'working', label: 'In progress' },
  { id: 'survey', label: 'Survey' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: 'Bengaluru',
  pincode: '',
  capacityKw: '3',
  systemType: 'on-grid' as SystemType,
  wantsSubsidy: true,
  monthlyBill: '',
  roofAreaSqft: '',
  source: 'web' as EnquirySource,
  notes: '',
};

export default function Enquiries() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<EnquiriesData>('/enquiries');
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('new') === '1') setFormOpen(true);
  }, [params]);

  const closeForm = () => {
    setFormOpen(false);
    setFormError(null);
    setForm(emptyForm);
    if (params.get('new')) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  };

  const rows = data?.enquiries ?? [];

  const counts = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter((r) => r.status === 'new').length,
      working: rows.filter((r) => ['contacted', 'qualified'].includes(r.status)).length,
      survey: rows.filter((r) => ['survey_scheduled', 'surveyed', 'survey_approved'].includes(r.status)).length,
      quoted: rows.filter((r) => r.status === 'quoted').length,
      won: rows.filter((r) => r.status === 'won').length,
      lost: rows.filter((r) => r.status === 'lost').length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const tabOk =
        tab === 'all'
          ? true
          : tab === 'working'
            ? ['contacted', 'qualified'].includes(r.status)
            : tab === 'survey'
              ? ['survey_scheduled', 'surveyed', 'survey_approved'].includes(r.status)
              : r.status === tab;
      if (!tabOk) return false;
      if (!q) return true;
      return [r.customerName, r.phone, r.ref, r.city, r.address].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, tab, search]);

  const submit = async () => {
    setFormError(null);
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) { setFormError('Pincode must be a 6-digit number'); return; }
    if (form.monthlyBill && (Number.isNaN(Number(form.monthlyBill)) || Number(form.monthlyBill) < 0)) { setFormError('Monthly electricity bill cannot be negative'); return; }
    if (form.roofAreaSqft && (Number.isNaN(Number(form.roofAreaSqft)) || Number(form.roofAreaSqft) < 0)) { setFormError('Roof area cannot be negative'); return; }
    if (!form.name.trim()) { setFormError('Customer name is required'); return; }
    if (!form.phone.trim()) { setFormError('Phone number is required'); return; }
    if (!form.address.trim()) { setFormError('Site address is required'); return; }
    setBusy(true);
    try {
      const res = await api.post<{ enquiry: { id: string } }>('/enquiries', {
        ...form,
        capacityKw: Number(form.capacityKw) as CapacityKw,
        monthlyBill: form.monthlyBill ? Number(form.monthlyBill) : undefined,
        roofAreaSqft: form.roofAreaSqft ? Number(form.roofAreaSqft) : undefined,
      });
      toast('Enquiry logged — the sales desk has it.');
      closeForm();
      navigate(`/enquiries/${res.enquiry.id}`);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="Every WhatsApp message, call and web form in one pipeline — nothing goes missing."
        actions={
          <Btn variant="accent" onClick={() => setFormOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Log enquiry
          </Btn>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full overflow-x-auto">
            <Tabs
              tabs={TABS.map((t) => ({ ...t, count: counts[t.id as keyof typeof counts] }))}
              active={tab}
              onChange={setTab}
            />
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, ref…"
              className="input pl-9"
            />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={() => void reload()} />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            title="No enquiries here"
            hint="Try another filter, or log a lead that came in by phone."
            action={
              <Btn variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
                Log an enquiry
              </Btn>
            }
          />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Requirement</th>
                  <th>Source</th>
                  <th>Qualification</th>
                  <th>Next step</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="cursor-pointer" onClick={() => navigate(`/enquiries/${e.id}`)}>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-500">{e.ref}</td>
                    <td>
                      <p className="font-semibold text-slate-900">{e.customerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {e.phone} · {e.city}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {capacityText(e.requestedKw, e.requestedType)}
                      {e.wantsSubsidy && <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] text-emerald-700">subsidy</span>}
                    </td>
                    <td className="text-xs capitalize text-slate-500">{e.source}</td>
                    <td className="text-xs text-slate-600">
                      {e.roofAreaSqft ? `${e.roofAreaSqft} sq ft` : '—'}
                      {e.monthlyBill ? <span className="block text-[11px] text-slate-400">Bill {inr(e.monthlyBill)}</span> : null}
                    </td>
                    <td className="text-xs text-slate-600">{nextStep(e)}</td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge kind="enquiry" status={e.status} />
                        <span className="text-[10px] text-slate-400">{timeAgo(e.createdAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title="Log an enquiry"
        subtitle="Calls, WhatsApp messages and walk-ins belong here too."
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={closeForm} disabled={busy}>
              Cancel
            </Btn>
            <Btn variant="accent" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Saving…' : 'Save enquiry'}
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" className="sm:col-span-1">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" />
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as EnquirySource })}>
              <option value="web">Website form</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="call">Phone call</option>
              <option value="walk-in">Walk-in</option>
            </Select>
          </Field>
          <Field label="Site address" className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House / plot, street, area" />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Pincode">
            <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} maxLength={6} inputMode="numeric" pattern="\d{6}" placeholder="6-digit" />
          </Field>
          <Field label="System size">
            <Select value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })}>
              {[1, 2, 3, 4, 5].map((kw) => (
                <option key={kw} value={kw}>
                  {kw} kW
                </option>
              ))}
            </Select>
          </Field>
          <Field label="System type">
            <Select value={form.systemType} onChange={(e) => setForm({ ...form, systemType: e.target.value as SystemType })}>
              <option value="on-grid">On-Grid</option>
              <option value="off-grid">Off-Grid (battery)</option>
              <option value="hardware">Panel set only</option>
            </Select>
          </Field>
          <Field label="Monthly electricity bill (₹)">
            <Input
              type="number"
              min={0}
              value={form.monthlyBill}
              onChange={(e) => setForm({ ...form, monthlyBill: e.target.value })}
              placeholder="e.g. 4200"
            />
          </Field>
          <Field label="Shadow-free roof area (sq ft)">
            <Input
              type="number"
              min={0}
              value={form.roofAreaSqft}
              onChange={(e) => setForm({ ...form, roofAreaSqft: e.target.value })}
              placeholder="e.g. 320"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.wantsSubsidy}
              onChange={(e) => setForm({ ...form, wantsSubsidy: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-amber-600"
            />
            Customer wants the government rooftop subsidy handled by us
          </label>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="What did the customer say? Roof type, shading, timeline…"
            />
          </Field>
        </div>
        {formError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
      </Modal>
    </>
  );
}

function nextStep(e: EnquiryRow) {
  switch (e.status) {
    case 'new':
      return 'Call and qualify';
    case 'contacted':
      return 'Qualify roof & bill';
    case 'qualified':
      return 'Book site survey';
    case 'survey_scheduled':
      return 'Complete survey';
    case 'surveyed':
      return 'Approve survey';
    case 'survey_approved':
      return 'Prepare quote';
    case 'quoted':
      return e.quoteRef ? `Follow up ${e.quoteRef}` : 'Follow up quote';
    case 'won':
      return 'See order';
    case 'lost':
      return e.lostReason ? `Lost — ${e.lostReason}` : 'Closed';
    default:
      return '—';
  }
}
