import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Empty, ErrorState, Loading, PageHeader, StatusBadge, Tabs } from '../components/ui';
import { useApi } from '../lib/api';
import { fmtDate } from '../lib/format';
import type { InstallationsData } from '../lib/types';

const TABS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'On site' },
  { id: 'completed', label: 'Signed off' },
  { id: 'all', label: 'All' },
];

export default function Installations() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<InstallationsData>('/installations');
  const [tab, setTab] = useState('scheduled');

  const rows = data?.installations ?? [];
  const counts = useMemo(
    () => ({
      scheduled: rows.filter((r) => r.status === 'scheduled').length,
      in_progress: rows.filter((r) => r.status === 'in_progress').length,
      completed: rows.filter((r) => r.status === 'completed').length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = rows.filter((r) => (tab === 'all' ? true : r.status === tab));

  return (
    <>
      <PageHeader
        title="Installations"
        subtitle="Crew schedule, site sign-off, photos and the customer's signature on one job sheet."
      />
      <Card>
        <div className="px-4 pt-4">
          <Tabs tabs={TABS.map((t) => ({ ...t, count: counts[t.id as keyof typeof counts] }))} active={tab} onChange={setTab} />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={() => void reload()} />
          </div>
        ) : filtered.length === 0 ? (
          <Empty title="No jobs in this list" hint="Installations are created automatically when an order is confirmed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Customer</th>
                  <th>System</th>
                  <th>Scheduled</th>
                  <th>Crew</th>
                  <th>Proof</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id} className="cursor-pointer" onClick={() => navigate(`/installations/${job.id}`)}>
                    <td className="whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600">{job.ref}</span>
                      <span className="block text-[10px] text-slate-400">{job.orderRef}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-900">{job.customerName}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-slate-500">{job.address}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs">{job.systemSizeKw} kW</td>
                    <td className="whitespace-nowrap text-xs">
                      {fmtDate(job.scheduledDate)}
                      {job.startedAt && <span className="block text-[10px] text-slate-400">started {fmtDate(job.startedAt)}</span>}
                    </td>
                    <td className="max-w-[180px] truncate text-xs text-slate-600">{job.crewNames.join(', ')}</td>
                    <td className="text-[11px]">
                      <span className={job.photos.length ? 'text-emerald-600' : 'text-slate-400'}>{job.photos.length} photos</span>
                      <span className="block text-slate-400">{job.signatureDataUrl ? 'signed' : 'unsigned'}</span>
                    </td>
                    <td>
                      <StatusBadge kind="installation" status={job.status} />
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
