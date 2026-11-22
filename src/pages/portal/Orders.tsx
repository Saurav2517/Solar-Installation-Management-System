import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Card, Empty, ErrorState, Loading, PageHeader, Progress, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/api';
import { capacityText, fmtDate, inr } from '../../lib/format';
import type { CustomerOrder } from '../../lib/types';

interface PortalOrders {
  orders: CustomerOrder[];
  customer?: { name: string; address: string; city: string; pincode: string };
}

export default function PortalOrders() {
  const { data, error, loading, reload } = useApi<PortalOrders>('/portal/orders');

  if (loading) return <Loading label="Loading your orders…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  const orders = data?.orders ?? [];

  return (
    <>
      <PageHeader
        title="My orders"
        subtitle={data?.customer ? `${data.customer.name} · ${data.customer.city}` : 'Every order you have placed with SunPower.'}
        actions={
          <Link to="/portal" className="btn btn-accent btn-sm">
            <Icon name="plus" className="h-3.5 w-3.5" />
            New order
          </Link>
        }
      />

      <Card>
        {orders.length === 0 ? (
          <Empty title="No orders yet" hint="Build a system in the shop and send it to the SunPower team." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>System</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Paid</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const done = o.steps.filter((s) => s.done).length;
                  return (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap">
                        <Link to={`/portal/orders/${o.id}`} className="font-mono text-xs font-semibold text-slate-800 hover:text-amber-700">
                          {o.ref}
                        </Link>
                        <span className="block text-[10px] text-slate-400">{fmtDate(o.createdAt)}</span>
                      </td>
                      <td className="whitespace-nowrap text-xs">{capacityText(o.capacityKw, o.systemType)}</td>
                      <td className="mono whitespace-nowrap text-right text-sm font-semibold">{inr(o.total)}</td>
                      <td className="mono whitespace-nowrap text-right text-xs">{inr(o.paidAmount)}</td>
                      <td className="min-w-[110px]">
                        <Progress value={(done / Math.max(1, o.steps.length)) * 100} />
                        <span className="mt-1 block text-[10px] text-slate-500">
                          {done}/{o.steps.length} steps
                        </span>
                      </td>
                      <td>
                        <StatusBadge kind="order" status={o.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
