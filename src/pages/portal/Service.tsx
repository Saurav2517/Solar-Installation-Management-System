import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import {
  Badge,
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
  Textarea,
  useToast,
} from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { fmtDate, timeAgo } from '../../lib/format';
import type { PortalTicket, PortalTicketsData } from '../../lib/types';
import type { TicketPriority } from '../../../shared/types';

const PRIORITY_TONE = { high: 'red', medium: 'amber', low: 'slate' } as const;

function PriorityPill({ priority }: { priority: TicketPriority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{priority[0].toUpperCase() + priority.slice(1)}</Badge>;
}

function WarrantyPill({ status }: { status: PortalTicket['warrantyStatus'] }) {
  if (status === 'in_warranty') return <Badge tone="green">In warranty</Badge>;
  if (status === 'out_of_warranty') return <Badge tone="red">Chargeable</Badge>;
  return <Badge tone="slate">Warranty unknown</Badge>;
}

export default function PortalService() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<PortalTicketsData>('/portal/tickets');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<PortalTicket | null>(null);
  const [form, setForm] = useState({
    serialNo: '',
    faultCode: '',
    description: '',
    priority: 'medium' as TicketPriority,
  });

  const serials = data?.serials ?? [];
  const tickets = data?.tickets ?? [];
  const selected = useMemo(
    () => serials.find((s) => s.serialNo === form.serialNo),
    [serials, form.serialNo],
  );

  const openForm = () => {
    setForm({
      serialNo: serials[0]?.serialNo ?? '',
      faultCode: '',
      description: '',
      priority: 'medium',
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.description.trim()) {
      toast('Describe the fault so the service team can help', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ ticket: PortalTicket }>('/portal/tickets', {
        serialNo: form.serialNo || undefined,
        faultCode: form.faultCode,
        description: form.description,
        priority: form.priority,
      });
      setOpen(false);
      setCreated(res.ticket);
      toast(`Service ticket ${res.ticket.ref} created`);
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading your service tickets…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <>
      <PageHeader
        title="Service & support"
        subtitle="Raise a service ticket for your installed equipment and track it with the SunPower service desk."
        actions={
          <Btn variant="accent" onClick={openForm}>
            <Icon name="plus" className="h-4 w-4" />
            Raise a ticket
          </Btn>
        }
      />

      {created && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-900">Service ticket {created.ref} raised</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                Our service desk can see it now. Keep this ID for follow-ups.
              </p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setCreated(null)}>
              Dismiss
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">My tickets</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {tickets.length} ticket{tickets.length === 1 ? '' : 's'} raised
          </p>
        </div>
        {tickets.length === 0 ? (
          <Empty
            title="No service tickets yet"
            hint="Raise a ticket when something on your system needs attention."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Equipment</th>
                  <th>Fault</th>
                  <th>Priority</th>
                  <th>Warranty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-slate-800">{t.ref}</span>
                      <span className="block text-[10px] text-slate-400">{timeAgo(t.reportedAt)}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="text-xs text-slate-700">{t.productName ?? t.productId ?? 'General'}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {t.serialNo ?? 'No unit selected'}
                      </span>
                    </td>
                    <td className="max-w-[240px]">
                      <p className="truncate text-xs text-slate-700">{t.faultCode ?? 'Service call'}</p>
                      <p className="truncate text-[11px] text-slate-500">{t.description}</p>
                    </td>
                    <td>
                      <PriorityPill priority={t.priority} />
                    </td>
                    <td>
                      <WarrantyPill status={t.warrantyStatus} />
                    </td>
                    <td>
                      <StatusBadge kind="ticket" status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="px-5 py-4">
          <h2 className="section-title">Need urgent help?</h2>
          <p className="mt-1 text-xs text-slate-500">
            Call +91 98450 10101. For high-priority faults our team responds within 24 hours.
          </p>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a service ticket"
        subtitle="Tell us which unit is faulty and what you are seeing. A ticket ID is generated as soon as you submit."
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="accent" disabled={busy || !form.description.trim()} onClick={() => void submit()}>
              {busy ? 'Creating…' : 'Create ticket'}
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Equipment"
            hint="Installed units registered to your account"
            className="sm:col-span-2"
          >
            <Select
              value={form.serialNo}
              onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
            >
              <option value="">General service request (no specific unit)</option>
              {serials.map((s) => (
                <option key={s.id} value={s.serialNo}>
                  {s.productName} · {s.serialNo}
                </option>
              ))}
            </Select>
          </Field>

          {selected && (
            <div
              className={`sm:col-span-2 rounded-lg px-3 py-2 text-xs ${
                selected.inWarranty ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <strong>{selected.productName}</strong> · {selected.orderRef ?? 'your order'} · warranty{' '}
              {selected.inWarranty ? `active until ${fmtDate(selected.warrantyEnd)}` : 'expired'}.
              {selected.inWarranty
                ? ' This repair is covered under warranty.'
                : ' Parts and labour may be chargeable.'}
            </div>
          )}

          <Field label="Fault code" hint="Optional — e.g. E-03, no display">
            <Input
              value={form.faultCode}
              onChange={(e) => setForm({ ...form, faultCode: e.target.value })}
              placeholder="E-03"
            />
          </Field>
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
            >
              <option value="high">High — 24h SLA</option>
              <option value="medium">Medium — 48h SLA</option>
              <option value="low">Low — 72h SLA</option>
            </Select>
          </Field>
          <Field label="What is happening?" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Fault code, when it started, what you see on the inverter or app…"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
