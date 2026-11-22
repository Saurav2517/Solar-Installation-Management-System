import { useState } from 'react';
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
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, fmtDate, fmtDateTime, inr } from '../lib/format';
import type { OrderDetailData } from '../lib/types';
import type { PaymentMethod, SubsidyStatus } from '../../shared/types';

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<OrderDetailData>(`/orders/${id}`);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank');
  const [advance, setAdvance] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [busy, setBusy] = useState(false);

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

  const { order, customer, installation, invoice, subsidy, serials, payments, steps } = data;
  const balance = Math.max(0, order.total - order.paidAmount);
  const crewNames = order.crewIds.map((cid) => data.technicians.find((t) => t.id === cid)?.name ?? cid);

  const recordPayment = () => {
    const amount = Number(payAmount || balance);
    void run(
      () => api.post(`/orders/${order.id}/payments`, { amount, method: payMethod }),
      'Payment recorded',
    ).then(() => setPayAmount(''));
  };

  const confirmOrder = () => {
    const amount = Number(advance || (order.paidAmount > 0 ? 0 : Math.round(order.total * 0.3)));
    void run(
      () =>
        api.post(`/orders/${order.id}/confirm`, {
          advance: amount,
          method: payMethod,
          scheduledDate: installDate || undefined,
        }),
      'Order confirmed — serials reserved and crew scheduled',
    );
  };

  const toggleDoc = (index: number) => {
    if (!subsidy) return;
    const docs = subsidy.docs.map((d, i) => (i === index ? { ...d, received: !d.received } : d));
    void run(() => api.patch(`/subsidies/${subsidy.id}`, { docs }), 'Subsidy documents updated');
  };

  const setSubsidyStatus = (status: SubsidyStatus) =>
    run(() => api.patch(`/subsidies/${subsidy!.id}`, { status }), `Subsidy marked ${status.replace('_', ' ')}`);

  return (
    <>
      <PageHeader
        title={`Order ${order.ref}`}
        subtitle={`${order.customerName} · ${capacityText(order.capacityKw, order.systemType)} · confirmed ${fmtDate(order.confirmedAt)}`}
        backTo="/orders"
        backLabel="All orders"
        actions={
          <>
            {order.status === 'confirmed' && (
              <Link to="/dispatch" className="btn btn-ghost btn-sm">
                <Icon name="truck" className="h-3.5 w-3.5" />
                Dispatch queue
              </Link>
            )}
            {installation && (
              <Link to={`/installations/${installation.id}`} className="btn btn-ghost btn-sm">
                <Icon name="wrench" className="h-3.5 w-3.5" />
                Job sheet
              </Link>
            )}
            <StatusBadge kind="order" status={order.status} />
          </>
        }
      />

      {order.status === 'requested' && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="section-title">Customer order request</h2>
              <Badge tone="amber">Awaiting confirmation</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {order.requestedBy ? `Placed by ${order.requestedBy}` : 'Placed in the customer portal'} on{' '}
              {fmtDate(order.createdAt)}. Confirming reserves serial numbers, raises the invoice and schedules the crew.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field
                label={order.paidAmount > 0 ? 'Extra advance (₹)' : 'Advance received (₹)'}
                className="w-40"
                hint={order.paidAmount > 0 ? `${inr(order.paidAmount)} already collected online` : undefined}
              >
                <Input
                  type="number"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                  placeholder={order.paidAmount > 0 ? '0' : String(Math.round(order.total * 0.3))}
                />
              </Field>
              <Field label="Method" className="w-32">
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                  <option value="bank">Bank</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </Select>
              </Field>
              <Field label="Install date" className="w-44">
                <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
              </Field>
              <Btn variant="primary" disabled={busy} onClick={confirmOrder}>
                Confirm order
              </Btn>
              <span className="text-[11px] text-slate-600">
                {order.paidAmount > 0
                  ? 'Leave blank to confirm without another payment.'
                  : 'Leave the advance blank to take 30%.'}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Job checklist</h2>
              <p className="mt-0.5 text-xs text-slate-500">Every step from advance to subsidy, and what is still outstanding.</p>
            </div>
            <ol className="grid gap-2 px-5 py-4 sm:grid-cols-2">
              {steps.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      s.done ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white text-slate-300'
                    }`}
                  >
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  <span className={s.done ? 'text-slate-700' : 'font-medium text-slate-500'}>{s.label}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="section-title">Serial numbers &amp; warranty</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {serials.filter((s) => s.scanned).length}/{serials.length} scanned · warranty starts automatically on dispatch
                </p>
              </div>
              {order.status === 'confirmed' && (
                <Link to="/dispatch" className="btn btn-accent btn-sm">
                  Scan &amp; dispatch
                </Link>
              )}
            </div>
            {serials.length === 0 ? (
              <p className="px-5 py-4 text-xs text-slate-500">No serial-tracked units on this order.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Serial</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Warranty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serials.map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap font-mono text-[11px]">{s.serialNo}</td>
                        <td className="text-[11px]">{data.order.items.find((i) => i.sku === s.productId)?.name ?? s.productId}</td>
                        <td>
                          <StatusBadge kind="serial" status={s.status} />
                        </td>
                        <td className="whitespace-nowrap text-[11px]">
                          {s.warrantyEnd ? (
                            <>
                              {fmtDate(s.warrantyEnd)}
                              <span className="block text-[10px] text-emerald-600">
                                {new Date(s.warrantyEnd).getTime() > Date.now() ? 'In warranty' : 'Expired'}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Starts on dispatch</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Payments</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {inr(order.paidAmount)} received of {inr(order.total)} · balance {inr(balance)}
              </p>
            </div>
            <div className="px-5 py-4">
              {payments.length === 0 ? (
                <p className="text-xs text-slate-500">No payments recorded.</p>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-[11px]">{p.ref}</td>
                        <td className="whitespace-nowrap text-[11px]">{fmtDate(p.receivedAt)}</td>
                        <td className="text-[11px] capitalize">{p.kind}</td>
                        <td className="text-[11px] uppercase">{p.method}</td>
                        <td>
                          {p.status === 'pending' ? (
                            <Badge tone="amber">Pending</Badge>
                          ) : p.status === 'rejected' ? (
                            <Badge tone="red">Rejected</Badge>
                          ) : (
                            <Badge tone="green">Verified</Badge>
                          )}
                        </td>
                        <td className="mono text-right text-xs font-semibold">{inr(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {balance > 0 && order.status !== 'requested' && (
                <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
                  <Field label="Amount (₹)" className="w-36">
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(Math.round(balance))} />
                  </Field>
                  <Field label="Method" className="w-36">
                    <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                      <option value="bank">Bank</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </Select>
                  </Field>
                  <Btn variant="primary" onClick={recordPayment} disabled={busy}>
                    Record payment
                  </Btn>
                  <span className="text-[11px] text-slate-500">Leave the amount blank to collect the full balance.</span>
                </div>
              )}
            </div>
          </Card>

          {invoice && (
            <Card className="overflow-hidden">
              <div id="print-area" className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">SunPower Solutions</p>
                    <p className="text-[11px] text-slate-500">Rooftop solar · Bengaluru · GSTIN 29ABCDE1234F1Z5</p>
                    <h2 className="mt-2 text-lg font-bold text-slate-900">Tax invoice {invoice.number}</h2>
                    <p className="text-[11px] text-slate-500">Issued {fmtDate(invoice.issuedAt)} · due {fmtDate(invoice.dueAt)}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge kind="invoice" status={invoice.status} />
                    <p className="mono mt-2 text-xl font-bold">{inr(invoice.total)}</p>
                    <p className="text-[11px] text-slate-500">Balance {inr(Math.max(0, invoice.total - invoice.paidAmount))}</p>
                  </div>
                </div>
                <div className="grid gap-4 py-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Billed to</p>
                    <p className="text-sm font-semibold text-slate-900">{invoice.customerName}</p>
                    <p className="text-[11px] text-slate-500">
                      {customer?.address}, {customer?.city} {customer?.pincode}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <p className="font-semibold text-slate-800">{invoice.description}</p>
                    <p className="mt-1">Order {order.ref} · {capacityText(order.capacityKw, order.systemType)}</p>
                  </div>
                </div>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-xs">Supply and installation of {order.capacityKw} kW {order.systemType} solar system</td>
                      <td className="mono text-right text-xs">{inr(invoice.amount)}</td>
                    </tr>
                    <tr>
                      <td className="text-xs">GST</td>
                      <td className="mono text-right text-xs">{inr(invoice.taxAmount)}</td>
                    </tr>
                    <tr>
                      <td className="text-xs font-semibold">Total</td>
                      <td className="mono text-right text-sm font-bold">{inr(invoice.total)}</td>
                    </tr>
                    <tr>
                      <td className="text-xs">Received</td>
                      <td className="mono text-right text-xs text-emerald-700">{inr(invoice.paidAmount)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-[10px] text-slate-400">
                  Payment by bank transfer or UPI. Warranty is tracked per serial number in the SunPower portal.
                </p>
              </div>
              <div className="no-print flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
                <Btn variant="ghost" size="sm" onClick={() => window.print()}>
                  <Icon name="download" className="h-3.5 w-3.5" />
                  Print invoice
                </Btn>
                {invoice.status === 'draft' && (
                  <Btn variant="primary" size="sm" disabled={busy} onClick={() => void run(() => api.post(`/invoices/${invoice.id}/issue`), 'Invoice issued')}>
                    Issue invoice
                  </Btn>
                )}
                {invoice.status !== 'paid' && (
                  <Btn
                    variant="accent"
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(() => api.post(`/invoices/${invoice.id}/pay`, { method: 'upi' }), 'Invoice marked paid')}
                  >
                    Record full payment
                  </Btn>
                )}
              </div>
            </Card>
          )}

          {subsidy && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="section-title">Subsidy paperwork</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {subsidy.scheme} · {subsidy.applicationNo} · {inr(subsidy.amount)}
                  </p>
                </div>
                <StatusBadge kind="subsidy" status={subsidy.status} />
              </div>
              <div className="px-5 py-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Documents ({subsidy.docs.filter((d) => d.received).length}/{subsidy.docs.length})
                </p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {subsidy.docs.map((doc, i) => (
                    <li key={doc.name}>
                      <button
                        onClick={() => toggleDoc(i)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            doc.received ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {doc.received && <Icon name="check" className="h-2.5 w-2.5" />}
                        </span>
                        <span className={doc.received ? 'text-slate-700' : 'text-slate-500'}>{doc.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {subsidy.status === 'documents_pending' && (
                    <Btn variant="primary" size="sm" disabled={busy} onClick={() => void setSubsidyStatus('submitted')}>
                      Submit application
                    </Btn>
                  )}
                  {subsidy.status === 'submitted' && (
                    <Btn variant="ghost" size="sm" disabled={busy} onClick={() => void setSubsidyStatus('under_review')}>
                      Mark under review
                    </Btn>
                  )}
                  {['submitted', 'under_review'].includes(subsidy.status) && (
                    <Btn variant="primary" size="sm" disabled={busy} onClick={() => void setSubsidyStatus('approved')}>
                      Mark approved
                    </Btn>
                  )}
                  {subsidy.status === 'approved' && (
                    <Btn variant="accent" size="sm" disabled={busy} onClick={() => void setSubsidyStatus('received')}>
                      Record payout received
                    </Btn>
                  )}
                  {subsidy.receivedAt && <Badge tone="green">Payout {fmtDate(subsidy.receivedAt)}</Badge>}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="card-pad">
            <h2 className="section-title mb-3">Customer &amp; site</h2>
            <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
            <p className="text-xs text-slate-500">{customer?.phone}</p>
            <p className="mt-1 text-xs text-slate-500">
              {customer?.address}, {customer?.city} {customer?.pincode}
            </p>
            <dl className="mt-3 border-t border-slate-100 pt-2">
              <KV label="Scheduled" value={fmtDate(order.scheduledDate)} />
              <KV label="Crew" value={crewNames.join(', ') || '—'} />
              <KV label="Wants subsidy" value={order.wantsSubsidy ? 'Yes' : 'No'} />
              <KV label="Quote" value={data.quote?.ref ?? '—'} />
            </dl>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">Job profitability</h2>
            <dl>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Order value</dt>
                <dd className="mono font-medium">{inr(order.total)}</dd>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Parts cost</dt>
                <dd className="mono font-medium">−{inr(order.costTotal)}</dd>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Crew labour</dt>
                <dd className="mono font-medium">−{inr(order.labourCost)}</dd>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Transport &amp; misc</dt>
                <dd className="mono font-medium">−{inr(order.otherCost)}</dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-200 py-1.5 text-sm">
                <dt className="font-semibold">Profit</dt>
                <dd className={`mono font-bold ${data.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{inr(data.profit)}</dd>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Margin</dt>
                <dd className="font-semibold">{data.marginPct}%</dd>
              </div>
            </dl>
            {order.labourCost === 0 && (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
                Labour is unknown until the crew signs off the installation.
              </p>
            )}
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-2">Bill of materials</h2>
            <ul className="space-y-1.5">
              {order.items.map((item) => (
                <li key={item.sku} className="flex justify-between gap-2 text-[11px]">
                  <span className="min-w-0 text-slate-600">
                    {item.name}
                    <span className="block text-[10px] text-slate-400">
                      {item.qty} {item.unit} × {inr(item.unitPrice)}
                    </span>
                  </span>
                  <span className="mono shrink-0 font-medium">{inr(item.total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="mono">{inr(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST</span>
                <span className="mono">{inr(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span className="mono">{inr(order.total)}</span>
              </div>
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">Timeline</h2>
            <ol className="space-y-2 text-[11px]">
              <TimelineItem label="Confirmed" at={order.confirmedAt} done />
              <TimelineItem label="Dispatched" at={order.dispatchedAt} done={!!order.dispatchedAt} />
              <TimelineItem label="Installed & signed" at={order.installedAt} done={!!order.installedAt} />
              <TimelineItem label="Closed" at={order.closedAt} done={!!order.closedAt} />
            </ol>
            {installation && (
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px]">
                <p className="font-semibold text-slate-700">Installation {installation.ref}</p>
                <p className="text-slate-500">
                  {installation.status.replace('_', ' ')} · {fmtDateTime(installation.finishedAt)}
                </p>
                <Link to={`/installations/${installation.id}`} className="mt-1 inline-block font-semibold text-amber-700">
                  Open job sheet →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function TimelineItem({ label, at, done }: { label: string; at?: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <span className={done ? 'font-medium text-slate-700' : 'text-slate-400'}>{label}</span>
      <span className="ml-auto text-slate-400">{at ? fmtDate(at) : '—'}</span>
    </li>
  );
}
