import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
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
  Tabs,
  Textarea,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { fmtDate, timeAgo } from '../lib/format';
import type { TicketsData, WarrantyLookup } from '../lib/types';
import type { TicketPriority } from '../../shared/types';

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Awaiting customer' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

export default function Tickets() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<TicketsData>('/tickets');
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(params.get('new') === '1');
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<WarrantyLookup | null>(null);
  const [form, setForm] = useState({
    customerId: params.get('customer') ?? '',
    serialNo: params.get('serial') ?? '',
    faultCode: '',
    description: '',
    priority: 'medium' as TicketPriority,
    assignedTo: '',
  });

  useEffect(() => {
    if (params.get('new') === '1') {
      setOpen(true);
      setForm((f) => ({
        ...f,
        customerId: params.get('customer') ?? f.customerId,
        serialNo: params.get('serial') ?? f.serialNo,
      }));
    }
  }, [params]);

  useEffect(() => {
    const serial = params.get('serial');
    if (serial) {
      void api
        .get<WarrantyLookup>(`/warranty?serial=${encodeURIComponent(serial)}`)
        .then(setLookup)
        .catch(() => setLookup(null));
    }
  }, [params]);

  const rows = data?.tickets ?? [];
  const counts = useMemo(
    () => ({
      open: rows.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status)).length,
      resolved: rows.filter((t) => t.status === 'resolved').length,
      closed: rows.filter((t) => ['closed', 'confirmed'].includes(t.status)).length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = rows.filter((t) => {
    const tabOk =
      tab === 'all'
        ? true
        : tab === 'open'
          ? ['open', 'assigned', 'in_progress'].includes(t.status)
          : tab === 'resolved'
            ? t.status === 'resolved'
            : ['closed', 'confirmed'].includes(t.status);
    if (!tabOk) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [t.customerName, t.ref, t.serialNo, t.faultCode, t.description].some((v) => v?.toLowerCase().includes(q));
  });

  const close = () => {
    setOpen(false);
    setLookup(null);
    if (params.get('new')) {
      setParams({}, { replace: true });
    }
  };

  const checkSerial = async () => {
    if (!form.serialNo.trim()) return;
    try {
      setLookup(await api.get<WarrantyLookup>(`/warranty?serial=${encodeURIComponent(form.serialNo)}`));
    } catch {
      setLookup({ found: false });
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ ticket: { id: string } }>('/tickets', form);
      toast('Ticket raised — support has the full history');
      close();
      navigate(`/tickets/${res.ticket.id}`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Service tickets"
        subtitle="Find the customer and the exact serial in seconds, see the warranty, and track the complaint until they confirm it works."
        actions={
          <Btn variant="accent" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            New ticket
          </Btn>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full overflow-x-auto">
            <Tabs tabs={TABS.map((t) => ({ ...t, count: counts[t.id as keyof typeof counts] }))} active={tab} onChange={setTab} />
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, serial, fault…"
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
          <Empty title="No tickets here" hint="Raise a ticket when a customer reports a fault." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Fault</th>
                  <th>Warranty</th>
                  <th>Priority</th>
                  <th>Technician</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
                    <td className="whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600">{t.ref}</span>
                      <span className="block text-[10px] text-slate-400">{timeAgo(t.reportedAt)}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-900">{t.customerName}</p>
                      <p className="text-[11px] text-slate-500">{t.phone}</p>
                    </td>
                    <td className="max-w-[220px]">
                      <p className="truncate text-xs text-slate-700">{t.faultCode ?? 'Service call'}</p>
                      <p className="truncate font-mono text-[10px] text-slate-400">{t.serialNo ?? 'no serial recorded'}</p>
                    </td>
                    <td>
                      <WarrantyBadge status={t.warrantyStatus} />
                    </td>
                    <td>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="text-xs text-slate-600">{t.technicianName ?? 'Unassigned'}</td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge kind="ticket" status={t.status} />
                        {t.overdue && <Badge tone="red">SLA overdue</Badge>}
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
        open={open}
        onClose={close}
        title="Raise a service ticket"
        subtitle="Scan the faulty unit's serial to pull the customer, order and warranty automatically."
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={close}>
              Cancel
            </Btn>
            <Btn variant="accent" disabled={busy || !form.description.trim()} onClick={() => void submit()}>
              {busy ? 'Saving…' : 'Create ticket'}
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Serial number" hint="Inverter, battery, controller or panel" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input
                value={form.serialNo}
                onChange={(e) => {
                  setForm({ ...form, serialNo: e.target.value });
                  setLookup(null);
                }}
                onBlur={() => void checkSerial()}
                placeholder="e.g. INV-OG-3-00007"
                className="font-mono text-xs"
              />
              <Btn variant="ghost" onClick={() => void checkSerial()}>
                Check
              </Btn>
            </div>
          </Field>

          {lookup && (
            <div className={`sm:col-span-2 rounded-lg px-3 py-2 text-xs ${lookup.found && lookup.inWarranty ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {!lookup.found ? (
                'No unit found for that serial — you can still raise a ticket against the customer.'
              ) : (
                <>
                  <strong>{lookup.product?.name}</strong> · {lookup.customer?.name} · warranty{' '}
                  {lookup.inWarranty ? 'active' : 'expired'} ({fmtDate(lookup.unit?.warrantyEnd)}).{' '}
                  {lookup.inWarranty ? 'This repair is free for the customer.' : 'Parts and labour will be billed.'}
                </>
              )}
            </div>
          )}

          <Field label="Customer" hint="Optional if the serial was found">
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer</option>
              {(data?.customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fault code">
            <Input value={form.faultCode} onChange={(e) => setForm({ ...form, faultCode: e.target.value })} placeholder="E-03, no display…" />
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}>
              <option value="high">High — 24h SLA</option>
              <option value="medium">Medium — 48h SLA</option>
              <option value="low">Low — 72h SLA</option>
            </Select>
          </Field>
          <Field label="Assign technician">
            <Select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Unassigned</option>
              {(data?.technicians ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What did the customer report?" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Fault code, when it started, what they see on the app or inverter…"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function WarrantyBadge({ status }: { status: string }) {
  if (status === 'in_warranty') return <Badge tone="green">In warranty</Badge>;
  if (status === 'out_of_warranty') return <Badge tone="red">Chargeable</Badge>;
  return <Badge tone="slate">Unknown</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === 'high' ? 'red' : priority === 'medium' ? 'amber' : 'slate';
  return <Badge tone={tone}>{priority[0].toUpperCase() + priority.slice(1)}</Badge>;
}
