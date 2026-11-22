import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Card, Empty, ErrorState, Loading, PageHeader, Progress, StatusBadge, Tabs } from '../components/ui';
import { useApi } from '../lib/api';
import { capacityText, fmtDate, inr, inrCompact } from '../lib/format';
import type { OrderRow } from '../lib/types';

const TABS = [
  { id: 'requested', label: 'Requests' },
  { id: 'progress', label: 'In progress' },
  { id: 'dispatched', label: 'On site' },
  { id: 'installed', label: 'Installed' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

export default function Orders() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<{ orders: OrderRow[] }>('/orders');
  const [tab, setTab] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const rows = data?.orders ?? [];
  const counts = useMemo(
    () => ({
      requested: rows.filter((o) => o.status === 'requested').length,
      progress: rows.filter((o) => o.status === 'confirmed').length,
      dispatched: rows.filter((o) => o.status === 'dispatched').length,
      installed: rows.filter((o) => o.status === 'installed').length,
      closed: rows.filter((o) => o.status === 'closed').length,
      all: rows.length,
    }),
    [rows],
  );

  // Land on customer requests whenever any are waiting, so a new portal order is
  // never hidden behind the confirmed-orders tab.
  const activeTab = tab ?? (counts.requested > 0 ? 'requested' : 'progress');

  const filtered = rows.filter((o) => {
    const tabOk =
      activeTab === 'all'
        ? true
        : activeTab === 'progress'
          ? o.status === 'confirmed'
          : activeTab === 'dispatched'
            ? o.status === 'dispatched'
            : o.status === activeTab;
    if (!tabOk) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [o.customerName, o.ref].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="From advance payment to serial-scanned dispatch, signed installation and final invoice."
      />

      <Card>
        <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full overflow-x-auto">
            <Tabs tabs={TABS.map((t) => ({ ...t, count: counts[t.id as keyof typeof counts] }))} active={activeTab} onChange={setTab} />
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer or order ref…" className="input pl-9" />
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
            title="No orders here"
            hint={
              activeTab === 'requested'
                ? 'Orders placed by customers in the portal appear here for confirmation.'
                : 'Confirm an accepted quote to create an order.'
            }
          />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>System</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Balance</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td className="whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600">{o.ref}</span>
                      <span className="block text-[10px] text-slate-400">{fmtDate(o.confirmedAt ?? o.createdAt)}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-900">{o.customerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {o.serialsScanned}/{o.serialsTotal} serials scanned
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-xs">{capacityText(o.capacityKw, o.systemType)}</td>
                    <td className="mono whitespace-nowrap text-right text-sm font-semibold">{inr(o.total)}</td>
                    <td className="mono whitespace-nowrap text-right text-xs">
                      <span className={o.balance > 0 ? 'font-semibold text-rose-600' : 'text-emerald-600'}>
                        {o.balance > 0 ? inrCompact(o.balance) : 'Settled'}
                      </span>
                    </td>
                    <td className="min-w-[110px]">
                      <Progress value={(o.stepsDone / Math.max(1, o.stepsTotal)) * 100} />
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {o.stepsDone}/{o.stepsTotal} steps
                      </span>
                    </td>
                    <td>
                      <StatusBadge kind="order" status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
