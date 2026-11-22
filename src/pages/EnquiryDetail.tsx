import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  ErrorState,
  Field,
  Input,
  KV,
  Loading,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, fmtDate, fmtDateTime, inr, timeAgo } from '../lib/format';
import type { EnquiryDetailData } from '../lib/types';
import type { CapacityKw, SystemType } from '../../shared/types';

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<EnquiryDetailData>(`/enquiries/${id}`);
  const [busy, setBusy] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const [qualify, setQualify] = useState({
    monthlyBill: '',
    roofAreaSqft: '',
    gridConnectionOk: true,
    notes: '',
  });
  const [surveyForm, setSurveyForm] = useState({
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    technicianId: '',
    notes: '',
  });
  const [surveyResult, setSurveyResult] = useState({
    roofDirection: 'South',
    tiltDegrees: '12',
    cableDistanceM: '25',
    shadowFreeAreaSqft: '',
    structureType: 'RCC Roof',
    findings: '',
    recommendedKw: '3',
    recommendedType: 'on-grid' as SystemType,
  });
  const [approvedBy, setApprovedBy] = useState('Rajesh Menon');

  const enquiry = data?.enquiry;

  useEffect(() => {
    if (!enquiry) return;
    setQualify({
      monthlyBill: enquiry.monthlyBill ? String(enquiry.monthlyBill) : '',
      roofAreaSqft: enquiry.roofAreaSqft ? String(enquiry.roofAreaSqft) : '',
      gridConnectionOk: enquiry.gridConnectionOk ?? true,
      notes: '',
    });
    setSurveyResult((s) => ({
      ...s,
      shadowFreeAreaSqft: enquiry.roofAreaSqft ? String(enquiry.roofAreaSqft) : '',
      recommendedKw: String(enquiry.requestedKw),
      recommendedType: enquiry.requestedType,
    }));
    setSurveyForm((s) => ({
      ...s,
      technicianId: s.technicianId || data?.technicians.find((t) => t.role === 'lead')?.id || '',
    }));
  }, [enquiry?.id, enquiry?.monthlyBill, enquiry?.roofAreaSqft, enquiry?.requestedKw, enquiry?.requestedType, data?.technicians]);

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

  const events = useMemo(() => {
    if (!data) return [];
    const e = data.enquiry;
    const list: Array<{ at: string; label: string; detail?: string }> = [
      { at: e.createdAt, label: 'Enquiry received', detail: `Source: ${e.source}` },
    ];
    if (e.qualifiedAt) list.push({ at: e.qualifiedAt, label: 'Qualified by sales', detail: `Bill ${inr(e.monthlyBill)}, roof ${e.roofAreaSqft} sq ft` });
    if (data.survey) {
      list.push({ at: data.survey.scheduledAt, label: 'Site survey booked', detail: data.technician });
      if (data.survey.completedAt)
        list.push({
          at: data.survey.completedAt,
          label: 'Survey completed',
          detail: `${data.survey.roofDirection}, ${data.survey.tiltDegrees}° tilt, ${data.survey.cableDistanceM} m cable`,
        });
      if (data.survey.approvedAt) list.push({ at: data.survey.approvedAt, label: 'Survey approved', detail: data.survey.approvedBy });
      if (data.survey.rejectionReason) list.push({ at: data.survey.completedAt ?? e.createdAt, label: 'Survey rejected', detail: data.survey.rejectionReason });
    }
    if (data.quote) {
      list.push({ at: data.quote.createdAt, label: 'Quote prepared', detail: `${data.quote.ref} · ${inr(data.quote.total)}` });
      if (data.quote.status === 'sent') list.push({ at: data.quote.createdAt, label: 'Quote sent to customer' });
      if (data.quote.status === 'accepted') list.push({ at: data.quote.createdAt, label: 'Quote accepted' });
      if (data.quote.status === 'rejected') list.push({ at: data.quote.createdAt, label: 'Quote declined' });
    }
    if (data.order) list.push({ at: data.order.createdAt, label: 'Order confirmed', detail: data.order.ref });
    if (e.lostReason) list.push({ at: e.createdAt, label: 'Enquiry lost', detail: e.lostReason });
    return list.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data || !enquiry) return null;

  const survey = data.survey;
  const quote = data.quote;
  const order = data.order;
  const canQualify = ['new', 'contacted'].includes(enquiry.status);

  return (
    <>
      <PageHeader
        title={enquiry.customerName}
        subtitle={`${enquiry.ref} · ${capacityText(enquiry.requestedKw, enquiry.requestedType)}${enquiry.wantsSubsidy ? ' · subsidy requested' : ''}`}
        backTo="/enquiries"
        backLabel="All enquiries"
        actions={
          <>
            <a href={`tel:${enquiry.phone}`} className="btn btn-ghost btn-sm">
              <Icon name="phone" className="h-3.5 w-3.5" />
              Call
            </a>
            {!['won', 'lost'].includes(enquiry.status) && (
              <Btn variant="ghost" size="sm" onClick={() => setLostOpen(true)}>
                Mark lost
              </Btn>
            )}
            <StatusBadge kind="enquiry" status={enquiry.status} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Qualification */}
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="section-title">1 · Qualify the enquiry</h2>
                <p className="mt-0.5 text-xs text-slate-500">Roof space, electricity bill and grid connection before anyone visits.</p>
              </div>
              {!canQualify && <Badge tone="green">Done</Badge>}
            </div>
            <div className="px-5 py-4">
              {canQualify ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Monthly bill (₹)">
                    <Input
                      type="number"
                      min={0}
                      value={qualify.monthlyBill}
                      onChange={(e) => setQualify({ ...qualify, monthlyBill: e.target.value })}
                      placeholder="4200"
                    />
                  </Field>
                  <Field label="Shadow-free roof (sq ft)">
                    <Input
                      type="number"
                      min={0}
                      value={qualify.roofAreaSqft}
                      onChange={(e) => setQualify({ ...qualify, roofAreaSqft: e.target.value })}
                      placeholder="320"
                    />
                  </Field>
                  <Field label="Grid connection">
                    <Select
                      value={qualify.gridConnectionOk ? 'yes' : 'no'}
                      onChange={(e) => setQualify({ ...qualify, gridConnectionOk: e.target.value === 'yes' })}
                    >
                      <option value="yes">Suitable</option>
                      <option value="no">Not suitable</option>
                    </Select>
                  </Field>
                  <Field label="Call notes" className="sm:col-span-3">
                    <Textarea
                      value={qualify.notes}
                      onChange={(e) => setQualify({ ...qualify, notes: e.target.value })}
                      placeholder="Roof type, shading, customer expectations, timeline…"
                    />
                  </Field>
                  <div className="sm:col-span-3">
                    <Btn
                      variant="primary"
                      disabled={busy}
                      onClick={() => {
                        const mb = Number(qualify.monthlyBill);
                        const ra = Number(qualify.roofAreaSqft);
                        if (!qualify.monthlyBill || Number.isNaN(mb) || mb < 0) { toast('Monthly electricity bill cannot be negative or empty', 'error'); return; }
                        if (!qualify.roofAreaSqft || Number.isNaN(ra) || ra < 0) { toast('Shadow-free roof area cannot be negative or empty', 'error'); return; }
                        void run(
                          () =>
                            api.post(`/enquiries/${enquiry.id}/qualify`, {
                              monthlyBill: mb,
                              roofAreaSqft: ra,
                              gridConnectionOk: qualify.gridConnectionOk,
                              notes: qualify.notes,
                            }),
                          'Enquiry qualified',
                        );
                      }}
                    >
                      Save & qualify
                    </Btn>
                  </div>
                </div>
              ) : (
                <dl className="grid gap-x-8 sm:grid-cols-2">
                  <KV label="Monthly bill" value={inr(enquiry.monthlyBill)} />
                  <KV label="Shadow-free roof" value={enquiry.roofAreaSqft ? `${enquiry.roofAreaSqft} sq ft` : '—'} />
                  <KV label="Grid connection" value={enquiry.gridConnectionOk ? 'Suitable' : 'Not suitable'} />
                  <KV label="Assigned to" value={enquiry.assignedTo ?? 'Unassigned'} />
                </dl>
              )}
            </div>
          </Card>

          {/* Survey */}
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="section-title">2 · Site survey</h2>
                <p className="mt-0.5 text-xs text-slate-500">Measure direction, tilt and cable distance. Quotes stay blocked until it is approved.</p>
              </div>
              {survey && <StatusBadge kind="survey" status={survey.status} />}
            </div>
            <div className="px-5 py-4">
              {!survey ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Survey date">
                    <Input
                      type="date"
                      value={surveyForm.scheduledAt}
                      onChange={(e) => setSurveyForm({ ...surveyForm, scheduledAt: e.target.value })}
                    />
                  </Field>
                  <Field label="Technician">
                    <Select
                      value={surveyForm.technicianId}
                      onChange={(e) => setSurveyForm({ ...surveyForm, technicianId: e.target.value })}
                    >
                      <option value="">Select technician</option>
                      {data.technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.role})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Notes">
                    <Input
                      value={surveyForm.notes}
                      onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
                      placeholder="Access instructions"
                    />
                  </Field>
                  <div className="sm:col-span-3">
                    <Btn
                      variant="primary"
                      disabled={busy || enquiry.status === 'new' || enquiry.status === 'contacted'}
                      onClick={() =>
                        void run(
                          () => api.post(`/enquiries/${enquiry.id}/survey`, surveyForm),
                          'Survey booked — the technician sees it on their schedule',
                        )
                      }
                    >
                      Book survey
                    </Btn>
                    {(enquiry.status === 'new' || enquiry.status === 'contacted') && (
                      <span className="ml-3 text-xs text-slate-500">Qualify the enquiry first.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <dl className="grid gap-x-8 sm:grid-cols-2">
                    <KV label="Scheduled" value={fmtDateTime(survey.scheduledAt)} />
                    <KV label="Technician" value={data.technician ?? '—'} />
                    {survey.completedAt && <KV label="Completed" value={fmtDate(survey.completedAt)} />}
                    {survey.roofDirection && <KV label="Roof direction" value={survey.roofDirection} />}
                    {survey.tiltDegrees != null && <KV label="Tilt" value={`${survey.tiltDegrees}°`} />}
                    {survey.cableDistanceM != null && <KV label="Cable distance" value={`${survey.cableDistanceM} m`} />}
                    {survey.structureType && <KV label="Structure" value={survey.structureType} />}
                    {survey.recommendedKw && (
                      <KV label="Recommended" value={capacityText(survey.recommendedKw, survey.recommendedType ?? 'on-grid')} />
                    )}
                  </dl>
                  {survey.findings && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{survey.findings}</p>}

                  {survey.status === 'scheduled' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-800">Record survey results</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Roof direction">
                          <Select
                            value={surveyResult.roofDirection}
                            onChange={(e) => setSurveyResult({ ...surveyResult, roofDirection: e.target.value })}
                          >
                            {['South', 'South-East', 'South-West', 'East', 'West', 'North'].map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Tilt (degrees)">
                          <Input
                            type="number"
                            value={surveyResult.tiltDegrees}
                            onChange={(e) => setSurveyResult({ ...surveyResult, tiltDegrees: e.target.value })}
                          />
                        </Field>
                        <Field label="Cable distance (m)">
                          <Input
                            type="number"
                            value={surveyResult.cableDistanceM}
                            onChange={(e) => setSurveyResult({ ...surveyResult, cableDistanceM: e.target.value })}
                          />
                        </Field>
                        <Field label="Shadow-free area (sq ft)">
                          <Input
                            type="number"
                            value={surveyResult.shadowFreeAreaSqft}
                            onChange={(e) => setSurveyResult({ ...surveyResult, shadowFreeAreaSqft: e.target.value })}
                          />
                        </Field>
                        <Field label="Structure">
                          <Select
                            value={surveyResult.structureType}
                            onChange={(e) => setSurveyResult({ ...surveyResult, structureType: e.target.value })}
                          >
                            <option>RCC Roof</option>
                            <option>Metal Sheet</option>
                            <option>Ground Mount</option>
                            <option>Elevated Shed</option>
                          </Select>
                        </Field>
                        <Field label="Recommended kW">
                          <Select
                            value={surveyResult.recommendedKw}
                            onChange={(e) => setSurveyResult({ ...surveyResult, recommendedKw: e.target.value })}
                          >
                            {[1, 2, 3, 4, 5].map((kw) => (
                              <option key={kw} value={kw}>
                                {kw} kW
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Recommended type">
                          <Select
                            value={surveyResult.recommendedType}
                            onChange={(e) => setSurveyResult({ ...surveyResult, recommendedType: e.target.value as SystemType })}
                          >
                            <option value="on-grid">On-Grid</option>
                            <option value="off-grid">Off-Grid</option>
                            <option value="hardware">Panel set only</option>
                          </Select>
                        </Field>
                        <Field label="Findings" className="sm:col-span-2">
                          <Input
                            value={surveyResult.findings}
                            onChange={(e) => setSurveyResult({ ...surveyResult, findings: e.target.value })}
                            placeholder="Shading, roof condition, meter location…"
                          />
                        </Field>
                      </div>
                      <Btn
                        className="mt-3"
                        variant="primary"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              api.post(`/surveys/${survey.id}/complete`, {
                                ...surveyResult,
                                tiltDegrees: Number(surveyResult.tiltDegrees),
                                cableDistanceM: Number(surveyResult.cableDistanceM),
                                shadowFreeAreaSqft: Number(surveyResult.shadowFreeAreaSqft),
                                recommendedKw: Number(surveyResult.recommendedKw) as CapacityKw,
                              }),
                            'Survey recorded — send it for approval',
                          )
                        }
                      >
                        Save survey result
                      </Btn>
                    </div>
                  )}

                  {survey.status === 'completed' && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Approve the survey to unlock quoting</p>
                      <div className="flex flex-wrap items-end gap-3">
                        <Field label="Approved by" className="w-full sm:w-56">
                          <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
                        </Field>
                        <Btn
                          variant="primary"
                          disabled={busy}
                          onClick={() => void run(() => api.post(`/surveys/${survey.id}/approve`, { approvedBy }), 'Survey approved — you can quote now')}
                        >
                          Approve survey
                        </Btn>
                        <Btn
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt('Why is this survey being rejected?');
                            if (reason) void run(() => api.post(`/surveys/${survey.id}/reject`, { reason }), 'Survey rejected');
                          }}
                        >
                          Reject
                        </Btn>
                      </div>
                    </div>
                  )}

                  {survey.status === 'approved' && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <Icon name="shield" className="h-4 w-4" />
                      Approved by {survey.approvedBy} on {fmtDate(survey.approvedAt)}. Quoting is unlocked.
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Quote */}
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="section-title">3 · Quote</h2>
                <p className="mt-0.5 text-xs text-slate-500">Built from the package template with every part included.</p>
              </div>
              {quote && <StatusBadge kind="quote" status={quote.status} />}
            </div>
            <div className="px-5 py-4">
              {!quote ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Btn
                    variant="accent"
                    disabled={busy || survey?.status !== 'approved'}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const created = await api.post<{ id: string }>('/quotes', { enquiryId: enquiry.id });
                        toast('Quote generated from the template');
                        navigate(`/quotes/${created.id}`);
                      } catch (err) {
                        toast((err as Error).message, 'error');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Icon name="file" className="h-4 w-4" />
                    Generate quote
                  </Btn>
                  {survey?.status !== 'approved' && (
                    <span className="text-xs text-slate-500">The survey must be approved before a quote can be sent.</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {quote.ref} · {inr(quote.total)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {quote.items.length} line items · {quote.marginPct}% margin
                      {quote.subsidyExpected ? ` · subsidy ${inr(quote.subsidyExpected)}` : ''}
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/quotes/${quote.id}`)}>
                    Open quote
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </Card>

          {order && (
            <Card>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <h2 className="section-title">4 · Order</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {order.ref} · {inr(order.total)} · {order.paymentStatus}
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/orders/${order.id}`)}>
                  Open order
                  <Icon name="arrowRight" className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card className="card-pad">
            <h2 className="section-title mb-3">Customer</h2>
            <dl>
              <KV label="Phone" value={enquiry.phone} />
              <KV label="Email" value={enquiry.email || '—'} />
              <KV label="Address" value={`${enquiry.address}, ${enquiry.city} ${enquiry.pincode}`} />
              <KV label="Source" value={<span className="capitalize">{enquiry.source}</span>} />
              <KV label="Assigned" value={enquiry.assignedTo ?? 'Unassigned'} />
              <KV label="Age" value={timeAgo(enquiry.createdAt)} />
            </dl>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">Requirement</h2>
            <dl>
              <KV label="System" value={capacityText(enquiry.requestedKw, enquiry.requestedType)} />
              <KV label="Subsidy" value={enquiry.wantsSubsidy ? 'Requested' : 'Not requested'} />
              <KV label="Monthly bill" value={inr(enquiry.monthlyBill)} />
              <KV label="Roof area" value={enquiry.roofAreaSqft ? `${enquiry.roofAreaSqft} sq ft` : '—'} />
              <KV label="Survey" value={survey ? survey.status.replace('_', ' ') : 'Not booked'} />
            </dl>
            {enquiry.notes && <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">{enquiry.notes}</p>}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Activity</h2>
            </div>
            <ol className="space-y-0 px-5 py-3">
              {events.map((ev, i) => (
                <li key={`${ev.label}-${i}`} className="relative flex gap-3 pb-4">
                  <span className="mt-1 flex flex-col items-center">
                    <span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    {i < events.length - 1 && <span className="mt-1 h-full w-px bg-slate-200" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-800">{ev.label}</span>
                    {ev.detail && <span className="block text-[11px] text-slate-500">{ev.detail}</span>}
                    <span className="block text-[10px] text-slate-400">
                      {fmtDate(ev.at)} · {timeAgo(ev.at)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Modal
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        title="Mark enquiry as lost"
        subtitle="Keep the reason so the team can learn from it."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setLostOpen(false)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              disabled={busy || !lostReason.trim()}
              onClick={() => {
                void run(() => api.post(`/enquiries/${enquiry.id}/lost`, { reason: lostReason }), 'Enquiry marked lost');
                setLostOpen(false);
              }}
            >
              Mark lost
            </Btn>
          </>
        }
      >
        <Field label="Reason">
          <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Chose a competitor, budget, roof not suitable…" />
        </Field>
      </Modal>
    </>
  );
}
