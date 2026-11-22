import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  StatusBadge,
  Textarea,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, fmtDate, inr, inrCompact } from '../lib/format';
import type { QuoteDetailData } from '../lib/types';
import type { PaymentMethod } from '../../shared/types';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<QuoteDetailData>(`/quotes/${id}`);

  const [lines, setLines] = useState<Array<{ sku: string; qty: number; unitPrice: number }>>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [orderForm, setOrderForm] = useState({
    advance: '',
    method: 'bank' as PaymentMethod,
    scheduledDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
    crewIds: [] as string[],
  });

  const quote = data?.quote;

  useEffect(() => {
    if (!quote) return;
    setLines(quote.items.map((i) => ({ sku: i.sku, qty: i.qty, unitPrice: i.unitPrice })));
    setDiscount(quote.discount);
    setNotes(quote.notes ?? '');
    setOrderForm((f) => ({
      ...f,
      advance: f.advance || String(Math.round(quote.total * 0.4)),
      crewIds: f.crewIds.length ? f.crewIds : (data?.technicians ?? []).filter((t) => t.active).slice(0, 3).map((t) => t.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id]);

  const computed = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = Math.round(taxable * (quote?.taxRate ?? 0.138));
    return { subtotal, taxable, taxAmount, total: taxable + taxAmount };
  }, [lines, discount, quote?.taxRate]);

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
  if (!data || !quote) return null;

  const editable = quote.status !== 'accepted' && !data.order;
  const technicians = data.technicians ?? [];

  const save = () =>
    run(
      () => api.patch(`/quotes/${quote.id}`, { items: lines, discount: Number(discount) || 0, notes }),
      'Quote updated',
    );

  const confirmOrder = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ order: { id: string } }>('/orders', {
        quoteId: quote.id,
        advance: Number(orderForm.advance),
        method: orderForm.method,
        scheduledDate: orderForm.scheduledDate,
        crewIds: orderForm.crewIds,
      });
      toast('Order confirmed — warehouse and crew have been notified');
      navigate(`/orders/${res.order.id}`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`Quote ${quote.ref}`}
          subtitle={`${quote.customerName} · ${capacityText(quote.capacityKw, quote.systemType)}`}
          backTo={data.enquiry ? `/enquiries/${data.enquiry.id}` : '/quotes'}
          backLabel="Back to enquiry"
          actions={
            <>
              <Btn variant="ghost" size="sm" onClick={() => window.print()}>
                <Icon name="download" className="h-3.5 w-3.5" />
                Print / PDF
              </Btn>
              {(quote.status === 'draft' || quote.status === 'sent') && (
                <Btn variant="ghost" size="sm" onClick={() => void run(() => api.post(`/quotes/${quote.id}/send`), 'Quote marked as sent')}>
                  Send to customer
                </Btn>
              )}
              {editable && (
                <Btn variant="ghost" size="sm" onClick={() => setRejectOpen(true)}>
                  Decline
                </Btn>
              )}
              {(quote.status === 'draft' || quote.status === 'sent') && (
                <Btn variant="accent" size="sm" onClick={() => void run(() => api.post(`/quotes/${quote.id}/accept`), 'Quote accepted')}>
                  Mark accepted
                </Btn>
              )}
              {quote.status === 'accepted' && data.order && (
                <Link to={`/orders/${data.order.id}`} className="btn btn-primary btn-sm">
                  Open order {data.order.ref}
                </Link>
              )}
              <StatusBadge kind="quote" status={quote.status} />
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card id="print-area">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">SunPower Solutions</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{capacityText(quote.capacityKw, quote.systemType)}</h2>
                <p className="text-xs text-slate-500">
                  Prepared for {quote.customerName} · {fmtDate(quote.createdAt)} · valid until {fmtDate(quote.validUntil)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Quote total</p>
                <p className="mono text-2xl font-bold text-slate-900">{inr(computed.total)}</p>
                <p className="text-[11px] text-slate-500">incl. {Math.round((quote.taxRate ?? 0.138) * 100)}% GST</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                    <th>Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const item = quote.items.find((i) => i.sku === line.sku);
                    if (!item) return null;
                    return (
                      <tr key={line.sku}>
                        <td>
                          <p className="text-xs font-medium text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.sku} · per {item.unit}
                            {item.serialized ? ' · serial tracked' : ''}
                          </p>
                        </td>
                        <td className="text-right">
                          {editable ? (
                            <input
                              type="number"
                              min={0}
                              value={line.qty}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty } : l)));
                              }}
                              className="input mono w-20 py-1 text-right text-xs"
                            />
                          ) : (
                            <span className="mono text-xs">
                              {line.qty} {item.unit}
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          {editable ? (
                            <input
                              type="number"
                              value={line.unitPrice}
                              onChange={(e) => {
                                const unitPrice = Number(e.target.value);
                                setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitPrice } : l)));
                              }}
                              className="input mono w-24 py-1 text-right text-xs"
                            />
                          ) : (
                            <span className="mono text-xs">{inr(line.unitPrice)}</span>
                          )}
                        </td>
                        <td className="mono whitespace-nowrap text-right text-xs font-semibold">
                          {inr(line.qty * line.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap text-[11px] text-slate-500">
                          {item.warrantyMonths >= 12
                            ? `${Math.round(item.warrantyMonths / 12)} yr`
                            : `${item.warrantyMonths} mo`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div className="no-print">
                <Field label="Notes on the quote">
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} />
                </Field>
                {editable && (
                  <div className="mt-3 flex items-end gap-2">
                    <Field label="Discount (₹)" className="w-32">
                      <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                    </Field>
                    <Btn variant="primary" size="sm" onClick={() => void save()} disabled={busy}>
                      Save changes
                    </Btn>
                  </div>
                )}
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="mono font-medium">{inr(computed.subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Discount</dt>
                    <dd className="mono font-medium text-rose-600">−{inr(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">GST ({Math.round((quote.taxRate ?? 0.138) * 100)}%)</dt>
                  <dd className="mono font-medium">{inr(computed.taxAmount)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                  <dt className="font-semibold text-slate-900">Total</dt>
                  <dd className="mono font-bold text-slate-900">{inr(computed.total)}</dd>
                </div>
                {quote.subsidyExpected > 0 && (
                  <div className="flex justify-between rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
                    <dt>Govt. subsidy handled</dt>
                    <dd className="mono font-semibold">−{inr(quote.subsidyExpected)}</dd>
                  </div>
                )}
                {quote.subsidyExpected > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <dt>Net cost to customer (approx.)</dt>
                    <dd className="mono font-semibold">{inr(computed.total - quote.subsidyExpected)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          {quote.status === 'accepted' && !data.order && (
            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Confirm the order</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Record the advance first — work does not start until money is in. Confirming reserves serial numbers for the warehouse and puts the job on a crew&apos;s schedule.
                </p>
              </div>
              <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
                <Field label="Advance / full payment (₹)" hint={`Balance ${inr(computed.total - Number(orderForm.advance || 0))}`}>
                  <Input
                    type="number"
                    value={orderForm.advance}
                    onChange={(e) => setOrderForm({ ...orderForm, advance: e.target.value })}
                  />
                </Field>
                <Field label="Payment method">
                  <Select
                    value={orderForm.method}
                    onChange={(e) => setOrderForm({ ...orderForm, method: e.target.value as PaymentMethod })}
                  >
                    <option value="bank">Bank transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </Select>
                </Field>
                <Field label="Installation date">
                  <Input
                    type="date"
                    value={orderForm.scheduledDate}
                    onChange={(e) => setOrderForm({ ...orderForm, scheduledDate: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-3">
                  <span className="label">Installation crew</span>
                  <div className="flex flex-wrap gap-2">
                    {technicians.map((t) => {
                      const checked = orderForm.crewIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setOrderForm({
                              ...orderForm,
                              crewIds: checked
                                ? orderForm.crewIds.filter((cid) => cid !== t.id)
                                : [...orderForm.crewIds, t.id],
                            })
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            checked
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          {t.name} · {t.role}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <Btn variant="accent" disabled={busy || !orderForm.advance || !orderForm.crewIds.length} onClick={() => void confirmOrder()}>
                    Confirm order & notify warehouse
                  </Btn>
                </div>
              </div>
            </Card>
          )}

          {data.order && (
            <Card className="card-pad">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Order {data.order.ref}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {inr(data.order.total)} · {data.order.paymentStatus} · scheduled {fmtDate(data.order.scheduledDate)}
                  </p>
                </div>
                <Link to={`/orders/${data.order.id}`} className="btn btn-ghost btn-sm">
                  Open order <Icon name="arrowRight" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4 no-print">
          <Card className="card-pad">
            <h2 className="section-title mb-3">Margin check</h2>
            <dl>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Parts cost</dt>
                <dd className="mono font-medium">{inr(quote.costTotal)}</dd>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Estimated crew cost</dt>
                <dd className="mono font-medium">{inr(quote.estLabourCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 py-1.5 text-sm">
                <dt className="font-semibold text-slate-800">Gross margin</dt>
                <dd className="mono font-bold text-emerald-700">{inr(computed.taxable - quote.costTotal - quote.estLabourCost)}</dd>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <dt className="text-slate-500">Margin %</dt>
                <dd className="font-semibold">
                  {computed.taxable
                    ? Math.round(((computed.taxable - quote.costTotal - quote.estLabourCost) / computed.taxable) * 100)
                    : 0}
                  %
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-slate-500">
              Crew cost is an estimate until timesheets are signed. Actual job profit appears on the order and in reports.
            </p>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">Customer</h2>
            <p className="text-sm font-semibold text-slate-900">{quote.customerName}</p>
            <p className="text-xs text-slate-500">{data.enquiry?.phone}</p>
            <p className="mt-1 text-xs text-slate-500">
              {data.enquiry?.address}, {data.enquiry?.city} {data.enquiry?.pincode}
            </p>
            {data.survey && (
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                Survey: {data.survey.roofDirection} roof, {data.survey.tiltDegrees}° tilt, {data.survey.cableDistanceM} m cable run
              </div>
            )}
            {data.enquiry && (
              <Link to={`/enquiries/${data.enquiry.id}`} className="mt-3 inline-block text-xs font-semibold text-amber-700 hover:underline">
                View enquiry →
              </Link>
            )}
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-2">What&apos;s included</h2>
            <ul className="space-y-1 text-[11px] text-slate-600">
              <li>• {Math.ceil((quote.capacityKw * 1000) / 550)} × 550W solar panels</li>
              <li>• 1 × {quote.capacityKw} kW {quote.systemType === 'off-grid' ? 'hybrid' : 'on-grid'} inverter</li>
              <li>• Mounting stands, DCDB/ACDB, cables and MC4 connectors</li>
              <li>• Safety earthing and lightning arrester</li>
              {quote.systemType === 'off-grid' && <li>• {Math.ceil(quote.capacityKw / 2.5)} × 5.12 kWh lithium batteries</li>}
              <li>• Installation, testing and commissioning</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge tone="green">20-yr panel warranty</Badge>
              <Badge tone="blue">2-yr inverter</Badge>
              <Badge tone="violet">Serial tracked</Badge>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Decline this quote"
        subtitle="The enquiry will be marked lost with your reason."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              disabled={busy || !rejectReason.trim()}
              onClick={() => {
                void run(() => api.post(`/quotes/${quote.id}/reject`, { reason: rejectReason }), 'Quote declined');
                setRejectOpen(false);
              }}
            >
              Decline quote
            </Btn>
          </>
        }
      >
        <Field label="Reason">
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Price too high, chose another vendor…" />
        </Field>
      </Modal>
    </>
  );
}
