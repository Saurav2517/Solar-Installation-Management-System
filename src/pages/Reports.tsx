import { useMemo, useState } from 'react';
import { Donut, GroupedBars } from '../components/Charts';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  ErrorState,
  Input,
  Loading,
  PageHeader,
  Stat,
  StatusBadge,
  useToast,
} from '../components/ui';
import { useApi } from '../lib/api';
import { fmtDate, inr, inrCompact } from '../lib/format';
import type { ReportsData } from '../lib/types';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

export default function Reports() {
  const toast = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(isoDate(new Date()));
  const path = `/reports?from=${from}&to=${to}T23:59:59`;
  const { data, error, loading, reload } = useApi<ReportsData>(path);

  const preset = (id: string) => {
    const now = new Date();
    if (id === 'month') {
      setFrom(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(isoDate(now));
    } else if (id === 'last') {
      setFrom(isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setTo(isoDate(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (id === '30') {
      setFrom(isoDate(new Date(now.getTime() - 30 * 86_400_000)));
      setTo(isoDate(now));
    } else {
      setFrom(isoDate(new Date(now.getTime() - 90 * 86_400_000)));
      setTo(isoDate(now));
    }
  };

  const summary = useMemo(() => {
    if (!data) return '';
    const t = data.totals;
    return [
      `SunPower Solutions — ${fmtDate(data.range.from)} to ${fmtDate(data.range.to)}`,
      `Revenue booked: ${inr(t.revenue)} across ${t.jobs} jobs`,
      `Gross profit: ${inr(t.profit)} (${t.revenue ? Math.round((t.profit / t.revenue) * 100) : 0}%)`,
      `Operating expenses: ${inr(t.operatingExpenses)} · Net profit: ${inr(t.netProfit)}`,
      `Collected: ${inr(t.collected)} · Receivables: ${inr(t.due)}`,
      `Open repairs: ${data.openRepairs.length} · Unfinished jobs: ${data.unfinished.length}`,
      `Subsidy pending: ${inr(data.subsidy.pending)}`,
    ].join('\n');
  }, [data]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast('Summary copied — paste it into WhatsApp or email');
    } catch {
      toast('Could not access the clipboard', 'error');
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const header = ['Order', 'Customer', 'kW', 'Type', 'Revenue', 'Parts', 'Labour', 'Other', 'Profit', 'Margin %', 'Collected', 'Due'];
    const rows = data.jobRows.map((r) => [
      r.ref,
      r.customerName,
      r.capacityKw,
      r.systemType,
      r.revenue,
      r.partsCost,
      r.labourCost,
      r.otherCost,
      r.profit,
      r.marginPct,
      r.collected,
      r.due,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunpower-jobs-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported');
  };

  if (loading) return <Loading label="Building the month-end pack…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const t = data.totals;
  const margin = t.revenue ? Math.round((t.profit / t.revenue) * 100) : 0;
  const colors = ['#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#ef4444'];

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Reports"
          subtitle="Which jobs made money, which lost money, and what is still unfinished."
          actions={
            <>
              <Btn variant="ghost" size="sm" onClick={() => void copy()}>
                <Icon name="share" className="h-3.5 w-3.5" />
                Copy summary
              </Btn>
              <Btn variant="ghost" size="sm" onClick={exportCsv}>
                <Icon name="download" className="h-3.5 w-3.5" />
                Export CSV
              </Btn>
              <Btn variant="primary" size="sm" onClick={() => window.print()}>
                Print pack
              </Btn>
            </>
          }
        />

        <Card className="mb-4">
          <div className="flex flex-wrap items-end gap-3 px-4 py-3">
            <label className="text-xs">
              <span className="label">From</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </label>
            <label className="text-xs">
              <span className="label">To</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </label>
            <div className="flex flex-wrap gap-1.5 pb-0.5">
              {[
                { id: 'month', label: 'This month' },
                { id: 'last', label: 'Last month' },
                { id: '30', label: 'Last 30 days' },
                { id: '90', label: 'Last 90 days' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => preset(p.id)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-amber-400 hover:text-amber-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-[11px] text-slate-400">
              {fmtDate(data.range.from)} → {fmtDate(data.range.to)}
            </span>
          </div>
        </Card>
      </div>

      <div id="print-area">
        <div className="mb-4 hidden print:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">SunPower Solutions</p>
          <h1 className="text-xl font-bold">Month-end report</h1>
          <p className="text-xs text-slate-500">
            {fmtDate(data.range.from)} to {fmtDate(data.range.to)}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Revenue booked" value={inrCompact(t.revenue)} sub={`${t.jobs} completed jobs`} tone="blue" />
          <Stat label="Gross profit" value={inrCompact(t.profit)} sub={`${margin}% margin`} tone="green" />
          <Stat label="Net profit" value={inrCompact(t.netProfit)} sub={`${inrCompact(t.operatingExpenses)} operating costs`} tone="amber" />
          <Stat label="Receivables" value={inrCompact(t.due)} sub={`${inrCompact(t.collected)} collected`} tone={t.due > 0 ? 'red' : 'slate'} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Revenue &amp; gross profit — last 6 months</h2>
              <div className="mt-1 flex gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-slate-800" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-400" /> Gross profit</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <GroupedBars data={data.monthlySeries} />
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-4">System mix</h2>
            <Donut
              segments={data.capacityMix.filter((c) => c.count > 0).map((c, i) => ({
                label: `${c.kw} kW`,
                value: c.count,
                color: colors[i % colors.length],
              }))}
              center={String(data.capacityMix.reduce((s, c) => s + c.count, 0))}
              sub="systems"
            />
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subsidy pending</span>
                <span className="font-semibold">{inrCompact(data.subsidy.pending)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subsidy received</span>
                <span className="font-semibold text-emerald-700">{inrCompact(data.subsidy.received)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stock purchases</span>
                <span className="font-semibold">{inrCompact(t.stockPurchases)}</span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="section-title">Profit by job</h2>
              <p className="mt-0.5 text-xs text-slate-500">Revenue minus parts, signed crew hours and transport.</p>
            </div>
            <Badge tone={t.profit >= 0 ? 'green' : 'red'}>{inr(t.profit)} total</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>System</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Parts</th>
                  <th className="text-right">Labour</th>
                  <th className="text-right">Other</th>
                  <th className="text-right">Profit</th>
                  <th className="text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.jobRows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{r.ref}</td>
                    <td className="text-xs font-medium">{r.customerName}</td>
                    <td className="whitespace-nowrap text-[11px]">
                      {r.capacityKw} kW
                      <span className="block text-[10px] capitalize text-slate-400">{r.systemType}</span>
                    </td>
                    <td className="mono text-right text-xs">{inr(r.revenue)}</td>
                    <td className="mono text-right text-[11px] text-slate-500">{inr(r.partsCost)}</td>
                    <td className="mono text-right text-[11px] text-slate-500">{inr(r.labourCost)}</td>
                    <td className="mono text-right text-[11px] text-slate-500">{inr(r.otherCost)}</td>
                    <td className={`mono text-right text-xs font-semibold ${r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{inr(r.profit)}</td>
                    <td className="mono text-right text-xs">{r.marginPct}%</td>
                  </tr>
                ))}
                {data.jobRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-xs text-slate-500">
                      No completed jobs in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Unfinished work</h2>
              <p className="mt-0.5 text-xs text-slate-500">{data.unfinished.length} jobs still open · {inrCompact(data.unfinished.reduce((s, u) => s + u.value, 0))} booked</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.unfinished.map((u) => (
                <li key={u.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{u.customerName}</p>
                      <p className="text-[10px] text-slate-400">{u.ref} · {inrCompact(u.value)}</p>
                    </div>
                    <StatusBadge kind="order" status={u.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {u.pendingSteps.map((step) => (
                      <span key={step} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
                        {step}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
              {data.unfinished.length === 0 && <li className="px-5 py-6 text-center text-xs text-slate-500">Every job is closed.</li>}
            </ul>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Repairs still open</h2>
              <p className="mt-0.5 text-xs text-slate-500">{data.openRepairs.length} tickets · {data.openRepairs.filter((r) => r.overdue).length} past SLA</p>
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Warranty</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openRepairs.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-mono text-[10px]">
                        {r.ref}
                        {r.overdue && <span className="block text-rose-500">overdue</span>}
                      </td>
                      <td className="text-[11px]">{r.customerName}</td>
                      <td className="text-[10px] capitalize text-slate-500">{r.warrantyStatus.replace(/_/g, ' ')}</td>
                      <td className="text-[11px] capitalize">{r.priority}</td>
                    </tr>
                  ))}
                  {data.openRepairs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                        No open repairs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Receivables</h2>
              <p className="mt-0.5 text-xs text-slate-500">Money customers still owe us, oldest first.</p>
            </div>
            <div className="max-h-[320px] overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th className="text-right">Due</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receivables.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-[10px]">{r.ref}</td>
                      <td className="text-[11px]">{r.customerName}</td>
                      <td className="mono text-right text-xs font-semibold">{inr(r.due)}</td>
                      <td className="text-[11px]">{r.ageDays}d</td>
                    </tr>
                  ))}
                  {data.receivables.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                        Everything is collected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Technician pay due</h2>
              <p className="mt-0.5 text-xs text-slate-500">Unpaid signed hours across the crew.</p>
            </div>
            <div className="max-h-[320px] overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Role</th>
                    <th className="text-right">Hours</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.technicianPayroll.filter((p) => p.amount > 0).map((p) => (
                    <tr key={p.id}>
                      <td className="text-[11px]">{p.name}</td>
                      <td className="text-[10px] capitalize text-slate-500">{p.role}</td>
                      <td className="mono text-right text-[11px]">{p.hours}</td>
                      <td className="mono text-right text-xs font-semibold">{inr(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
