import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Badge, Card, ErrorState, KV, Loading, PageHeader, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/api';
import { capacityText, fmtDate, inr } from '../../lib/format';
import type { CustomerOrderView } from '../../lib/types';

export default function PortalOrderDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<CustomerOrderView>(`/portal/orders/${id}`);

  if (loading) return <Loading label="Loading your order…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const { order, invoice, subsidy, installation, steps } = data;
  const balance = Math.max(0, order.total - order.paidAmount);

  return (
    <>
      <PageHeader
        title={`Order ${order.ref}`}
        subtitle={`${capacityText(order.capacityKw, order.systemType)} · placed ${fmtDate(order.createdAt)}`}
        backTo="/portal/orders"
        backLabel="My orders"
        actions={<StatusBadge kind="order" status={order.status} />}
      />

      {order.status === 'requested' && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <Icon name="inbox" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Your request is with the SunPower team. They will confirm stock, the install date and the advance — you will
            see the status change here.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Progress</h2>
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
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">What you ordered</h2>
              <p className="mt-0.5 text-xs text-slate-500">{order.items.length} line items</p>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((line) => (
                    <tr key={line.sku}>
                      <td>
                        <p className="text-xs font-semibold text-slate-800">{line.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{line.sku}</p>
                      </td>
                      <td className="text-right text-xs">{line.qty}</td>
                      <td className="mono whitespace-nowrap text-right text-xs">{inr(line.unitPrice)}</td>
                      <td className="mono whitespace-nowrap text-right text-xs font-semibold">{inr(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1.5 border-t border-slate-100 px-5 py-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="mono">{inr(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span className="mono">{inr(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm font-bold text-slate-900">
                <span>Total</span>
                <span className="mono">{inr(order.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Received</span>
                <span className="mono text-emerald-700">{inr(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Balance</span>
                <span className="mono">{inr(balance)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Installation</h2>
            </div>
            <div className="px-5 py-4">
              {installation ? (
                <div className="space-y-2">
                  <KV label="Job" value={installation.ref} />
                  <KV label="Scheduled" value={fmtDate(installation.scheduledDate)} />
                  <KV label="Status" value={<StatusBadge kind="installation" status={installation.status} />} />
                  <KV label="Crew" value={installation.crewNames.join(', ') || 'To be assigned'} />
                </div>
              ) : (
                <p className="text-xs text-slate-500">A crew is scheduled once SunPower confirms the order.</p>
              )}
            </div>
          </Card>

          {invoice && (
            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Invoice</h2>
              </div>
              <div className="px-5 py-4">
                <div className="space-y-2">
                  <KV label="Number" value={invoice.number} />
                  <KV label="Total" value={inr(invoice.total)} />
                  <KV label="Status" value={<StatusBadge kind="invoice" status={invoice.status} />} />
                  <KV label="Due" value={fmtDate(invoice.dueAt)} />
                </div>
              </div>
            </Card>
          )}

          {subsidy && (
            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Subsidy</h2>
                <p className="mt-0.5 text-xs text-slate-500">{subsidy.scheme}</p>
              </div>
              <div className="px-5 py-4">
                <div className="space-y-2">
                  <KV label="Application" value={subsidy.applicationNo ?? '—'} />
                  <KV label="Expected" value={inr(subsidy.amount)} />
                  <KV label="Status" value={<StatusBadge kind="subsidy" status={subsidy.status} />} />
                  <KV
                    label="Documents"
                    value={`${subsidy.docs.filter((d) => d.received).length}/${subsidy.docs.length} received`}
                  />
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Missing documents:{' '}
                  {subsidy.docs.filter((d) => !d.received).map((d) => d.name).join(', ') || 'none'}
                </p>
              </div>
            </Card>
          )}

          <Card>
            <div className="px-5 py-4">
              <h2 className="section-title">Need a hand?</h2>
              <p className="mt-1 text-xs text-slate-500">
                Call +91 98450 10101 or reply to the confirmation email and the service desk will help.
              </p>
              <Link to="/portal" className="btn btn-ghost btn-sm mt-3">
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
                Back to the shop
              </Link>
              {order.wantsSubsidy && <Badge tone="green" className="mt-3">Subsidy requested</Badge>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
