import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Empty, ErrorState, Loading, PageHeader, StatusBadge, Tabs } from '../components/ui';
import { useApi } from '../lib/api';
import { capacityText, fmtDate, fmtDateTime } from '../lib/format';
import type { SurveyData } from '../lib/types';

const TABS = [
  { id: 'upcoming', label: 'Scheduled' },
  { id: 'completed', label: 'Awaiting approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'all', label: 'All' },
];

export default function Surveys() {
  const { data, error, loading, reload } = useApi<SurveyData>('/surveys');
  const [tab, setTab] = useState('upcoming');

  const rows = data?.surveys ?? [];
  const counts = useMemo(
    () => ({
      upcoming: rows.filter((s) => s.status === 'scheduled').length,
      completed: rows.filter((s) => s.status === 'completed').length,
      approved: rows.filter((s) => s.status === 'approved').length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = rows.filter((s) =>
    tab === 'all' ? true : tab === 'upcoming' ? s.status === 'scheduled' : s.status === tab,
  );

  return (
    <>
      <PageHeader
        title="Site surveys"
        subtitle="Roof direction, tilt and cable distance — measured before any quote leaves the office."
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
          <Empty
            title="No surveys in this list"
            hint="Book a survey from a qualified enquiry and it appears here with the technician's findings."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Scheduled</th>
                  <th>Technician</th>
                  <th>Roof</th>
                  <th>Recommendation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-500">{s.ref}</td>
                    <td>
                      <Link to={`/enquiries/${s.enquiryId}`} className="font-semibold text-slate-900 hover:text-amber-700">
                        {s.customerName}
                      </Link>
                      <span className="block text-[11px] text-slate-500">{s.phone}</span>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {fmtDate(s.scheduledAt)}
                      <span className="block text-[11px] text-slate-400">
                        {s.completedAt ? `done ${fmtDate(s.completedAt)}` : fmtDateTime(s.scheduledAt).split(', ')[1]}
                      </span>
                    </td>
                    <td className="text-xs text-slate-600">{s.technicianName ?? '—'}</td>
                    <td className="text-xs text-slate-600">
                      {s.roofDirection ?? '—'}
                      {s.tiltDegrees != null && <span className="block text-[11px] text-slate-400">{s.tiltDegrees}° tilt</span>}
                    </td>
                    <td className="text-xs text-slate-600">
                      {s.recommendedKw ? capacityText(s.recommendedKw, s.recommendedType ?? 'on-grid') : '—'}
                      {s.cableDistanceM != null && <span className="block text-[11px] text-slate-400">{s.cableDistanceM} m cable</span>}
                    </td>
                    <td>
                      <StatusBadge kind="survey" status={s.status} />
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
