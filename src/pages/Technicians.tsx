import { useState } from 'react';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Select,
  Stat,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { fmtDate, inr, inrCompact } from '../lib/format';
import type { TechniciansData } from '../lib/types';

export default function Technicians() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<TechniciansData>('/technicians');
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', role: 'technician', hourlyRate: '350' });

  const pay = async (id: string, name: string) => {
    setBusy(id);
    try {
      const res = await api.post<{ amount: number }>(`/technicians/${id}/pay`, {});
      toast(`Paid ${name} ${inr(res.amount)}`);
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    setBusy('new');
    try {
      await api.post('/technicians', { ...form, hourlyRate: Number(form.hourlyRate) });
      toast('Technician added to the crew');
      setOpen(false);
      setForm({ name: '', phone: '', role: 'technician', hourlyRate: '350' });
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const crew = data.technicians;
  const unpaidHours = crew.reduce((s, t) => s + t.unpaidHours, 0);
  const payout = crew.reduce((s, t) => s + t.unpaidAmount, 0);
  const leads = crew.filter((t) => t.role === 'lead').length;

  return (
    <>
      <PageHeader
        title="Crew & payroll"
        subtitle="Signed hours from installations and service visits become technician pay — no notebooks."
        actions={
          <Btn variant="accent" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Add technician
          </Btn>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Technicians" value={crew.length} sub={`${leads} crew leads`} tone="blue" icon={<Icon name="users" />} />
        <Stat label="Unpaid hours" value={unpaidHours} sub="Installations + service" tone="amber" icon={<Icon name="clock" />} />
        <Stat label="Payout due" value={inrCompact(payout)} sub="Across all crews" tone="green" icon={<Icon name="money" />} />
        <Stat
          label="Jobs logged"
          value={data.timesheets.length}
          sub="Recent timesheets"
          tone="violet"
          icon={<Icon name="wrench" />}
        />
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">Technician ledger</h2>
          <p className="mt-0.5 text-xs text-slate-500">Hours come from job sheets and resolved tickets. Paying a technician books a salary expense.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Technician</th>
                <th>Role</th>
                <th>Phone</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Total hours</th>
                <th className="text-right">Unpaid</th>
                <th className="text-right">Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {crew.map((t) => (
                <tr key={t.id}>
                  <td>
                    <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                    <p className="text-[10px] capitalize text-slate-400">{t.skills.slice(0, 2).join(' · ') || 'General'}</p>
                  </td>
                  <td className="text-[11px] capitalize text-slate-600">{t.role}</td>
                  <td className="text-[11px] text-slate-500">{t.phone || '—'}</td>
                  <td className="mono text-right text-xs">{inr(t.hourlyRate)}/h</td>
                  <td className="mono text-right text-xs">{t.totalHours}</td>
                  <td className="mono text-right text-xs">
                    {t.unpaidHours}
                    {t.unpaidJobs > 0 && <span className="block text-[10px] text-slate-400">{t.unpaidJobs} jobs</span>}
                  </td>
                  <td className="mono text-right text-xs font-semibold">{inr(t.unpaidAmount)}</td>
                  <td className="text-right">
                    <Btn variant="ghost" size="sm" disabled={t.unpaidAmount <= 0 || busy === t.id} onClick={() => void pay(t.id, t.name)}>
                      Pay
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">Recent timesheets</h2>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Technician</th>
                <th>Source</th>
                <th className="text-right">Hours</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.timesheets.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-[11px]">{fmtDate(t.date)}</td>
                  <td className="text-xs">{t.technicianName}</td>
                  <td className="text-[11px] capitalize text-slate-500">
                    {t.source}
                    <span className="block font-mono text-[10px] text-slate-400">{t.refId}</span>
                  </td>
                  <td className="mono text-right text-xs">{t.hours}</td>
                  <td className="mono text-right text-xs">{inr(t.hours * t.rate)}</td>
                  <td>{t.paid ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">Unpaid</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a technician"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="accent" disabled={!form.name.trim() || busy === 'new'} onClick={() => void add()}>
              Add to crew
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="lead">Crew lead</option>
              <option value="technician">Technician</option>
              <option value="helper">Helper</option>
            </Select>
          </Field>
          <Field label="Hourly rate (₹)">
            <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
