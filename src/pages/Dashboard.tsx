import { Link } from 'react-router-dom';
import { BarChart, HBars } from '../components/Charts';
import { Icon } from '../components/Icon';
import {
  Badge,
  Card,
  Empty,
  ErrorState,
  LinkBtn,
  Loading,
  PageHeader,
  SectionHead,
  Stat,
  StatusBadge,
} from '../components/ui';
import { useApi } from '../lib/api';
import { capacityText, fmtDateShort, inr, inrCompact, timeAgo } from '../lib/format';
import type { DashboardData } from '../lib/types';

export default function Dashboard() {
  const { data, error, loading, reload } = useApi<DashboardData>('/dashboard');

  if (loading) return <Loading label="Pulling today's numbers…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const k = data.kpis;
  const funnel = [
    { label: 'New enquiries', value: data.pipelineCounts.new, tone: '#3b82f6' },
    { label: 'Qualified', value: data.pipelineCounts.qualified, tone: '#8b5cf6' },
    { label: 'In survey', value: data.pipelineCounts.survey, tone: '#f59e0b' },
    { label: 'Quoted', value: data.pipelineCounts.quoted, tone: '#0ea5e9' },
    { label: 'Won', value: data.pipelineCounts.won, tone: '#10b981' },
  ];

  return (
    <>
      <PageHeader
        title="Director's dashboard"
        subtitle="Cash, margin and everything still unfinished — live across the company."
        actions={
          <>
            <LinkBtn to="/reports" variant="ghost">
              <Icon name="chart" className="h-4 w-4" />
              Month-end report
            </LinkBtn>
            <LinkBtn to="/enquiries?new=1" variant="accent">
              <Icon name="plus" className="h-4 w-4" />
              Log enquiry
            </LinkBtn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Collected today"
          value={inr(k.revenueToday)}
          sub={`${inr(k.revenueWeek)} this week · ${inr(k.revenueMonth)} this month`}
          tone="green"
          icon={<Icon name="money" />}
        />
        <Stat
          label="Booked this month"
          value={inrCompact(k.revenueBookedMonth)}
          sub={`${k.jobsCompletedMonth} installation${k.jobsCompletedMonth === 1 ? '' : 's'} completed`}
          tone="blue"
          icon={<Icon name="package" />}
        />
        <Stat
          label="Gross profit this month"
          value={inrCompact(k.grossProfitMonth)}
          sub={`${k.avgMarginPct}% average margin on booked jobs`}
          tone="amber"
          icon={<Icon name="chart" />}
        />
        <Stat
          label="Receivables"
          value={inrCompact(k.receivables)}
          sub={`${inrCompact(k.pipeline)} sitting in open quotes`}
          tone={k.receivables > 500000 ? 'red' : 'slate'}
          icon={<Icon name="receipt" />}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Jobs in progress" value={k.jobsInProgress} to="/orders" hint={`${k.newEnquiries} new enquiries`} />
        <MiniStat
          label="Open repairs"
          value={k.openTickets}
          to="/tickets"
          hint={`${k.overdueTickets} past SLA`}
          danger={k.overdueTickets > 0}
        />
        <MiniStat label="Subsidy pending" value={inrCompact(k.subsidyPending)} to="/billing?tab=subsidy" hint="Government claims" />
        <MiniStat
          label="Low stock items"
          value={k.lowStockCount}
          to="/inventory"
          hint="Reorder before dispatch"
          danger={k.lowStockCount > 0}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <SectionHead
            title="Cash collected — last 14 days"
            subtitle="Every rupee received, across installations, service calls and subsidy payouts."
            actions={<Badge tone="green">{inrCompact(data.revenueSeries.reduce((s, d) => s + d.revenue, 0))} in 14 days</Badge>}
          />
          <div className="px-4 pb-4 pt-5">
            <BarChart
              data={data.revenueSeries.map((d) => ({ label: d.label, value: d.revenue }))}
              height={170}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 px-5 py-4 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sales funnel</p>
              <HBars data={funnel} format={(n) => `${n}`} />
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Today&apos;s schedule</p>
              {data.todayInstallations.length === 0 && data.todaySurveys.length === 0 ? (
                <p className="text-xs text-slate-500">No site visits booked for today.</p>
              ) : (
                <ul className="space-y-2">
                  {data.todayInstallations.map((i) => (
                    <li key={i.id}>
                      <Link to={`/installations/${i.id}`} className="flex items-start gap-2 text-xs hover:text-amber-700">
                        <span className="mt-0.5 rounded bg-amber-100 p-1 text-amber-700">
                          <Icon name="wrench" className="h-3 w-3" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-800">
                            {i.customerName} · {i.systemSizeKw} kW
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {i.crew.filter(Boolean).join(', ') || 'Crew to assign'} · {i.ref}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {data.todaySurveys.map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 rounded bg-violet-100 p-1 text-violet-700">
                        <Icon name="clipboard" className="h-3 w-3" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-800">Survey · {s.customerName}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {s.technician ?? 'Technician'} · {fmtDateShort(s.scheduledAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead title="Needs attention" subtitle="Things that will cost money if ignored." />
          {data.alerts.length === 0 ? (
            <Empty title="Nothing on fire" hint="No overdue tickets, stuck dispatches or missing subsidy papers." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.alerts.map((a, i) => (
                <li key={`${a.title}-${i}`}>
                  <Link to={a.link} className="flex gap-2.5 px-5 py-3 hover:bg-slate-50">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        a.level === 'danger' ? 'bg-rose-500' : a.level === 'warn' ? 'bg-amber-500' : 'bg-blue-400'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">{a.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHead
            title="Jobs still unfinished"
            subtitle="Each step that is still open, per customer."
            actions={<LinkBtn to="/orders" variant="ghost" size="sm">All orders</LinkBtn>}
          />
          {data.unfinished.length === 0 ? (
            <Empty title="Everything is closed" hint="All confirmed jobs are installed, invoiced and paid." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.unfinished.map((o) => {
                const done = o.steps.filter((s) => s.done).length;
                const pending = o.steps.filter((s) => !s.done);
                return (
                  <li key={o.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/orders/${o.id}`} className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{o.customerName}</p>
                        <p className="text-[11px] text-slate-500">
                          {o.ref} · {done}/{o.steps.length} steps done
                        </p>
                      </Link>
                      <StatusBadge kind="order" status={o.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {pending.slice(0, 3).map((s) => (
                        <span key={s.key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {s.label}
                        </span>
                      ))}
                      {pending.length > 3 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          +{pending.length - 3} more
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHead
            title="Open service calls"
            subtitle="Warranty and chargeable repairs in the queue."
            actions={<LinkBtn to="/tickets" variant="ghost" size="sm">All tickets</LinkBtn>}
          />
          {data.openTickets.length === 0 ? (
            <Empty title="No open repairs" hint="Every complaint has been resolved and confirmed." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.openTickets.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/tickets/${t.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-amber-700">
                      {t.customerName}
                    </Link>
                    <p className="truncate text-[11px] text-slate-500">
                      {t.faultCode ?? 'Service call'} · {t.serialNo ?? 'no serial'} · {timeAgo(t.reportedAt)}
                    </p>
                    <p className="text-[11px] text-slate-400">{t.technicianName ?? 'Unassigned'}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge kind="ticket" status={t.status} />
                    {t.overdue && <Badge tone="red">SLA overdue</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <SectionHead
          title="Latest enquiries"
          subtitle="Nothing should sit untouched — every lead has an owner."
          actions={<LinkBtn to="/enquiries" variant="ghost" size="sm">Open pipeline</LinkBtn>}
        />
        {data.recentEnquiries.length === 0 ? (
          <Empty title="No enquiries yet" hint="Leads from the website form land here instantly." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Requirement</th>
                  <th>Source</th>
                  <th>Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEnquiries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-xs">{e.ref}</td>
                    <td>
                      <Link to={`/enquiries/${e.id}`} className="font-semibold text-slate-900 hover:text-amber-700">
                        {e.customerName}
                      </Link>
                      <span className="block text-[11px] text-slate-500">{e.city}</span>
                    </td>
                    <td className="whitespace-nowrap text-xs">{capacityText(e.requestedKw, e.requestedType)}</td>
                    <td className="text-xs capitalize text-slate-500">{e.source}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{timeAgo(e.createdAt)}</td>
                    <td>
                      <StatusBadge kind="enquiry" status={e.status} />
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

function MiniStat({
  label,
  value,
  hint,
  to,
  danger,
}: {
  label: string;
  value: number | string;
  hint: string;
  to: string;
  danger?: boolean;
}) {
  return (
    <Link to={to} className="card flex items-center justify-between gap-2 px-4 py-3 transition hover:border-amber-300">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
        <p className={`truncate text-[10px] ${danger ? 'font-medium text-rose-600' : 'text-slate-500'}`}>{hint}</p>
      </div>
      <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}
