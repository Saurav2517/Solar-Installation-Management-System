import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Btn,
  Card,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, fmtDate, inr, inrCompact } from '../lib/format';
import type { EnquiriesData, QuoteRow } from '../lib/types';

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'draft', label: 'Draft' },
  { id: 'all', label: 'All' },
];

export default function Quotes() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ quotes: QuoteRow[] }>('/quotes');
  const { data: enquiryData } = useApi<EnquiriesData>('/enquiries');
  const [tab, setTab] = useState('open');
  const [open, setOpen] = useState(false);
  const [enquiryId, setEnquiryId] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = data?.quotes ?? [];
  const counts = useMemo(
    () => ({
      open: rows.filter((q) => q.status === 'sent').length,
      accepted: rows.filter((q) => q.status === 'accepted').length,
      draft: rows.filter((q) => q.status === 'draft').length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = rows.filter((q) => (tab === 'all' ? true : tab === 'open' ? q.status === 'sent' : q.status === tab));

  const quotable = (enquiryData?.enquiries ?? []).filter(
    (e) => e.status === 'survey_approved' && !e.quoteRef,
  );

  const create = async () => {
    setBusy(true);
    try {
      const created = await api.post<{ id: string }>('/quotes', { enquiryId });
      toast('Quote generated from the package template');
      setOpen(false);
      navigate(`/quotes/${created.id}`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle="Template-driven bills of materials — panels, inverter, stands, wiring and safety parts, every time."
        actions={
          <Btn variant="accent" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            New quote
          </Btn>
        }
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
            title="No quotes here"
            hint="Quotes can only be generated once a site survey is approved."
            action={
              <Btn variant="ghost" size="sm" onClick={() => setOpen(true)}>
                Create a quote
              </Btn>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>System</th>
                  <th className="text-right">Quote value</th>
                  <th className="text-right">Margin</th>
                  <th>Valid until</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {q.ref}
                      {q.orderRef && <span className="block text-[10px] text-emerald-600">{q.orderRef}</span>}
                    </td>
                    <td>
                      <p className="font-semibold text-slate-900">{q.customerName}</p>
                      <p className="text-[11px] text-slate-500">{q.enquiryRef}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs">{capacityText(q.capacityKw, q.systemType)}</td>
                    <td className="mono whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                      {inr(q.total)}
                      {q.subsidyExpected > 0 && (
                        <span className="block text-[10px] font-normal text-emerald-600">
                          subsidy {inrCompact(q.subsidyExpected)}
                        </span>
                      )}
                    </td>
                    <td className="mono whitespace-nowrap text-right text-xs">
                      {inrCompact(q.margin)}
                      <span className="block text-[10px] text-slate-400">{q.marginPct}%</span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(q.validUntil)}</td>
                    <td>
                      <StatusBadge kind="quote" status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Generate a quote"
        subtitle="Only enquiries with an approved survey are listed."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="accent" disabled={!enquiryId || busy} onClick={() => void create()}>
              {busy ? 'Generating…' : 'Generate quote'}
            </Btn>
          </>
        }
      >
        {quotable.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No enquiry is ready to quote. Approve a site survey first — that is the rule that keeps bad quotes off the street.
          </p>
        ) : (
          <Field label="Enquiry">
            <Select value={enquiryId} onChange={(e) => setEnquiryId(e.target.value)}>
              <option value="">Select an approved enquiry</option>
              {quotable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.ref} · {e.customerName} · {e.requestedKw} kW {e.requestedType}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Modal>
    </>
  );
}
