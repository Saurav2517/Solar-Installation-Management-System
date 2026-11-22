import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  ErrorState,
  Field,
  Input,
  KV,
  Loading,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { fmtDate, fmtDateTime, inr, timeAgo } from '../lib/format';
import type { TicketDetailData } from '../lib/types';
import { PriorityBadge, WarrantyBadge } from './Tickets';

export default function TicketDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<TicketDetailData>(`/tickets/${id}`);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    assignedTo: '',
    diagnosis: '',
    resolution: '',
    labourHours: '1.5',
    labourRate: '450',
    parts: [] as Array<{ sku: string; qty: string }>,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      assignedTo: data.ticket.assignedTo ?? '',
      diagnosis: data.ticket.diagnosis ?? '',
      resolution: data.ticket.resolution ?? '',
      labourHours: String(data.ticket.labourHours || 1.5),
      labourRate: String(data.ticket.labourRate || 450),
      parts: data.ticket.parts.map((p) => ({ sku: p.sku, qty: String(p.qty) })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.ticket.id]);

  const preview = useMemo(() => {
    if (!data) return { parts: 0, labour: 0, visit: 0, total: 0 };
    const parts = form.parts.reduce((sum, p) => {
      const product = data.products.find((x) => x.sku === p.sku);
      return sum + (product?.sellPrice ?? 0) * Number(p.qty || 0);
    }, 0);
    const labour = Math.round(Number(form.labourHours || 0) * Number(form.labourRate || 0));
    const visit = data.ticket.chargeable ? data.ticket.visitCharge || 500 : 0;
    return { parts, labour, visit, total: data.ticket.chargeable ? parts + labour + visit : 0 };
  }, [data, form.parts, form.labourHours, form.labourRate]);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast(message);
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const { ticket, invoice, serial, product, order } = data;
  const finished = ['resolved', 'closed', 'confirmed'].includes(ticket.status);

  return (
    <>
      <PageHeader
        title={`Ticket ${ticket.ref}`}
        subtitle={`${ticket.customerName} · reported ${fmtDateTime(ticket.reportedAt)}`}
        backTo="/tickets"
        backLabel="All tickets"
        actions={
          <>
            <PriorityBadge priority={ticket.priority} />
            <WarrantyBadge status={ticket.warrantyStatus} />
            <StatusBadge kind="ticket" status={ticket.status} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card
            className={`border-l-4 ${
              ticket.warrantyStatus === 'in_warranty'
                ? 'border-l-emerald-500'
                : ticket.warrantyStatus === 'out_of_warranty'
                  ? 'border-l-rose-500'
                  : 'border-l-slate-400'
            }`}
          >
            <div className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Warranty verdict</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {ticket.warrantyStatus === 'in_warranty'
                      ? 'Covered — repair at no cost'
                      : ticket.warrantyStatus === 'out_of_warranty'
                        ? 'Out of warranty — billable'
                        : 'No serial matched — verify before billing'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {serial ? (
                      <>
                        {product?.name} · <span className="font-mono">{serial.serialNo}</span> · warranty ends {fmtDate(serial.warrantyEnd)}
                      </>
                    ) : (
                      'No serial number recorded on this ticket.'
                    )}
                  </p>
                </div>
                {ticket.warrantyStatus === 'in_warranty' ? (
                  <Icon name="shield" className="h-8 w-8 text-emerald-500" />
                ) : (
                  <Icon name="receipt" className="h-8 w-8 text-rose-400" />
                )}
              </div>
              {ticket.chargeable && (
                <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                  Parts, labour and the visit charge will be invoiced automatically when you resolve this ticket.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Reported fault</h2>
              <p className="mt-1 text-sm text-slate-700">{ticket.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ticket.faultCode && <Badge tone="amber">{ticket.faultCode}</Badge>}
                <Badge tone="slate">SLA due {fmtDateTime(ticket.slaDueAt)}</Badge>
                {data.overdue && <Badge tone="red">Overdue</Badge>}
                {ticket.photos.length > 0 && <Badge tone="blue">{ticket.photos.length} photos</Badge>}
              </div>
            </div>

            {!finished ? (
              <div className="space-y-4 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Assign technician">
                    <Select
                      value={form.assignedTo}
                      onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {data.technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.role})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Labour rate (₹/hour)">
                    <Input type="number" value={form.labourRate} onChange={(e) => setForm({ ...form, labourRate: e.target.value })} />
                  </Field>
                  <Field label="Diagnosis" className="sm:col-span-2">
                    <Textarea
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      placeholder="What was actually wrong?"
                    />
                  </Field>
                  <Field label="Work done" className="sm:col-span-2">
                    <Textarea
                      value={form.resolution}
                      onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                      placeholder="Parts replaced, tests done, readings taken…"
                    />
                  </Field>
                  <Field label="Labour hours">
                    <Input type="number" step="0.5" value={form.labourHours} onChange={(e) => setForm({ ...form, labourHours: e.target.value })} />
                  </Field>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label mb-0">Parts used</span>
                    <Btn variant="ghost" size="sm" onClick={() => setForm({ ...form, parts: [...form.parts, { sku: data.products[0]?.sku ?? '', qty: '1' }] })}>
                      Add part
                    </Btn>
                  </div>
                  {form.parts.length === 0 ? (
                    <p className="text-xs text-slate-500">No parts replaced — labour only.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.parts.map((p, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Select
                            value={p.sku}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                parts: form.parts.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x)),
                              })
                            }
                          >
                            {data.products.map((prod) => (
                              <option key={prod.sku} value={prod.sku}>
                                {prod.name} · {inr(prod.sellPrice)}
                              </option>
                            ))}
                          </Select>
                          <Input
                            type="number"
                            value={p.qty}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                parts: form.parts.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)),
                              })
                            }
                            className="w-20"
                          />
                          <Btn variant="ghost" size="sm" onClick={() => setForm({ ...form, parts: form.parts.filter((_, i) => i !== idx) })}>
                            <Icon name="trash" className="h-3.5 w-3.5" />
                          </Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span>Parts {inr(preview.parts)}</span>
                    <span>Labour {inr(preview.labour)}</span>
                    <span>Visit {inr(preview.visit)}</span>
                    <span className="font-bold">{ticket.chargeable ? `Customer pays ${inr(preview.total)}` : 'Warranty — no charge'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Btn
                    variant="ghost"
                    disabled={busy || !form.assignedTo}
                    onClick={() => void run(() => api.patch(`/tickets/${ticket.id}`, { assignedTo: form.assignedTo, status: 'in_progress' }), 'Ticket started')}
                  >
                    Start work
                  </Btn>
                  <Btn
                    variant="accent"
                    disabled={busy || !form.diagnosis.trim() || !form.resolution.trim()}
                    onClick={() =>
                      void run(
                        () =>
                          api.post(`/tickets/${ticket.id}/resolve`, {
                            assignedTo: form.assignedTo || undefined,
                            diagnosis: form.diagnosis,
                            resolution: form.resolution,
                            labourHours: Number(form.labourHours),
                            labourRate: Number(form.labourRate),
                            parts: form.parts.filter((p) => p.sku).map((p) => ({ sku: p.sku, qty: Number(p.qty) })),
                          }),
                        'Ticket resolved — customer confirmation pending',
                      )
                    }
                  >
                    Mark resolved
                  </Btn>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-5 py-4">
                <div>
                  <p className="label">Diagnosis</p>
                  <p className="text-sm text-slate-700">{ticket.diagnosis}</p>
                </div>
                <div>
                  <p className="label">Work done</p>
                  <p className="text-sm text-slate-700">{ticket.resolution}</p>
                </div>
                <dl className="grid gap-x-8 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                  <KV label="Labour" value={`${ticket.labourHours} h × ${inr(ticket.labourRate)}`} />
                  <KV label="Labour total" value={inr(ticket.labourTotal)} />
                  <KV label="Parts" value={ticket.parts.length ? ticket.parts.map((p) => `${p.qty}× ${p.name}`).join(', ') : 'None'} />
                  <KV label="Parts total" value={inr(ticket.partsTotal)} />
                  <KV label="Visit charge" value={inr(ticket.visitCharge)} />
                  <KV
                    label={ticket.chargeable ? 'Customer pays' : 'Warranty cost to us'}
                    value={inr(ticket.chargeable ? ticket.totalCharge : ticket.warrantyCost)}
                  />
                </dl>
                {invoice && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <span>
                      Invoice <strong>{invoice.number}</strong> · {inr(invoice.total)} · {invoice.status}
                    </span>
                    {invoice.status !== 'paid' ? (
                      <Btn
                        variant="accent"
                        size="sm"
                        disabled={busy}
                        onClick={() => void run(() => api.post(`/invoices/${invoice.id}/pay`, { method: 'upi' }), 'Service invoice paid')}
                      >
                        Collect payment
                      </Btn>
                    ) : (
                      <Badge tone="green">Paid</Badge>
                    )}
                  </div>
                )}
                {ticket.status === 'resolved' && (
                  <div className="rounded-lg bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-900">Waiting for the customer to confirm everything works.</p>
                    <Btn
                      variant="primary"
                      size="sm"
                      className="mt-2"
                      disabled={busy}
                      onClick={() => void run(() => api.post(`/tickets/${ticket.id}/confirm`, {}), 'Customer confirmed — ticket closed')}
                    >
                      Customer confirmed — close ticket
                    </Btn>
                  </div>
                )}
                {['closed', 'confirmed'].includes(ticket.status) && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                    <Icon name="check" className="h-4 w-4" />
                    Customer confirmed on {fmtDateTime(ticket.confirmedAt)}. Ticket closed.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="card-pad">
            <h2 className="section-title mb-3">Customer &amp; site</h2>
            <p className="text-sm font-semibold text-slate-900">{ticket.customerName}</p>
            <p className="text-xs text-slate-500">{ticket.phone}</p>
            <p className="mt-1 text-xs text-slate-500">{ticket.address}</p>
            {order && (
              <Link to={`/orders/${order.id}`} className="mt-2 inline-block text-xs font-semibold text-amber-700">
                Order {order.ref} →
              </Link>
            )}
            <dl className="mt-3 border-t border-slate-100 pt-2">
              <KV label="Assigned to" value={data.technicianName ?? 'Unassigned'} />
              <KV label="Reported" value={timeAgo(ticket.reportedAt)} />
              <KV label="Priority" value={<PriorityBadge priority={ticket.priority} />} />
            </dl>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">Installed unit</h2>
            {serial ? (
              <>
                <p className="text-sm font-semibold text-slate-900">{product?.name}</p>
                <p className="font-mono text-[11px] text-slate-500">{serial.serialNo}</p>
                <dl className="mt-3">
                  <KV label="Dispatched" value={fmtDate(serial.dispatchedAt)} />
                  <KV label="Installed" value={fmtDate(serial.installedAt)} />
                  <KV label="Warranty start" value={fmtDate(serial.warrantyStart)} />
                  <KV label="Warranty end" value={fmtDate(serial.warrantyEnd)} />
                  <KV label="Status" value={<StatusBadge kind="serial" status={serial.status} />} />
                </dl>
              </>
            ) : (
              <p className="text-xs text-slate-500">No serial recorded for this complaint.</p>
            )}
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">History</h2>
            <ol className="space-y-2 text-[11px]">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-rose-400" />
                <span>
                  <strong className="block text-slate-700">Reported</strong>
                  {fmtDateTime(ticket.reportedAt)}
                </span>
              </li>
              <li className="flex gap-2">
                <span className={`mt-1 h-2 w-2 rounded-full ${ticket.assignedTo ? 'bg-amber-400' : 'bg-slate-200'}`} />
                <span>
                  <strong className="block text-slate-700">Assigned</strong>
                  {data.technicianName ?? 'Not yet'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className={`mt-1 h-2 w-2 rounded-full ${ticket.resolvedAt ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <span>
                  <strong className="block text-slate-700">Resolved</strong>
                  {ticket.resolvedAt ? fmtDateTime(ticket.resolvedAt) : 'Pending'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className={`mt-1 h-2 w-2 rounded-full ${ticket.confirmedAt ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <span>
                  <strong className="block text-slate-700">Customer confirmed</strong>
                  {ticket.confirmedAt ? fmtDateTime(ticket.confirmedAt) : 'Pending'}
                </span>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
