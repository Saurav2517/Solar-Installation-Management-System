import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PhotoUpload } from '../components/PhotoUpload';
import { SignaturePad } from '../components/SignaturePad';
import {
  Badge,
  Btn,
  Card,
  ErrorState,
  Field,
  Input,
  KV,
  Loading,
  PageHeader,
  StatusBadge,
  Textarea,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, fmtDate, fmtDateTime, fmtTime } from '../lib/format';
import type { InstallationDetailData } from '../lib/types';

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface FormState {
  startedAt: string;
  finishedAt: string;
  panelsInstalled: string;
  generationTestKw: string;
  notes: string;
  photos: string[];
  signature: string;
  signedByName: string;
  crewHours: Array<{ technicianId: string; hours: string }>;
}

export default function InstallationDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<InstallationDetailData>(`/installations/${id}`);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const inst = data.installation;
    setForm({
      startedAt: localInput(inst.startedAt),
      finishedAt: localInput(inst.finishedAt ?? new Date().toISOString()),
      panelsInstalled: String(inst.panelsInstalled ?? Math.ceil((inst.systemSizeKw * 1000) / 550)),
      generationTestKw: inst.generationTestKw != null ? String(inst.generationTestKw) : '',
      notes: inst.notes ?? '',
      photos: inst.photos,
      signature: inst.signatureDataUrl ?? '',
      signedByName: inst.signedByName ?? inst.customerName,
      crewHours: inst.crewIds.map((cid) => {
        const existing = inst.crewHours.find((c) => c.technicianId === cid);
        return { technicianId: cid, hours: String(existing?.hours ?? 8) };
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.installation.id]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data || !form) return null;

  const inst = data.installation;
  const completed = inst.status === 'completed';
  const order = data.order;

  const saveProgress = async () => {
    setBusy(true);
    try {
      await api.patch(`/installations/${inst.id}`, {
        startedAt: new Date(form.startedAt).toISOString(),
        finishedAt: new Date(form.finishedAt).toISOString(),
        panelsInstalled: Number(form.panelsInstalled),
        generationTestKw: form.generationTestKw ? Number(form.generationTestKw) : undefined,
        notes: form.notes,
        photos: form.photos,
        crewHours: form.crewHours.map((c) => ({ technicianId: c.technicianId, hours: Number(c.hours) })),
      });
      toast('Job sheet saved');
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const startJob = async () => {
    setBusy(true);
    try {
      await api.patch(`/installations/${inst.id}`, { startedAt: new Date().toISOString() });
      toast('Job started — the office can see you are on site');
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!form.photos.length) return toast('Upload at least one photo of the finished roof', 'error');
    if (!form.signature) return toast('Get the customer to sign before closing the job', 'error');
    if (!form.signedByName.trim()) return toast('Enter the name of the person signing', 'error');
    setBusy(true);
    try {
      await api.post(`/installations/${inst.id}/complete`, {
        signatureDataUrl: form.signature,
        signedByName: form.signedByName,
        photos: form.photos,
        startedAt: new Date(form.startedAt).toISOString(),
        finishedAt: new Date(form.finishedAt).toISOString(),
        panelsInstalled: Number(form.panelsInstalled),
        generationTestKw: form.generationTestKw ? Number(form.generationTestKw) : undefined,
        notes: form.notes,
        crewHours: form.crewHours.map((c) => ({ technicianId: c.technicianId, hours: Number(c.hours) })),
      });
      toast('Installation signed off — order marked installed');
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Job ${inst.ref}`}
        subtitle={`${inst.customerName} · ${capacityText(inst.systemSizeKw, order?.systemType ?? 'on-grid')}`}
        backTo="/installations"
        backLabel="All installations"
        actions={
          <>
            {order && (
              <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
                Order {order.ref}
              </Link>
            )}
            {completed && (
              <Btn variant="ghost" size="sm" onClick={() => window.print()}>
                <Icon name="download" className="h-3.5 w-3.5" />
                Print job sheet
              </Btn>
            )}
            <StatusBadge kind="installation" status={inst.status} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {completed ? (
            <Card>
              <div id="print-area" className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">SunPower Solutions</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">Installation &amp; commissioning sheet</h2>
                    <p className="text-[11px] text-slate-500">
                      {inst.ref} · order {order?.ref} · signed {fmtDateTime(inst.signedAt)}
                    </p>
                  </div>
                  <Badge tone="green">Signed off</Badge>
                </div>

                <dl className="grid gap-x-8 py-4 sm:grid-cols-2">
                  <KV label="Customer" value={inst.customerName} />
                  <KV label="Site" value={inst.address} />
                  <KV label="System size" value={`${inst.systemSizeKw} kW`} />
                  <KV label="Panels installed" value={String(inst.panelsInstalled ?? '—')} />
                  <KV label="Start" value={`${fmtDate(inst.startedAt)} ${fmtTime(inst.startedAt)}`} />
                  <KV label="Finish" value={`${fmtDate(inst.finishedAt)} ${fmtTime(inst.finishedAt)}`} />
                  <KV label="Generation test" value={inst.generationTestKw ? `${inst.generationTestKw} kW` : '—'} />
                  <KV label="Inverter serial" value={inst.inverterSerial ?? '—'} />
                </dl>

                {inst.notes && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{inst.notes}</p>}

                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Finished roof photos</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {inst.photos.map((p, i) => (
                      <img key={i} src={p} alt={`Roof photo ${i + 1}`} className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Crew hours</p>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Technician</th>
                          <th className="text-right">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inst.crewHours.map((c) => (
                          <tr key={c.technicianId}>
                            <td className="text-xs">{data.technicians.find((t) => t.id === c.technicianId)?.name ?? c.technicianId}</td>
                            <td className="mono text-right text-xs">{c.hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Customer acceptance</p>
                    {inst.signatureDataUrl && (
                      <img src={inst.signatureDataUrl} alt="Customer signature" className="w-full rounded-lg border border-slate-200 bg-white" />
                    )}
                    <p className="mt-1 text-xs font-medium text-slate-700">{inst.signedByName}</p>
                    <p className="text-[11px] text-slate-500">Signed on site · {fmtDateTime(inst.signedAt)}</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="section-title">On-site job sheet</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Fill this on the phone. Start and finish times, system size, photos and the customer's signature.</p>
                </div>
                <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                  <Field label="Start time">
                    <Input type="datetime-local" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} />
                  </Field>
                  <Field label="Finish time">
                    <Input type="datetime-local" value={form.finishedAt} onChange={(e) => setForm({ ...form, finishedAt: e.target.value })} />
                  </Field>
                  <Field label="System size confirmed (kW)">
                    <Input value={inst.systemSizeKw} disabled />
                  </Field>
                  <Field label="Panels installed">
                    <Input
                      type="number"
                      value={form.panelsInstalled}
                      onChange={(e) => setForm({ ...form, panelsInstalled: e.target.value })}
                    />
                  </Field>
                  <Field label="Generation test (kW)">
                    <Input
                      type="number"
                      step="0.1"
                      value={form.generationTestKw}
                      onChange={(e) => setForm({ ...form, generationTestKw: e.target.value })}
                      placeholder="e.g. 2.4"
                    />
                  </Field>
                  <Field label="Inverter serial">
                    <Input value={inst.inverterSerial ?? data.serials.find((s) => s.productId.startsWith('INV-'))?.serialNo ?? '—'} disabled />
                  </Field>
                  <Field label="Site notes" className="sm:col-span-2">
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Earthing done, meter readings, customer briefing…"
                    />
                  </Field>
                </div>
              </Card>

              <Card>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="section-title">Proof of work</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Photos of the finished roof and the customer's signature.</p>
                </div>
                <div className="space-y-5 px-5 py-4">
                  <PhotoUpload photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
                  <div>
                    <SignaturePad value={form.signature} onChange={(signature) => setForm({ ...form, signature })} />
                    <Field label="Signed by" className="mt-3">
                      <Input value={form.signedByName} onChange={(e) => setForm({ ...form, signedByName: e.target.value })} />
                    </Field>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="section-title">Crew hours</h2>
                  <p className="mt-0.5 text-xs text-slate-500">These hours become technician pay and the job's real labour cost.</p>
                </div>
                <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
                  {form.crewHours.map((c, idx) => {
                    const tech = data.technicians.find((t) => t.id === c.technicianId);
                    return (
                      <Field key={c.technicianId} label={`${tech?.name ?? c.technicianId} (${tech?.role})`}>
                        <Input
                          type="number"
                          step="0.5"
                          value={c.hours}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              crewHours: form.crewHours.map((x, i) => (i === idx ? { ...x, hours: e.target.value } : x)),
                            })
                          }
                        />
                      </Field>
                    );
                  })}
                </div>
              </Card>

              <div className="flex flex-wrap gap-2">
                {inst.status === 'scheduled' && (
                  <Btn variant="ghost" onClick={() => void startJob()} disabled={busy}>
                    <Icon name="clock" className="h-4 w-4" />
                    Start job
                  </Btn>
                )}
                <Btn variant="primary" onClick={() => void saveProgress()} disabled={busy}>
                  Save progress
                </Btn>
                <Btn variant="accent" onClick={() => void complete()} disabled={busy}>
                  <Icon name="check" className="h-4 w-4" />
                  Complete &amp; sign off
                </Btn>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card className="card-pad">
            <h2 className="section-title mb-3">Job details</h2>
            <dl>
              <KV label="Customer" value={inst.customerName} />
              <KV label="Phone" value={data.customer?.phone ?? '—'} />
              <KV label="Address" value={inst.address} />
              <KV label="Scheduled" value={fmtDate(inst.scheduledDate)} />
              <KV label="Crew" value={data.crewNames.join(', ')} />
              <KV label="Order status" value={order?.status ?? '—'} />
            </dl>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-3">Material on site</h2>
            <ul className="space-y-1.5">
              {data.serials.map((s) => (
                <li key={s.id} className="flex justify-between gap-2 text-[11px]">
                  <span className="min-w-0 text-slate-600">
                    {s.productId}
                    <span className="block font-mono text-[10px] text-slate-400">{s.serialNo}</span>
                  </span>
                  <StatusBadge kind="serial" status={s.status} />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="card-pad">
            <h2 className="section-title mb-2">Safety reminder</h2>
            <p className="text-[11px] text-slate-500">
              Isolate the AC side before wiring the ACDB. Verify earthing resistance before commissioning. Photograph the earth pit and the meter
              reading.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
