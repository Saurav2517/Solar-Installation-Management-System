import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Badge, Btn, Card, ErrorState, Field, Input, KV, Loading, PageHeader, useToast } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { fmtDate, inr } from '../../lib/format';
import { UPI_PAYMENT, upiPayUri } from '../../../shared/payment';
import type { CustomerOrderView, PaymentReceipt } from '../../lib/types';

/** Shrink a phone screenshot so it uploads quickly but stays readable. */
async function screenshotToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Attach an image of the payment confirmation');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('That image could not be read — try another screenshot');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

export default function PortalPay() {
  const { id } = useParams();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<CustomerOrderView>(`/portal/orders/${id}`);
  const fileInput = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  const balance = data ? Math.max(0, data.order.total - data.order.paidAmount) : 0;
  const isAdvance = data?.payKind === 'advance';
  const payAmount = isAdvance ? (data?.advanceOutstanding ?? 0) : Number(amount) || 0;
  const pending = data?.pendingPayment;

  useEffect(() => {
    if (!data) return;
    if (data.payKind === 'advance') {
      setAmount(String(Math.round(data.advanceOutstanding)));
    } else if (!amount) {
      setAmount(String(Math.round(Math.max(0, data.order.total - data.order.paidAmount))));
    }
  }, [data, amount]);

  const pickScreenshot = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await screenshotToDataUrl(file);
      setProof(url);
      setFileName(file.name);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const submit = async () => {
    if (!data) return;
    if (!proof) {
      toast('Attach the payment screenshot first', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post<CustomerOrderView>(`/portal/orders/${data.order.id}/payment-proof`, {
        amount: payAmount,
        proof,
      });
      setReceipt({ ref: 'Submitted', amount: payAmount, orderRef: data.order.ref, kind: isAdvance ? 'advance' : 'balance' });
      setProof('');
      setFileName('');
      toast('Payment screenshot sent for verification');
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_PAYMENT.upiId);
      toast('UPI ID copied');
    } catch {
      toast('Copy the UPI ID from the screen', 'error');
    }
  };

  if (loading) return <Loading label="Loading your order…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const { order } = data;

  if (receipt) {
    return (
      <>
        <PageHeader title="Payment submitted" backTo={`/portal/orders/${order.id}`} backLabel={`Order ${order.ref}`} />
        <Card className="card-pad mx-auto max-w-lg text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Icon name="clock" className="h-7 w-7" />
          </span>
          <h2 className="mt-3 text-lg font-bold text-slate-900">{inr(receipt.amount)} awaiting verification</h2>
          <p className="mt-1 text-xs text-slate-500">
            Your screenshot for {receipt.orderRef} is with the SunPower office. The payment shows as received once they
            check it against the bank statement — usually within a working day.
          </p>
          <div className="mt-4 space-y-2 text-left">
            <KV label="Order" value={receipt.orderRef} />
            <KV label="Amount" value={inr(receipt.amount)} />
            <KV label="Type" value={receipt.kind === 'advance' ? '20% advance' : 'Balance'} />
            <KV label="Status" value={<Badge tone="amber">Pending verification</Badge>} />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to={`/portal/orders/${order.id}`} className="btn btn-primary btn-sm">
              Back to the order
            </Link>
            <Link to="/portal/orders" className="btn btn-ghost btn-sm">
              All my orders
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={isAdvance ? 'Pay the 20% advance' : 'Pay for your order'}
        subtitle={
          isAdvance
            ? `${order.ref} · advance ${inr(data.advanceOutstanding)} of ${inr(data.advanceTarget)}`
            : `${order.ref} · balance ${inr(balance)}`
        }
        backTo={`/portal/orders/${order.id}`}
        backLabel={`Order ${order.ref}`}
      />

      {pending ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="section-title">Awaiting verification</h2>
                <Badge tone="amber">Pending</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                We have your screenshot for {inr(pending.amount)}. The office is checking it against the bank statement —
                nothing more to do.
              </p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <KV label="Submission" value={<span className="font-mono text-xs">{pending.ref}</span>} />
              <KV label="Amount" value={inr(pending.amount)} />
              <KV label="Type" value={pending.kind === 'advance' ? '20% advance' : 'Balance'} />
              <KV label="Sent" value={fmtDate(pending.submittedAt)} />
            </div>
            {pending.proof && (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your screenshot</p>
                <img
                  src={pending.proof}
                  alt="Payment screenshot you submitted"
                  className="max-h-72 w-auto rounded-lg border border-slate-200"
                />
              </div>
            )}
          </Card>
          <Card className="card-pad">
            <h2 className="section-title">What happens next</h2>
            <ol className="mt-2 space-y-2 text-xs text-slate-600">
              <li>1. The office matches your screenshot with the UPI credit.</li>
              <li>2. The amount is posted to {order.ref} and your balance drops.</li>
              <li>3. If the screenshot does not match, we will ask you to upload it again.</li>
            </ol>
            <Link to={`/portal/orders/${order.id}`} className="btn btn-ghost btn-sm mt-4">
              Back to the order
            </Link>
          </Card>
        </div>
      ) : !data.payable ? (
        <Card className="card-pad">
          <h2 className="section-title">Nothing to pay</h2>
          <p className="mt-1 text-xs text-slate-500">
            {balance <= 0
              ? 'This order is fully paid. Thank you!'
              : 'The 20% advance has been received — SunPower will confirm your order shortly.'}
          </p>
          <Link to={`/portal/orders/${order.id}`} className="btn btn-ghost btn-sm mt-3">
            Back to the order
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {UPI_PAYMENT.upiId && UPI_PAYMENT.accountName ? (
              <Card>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="section-title">{isAdvance ? 'Pay the 20% advance by UPI' : 'Pay by UPI'}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isAdvance
                      ? `Scan the SunPower QR with any UPI app and pay ${inr(data.advanceOutstanding)}. The remaining ${inr(balance - data.advanceOutstanding)} is due after installation.`
                      : 'Scan the SunPower QR with any UPI app and pay the amount you want to settle.'}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:items-start">
                  {UPI_PAYMENT.qrImage && (
                    <div className="shrink-0 text-center">
                      <img
                        src={UPI_PAYMENT.qrImage}
                        alt={`${UPI_PAYMENT.appName} UPI QR code for ${UPI_PAYMENT.upiId}`}
                        className="h-48 w-48 rounded-xl border border-slate-200 bg-white p-2"
                      />
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Scan with any UPI app
                      </p>
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Account holder</p>
                      <p className="text-sm font-semibold text-slate-900">{UPI_PAYMENT.accountName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">UPI ID</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-sm font-semibold text-slate-900">{UPI_PAYMENT.upiId}</span>
                        <Btn variant="ghost" size="sm" onClick={() => void copyUpi()}>
                          Copy
                        </Btn>
                      </div>
                    </div>
                    <Field label={isAdvance ? 'Amount to pay (₹)' : 'Amount (₹)'} hint={isAdvance ? `20% of ${inr(order.total)}` : `Balance due ${inr(balance)}`}>
                      <Input
                        type="number"
                        min={1}
                        max={isAdvance ? data.advanceOutstanding : balance}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isAdvance}
                      />
                    </Field>
                    <a href={upiPayUri(payAmount, `SunPower ${order.ref}`)} className="btn btn-accent btn-sm w-full justify-center sm:w-auto">
                      <Icon name="money" className="h-3.5 w-3.5" />
                      Open UPI app for {inr(payAmount)}
                    </a>
                    <p className="text-[10px] text-slate-500">
                      On a phone? The button opens your UPI app with the amount filled in. On a computer, scan the QR.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="card-pad">
                <h2 className="section-title">UPI payments are not configured</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Contact SunPower to arrange payment before submitting your payment screenshot.
                </p>
              </Card>
            )}

            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Attach the payment screenshot</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  After paying, upload the confirmation from your UPI app. The office checks it and posts the money to
                  this order.
                </p>
              </div>
              <div className="px-5 py-4">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void pickScreenshot(e.target.files?.[0])}
                />

                {proof ? (
                  <div className="space-y-3">
                    <img
                      src={proof}
                      alt="Payment screenshot ready to submit"
                      className="max-h-64 w-auto rounded-lg border border-slate-200"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-500">{fileName || 'Screenshot attached'}</span>
                      <Btn variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                        Replace
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProof('');
                          setFileName('');
                        }}
                      >
                        Remove
                      </Btn>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-amber-400 hover:bg-amber-50/40"
                  >
                    <Icon name="inbox" className="h-6 w-6 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Attach payment screenshot</span>
                    <span className="text-[11px] text-slate-500">PNG, JPG or WEBP from your UPI app</span>
                  </button>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Btn variant="accent" disabled={busy || !proof} onClick={() => void submit()}>
                    {busy ? 'Sending…' : `Submit ${inr(payAmount)} for verification`}
                  </Btn>
                  <span className="text-[11px] text-slate-500">
                    The amount shows as received once the office verifies your screenshot.
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Order summary</h2>
              </div>
              <div className="space-y-2 px-5 py-4">
                <KV label="Order" value={order.ref} />
                <KV label="Total" value={inr(order.total)} />
                {isAdvance && <KV label="Advance (20%)" value={inr(data.advanceTarget)} />}
                <KV label="Paid so far" value={<span className="text-emerald-700">{inr(order.paidAmount)}</span>} />
                <KV
                  label={isAdvance ? 'Advance due' : 'Balance'}
                  value={<strong>{inr(isAdvance ? data.advanceOutstanding : balance)}</strong>}
                />
                {data.invoice && <KV label="Invoice" value={data.invoice.number} />}
                {data.invoice?.dueAt && <KV label="Due" value={fmtDate(data.invoice.dueAt)} />}
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Payment history</h2>
              </div>
              <div className="px-5 py-4">
                {data.payments.length === 0 ? (
                  <p className="text-xs text-slate-500">No payments recorded yet.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {data.payments.map((p) => (
                      <li key={p.ref} className="flex items-start justify-between gap-2">
                        <span>
                          <span className="font-mono text-[10px] text-slate-400">{p.ref}</span>
                          <span className="block text-slate-500">
                            {fmtDate(p.receivedAt)} · {p.method.toUpperCase()}
                          </span>
                          {p.status === 'pending' && (
                            <span className="mt-0.5 block text-[10px] font-semibold text-amber-700">Pending verification</span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="mt-0.5 block text-[10px] font-semibold text-rose-600">
                              Rejected — upload again
                            </span>
                          )}
                        </span>
                        <span
                          className={`mono font-semibold ${
                            p.status === 'verified' ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {inr(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
