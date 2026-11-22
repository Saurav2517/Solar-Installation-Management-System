import { useState } from 'react';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  Empty,
  ErrorState,
  Input,
  Loading,
  PageHeader,
  Progress,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { capacityText, fmtDate, inr } from '../lib/format';
import type { DispatchQueueItem } from '../lib/types';

export default function Dispatch() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ queue: DispatchQueueItem[] }>('/dispatch');
  const [scanValue, setScanValue] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const scan = async (orderId: string, serialNo: string) => {
    if (!serialNo.trim()) return;
    setBusy(orderId);
    try {
      const res = await api.post<{ scanned: number; total: number }>(`/orders/${orderId}/scan`, { serialNo });
      toast(`Scanned — ${res.scanned}/${res.total} units packed`);
      setScanValue((s) => ({ ...s, [orderId]: '' }));
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const dispatch = async (orderId: string) => {
    setBusy(orderId);
    try {
      await api.post(`/orders/${orderId}/dispatch`);
      toast('Material dispatched — warranty clocks started for every serial');
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  const queue = data?.queue ?? [];

  return (
    <>
      <PageHeader
        title="Dispatch"
        subtitle="Scan every inverter, battery, controller and panel before the truck leaves. Warranty starts the moment it is dispatched."
      />

      {queue.length === 0 ? (
        <Card>
          <Empty title="Nothing waiting to dispatch" hint="Confirmed orders appear here with their reserved serial numbers." />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {queue.map((item) => {
            const pct = item.total ? (item.scanned / item.total) * 100 : 0;
            const complete = item.total > 0 && item.scanned === item.total;
            const remaining = item.serials.filter((s) => !s.scanned);
            return (
              <Card key={item.order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="font-mono text-[11px] text-slate-500">{item.order.ref}</p>
                    <h2 className="text-sm font-bold text-slate-900">{item.order.customerName}</h2>
                    <p className="text-[11px] text-slate-500">
                      {capacityText(item.order.capacityKw, item.order.systemType)} · {inr(item.order.total)} · install {fmtDate(item.order.scheduledDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={complete ? 'green' : 'amber'}>
                      {item.scanned}/{item.total} scanned
                    </Badge>
                    <p className="mt-1 text-[10px] text-slate-400">{item.customer?.phone}</p>
                  </div>
                </div>

                <div className="px-5 pt-4">
                  <Progress value={pct} tone={complete ? 'green' : 'amber'} />
                </div>

                <div className="max-h-72 overflow-y-auto px-5 py-3">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Serial</th>
                        <th className="text-right">Scan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.serials.map((s) => (
                        <tr key={s.id}>
                          <td className="text-[11px]">
                            {s.productName}
                            <span className="block text-[10px] text-slate-400">{s.status}</span>
                          </td>
                          <td className="font-mono text-[11px]">{s.serialNo}</td>
                          <td className="text-right">
                            {s.scanned ? (
                              <Badge tone="green">
                                <Icon name="check" className="h-3 w-3" /> Packed
                              </Badge>
                            ) : (
                              <Btn
                                variant="ghost"
                                size="sm"
                                disabled={busy === item.order.id}
                                onClick={() => void scan(item.order.id, s.serialNo)}
                              >
                                Scan
                              </Btn>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void scan(item.order.id, scanValue[item.order.id] ?? '');
                    }}
                  >
                    <div className="relative flex-1">
                      <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        value={scanValue[item.order.id] ?? ''}
                        onChange={(e) => setScanValue((s) => ({ ...s, [item.order.id]: e.target.value }))}
                        placeholder={remaining[0] ? `Scan or type e.g. ${remaining[0].serialNo}` : 'All units scanned'}
                        className="pl-9 font-mono text-xs"
                        disabled={complete}
                      />
                    </div>
                    <Btn type="submit" variant="ghost" disabled={complete || busy === item.order.id}>
                      Scan
                    </Btn>
                  </form>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">
                      {complete ? 'All units verified — ready to load.' : `${remaining.length} unit(s) still to scan.`}
                    </p>
                    <Btn variant="accent" disabled={!complete || busy === item.order.id} onClick={() => void dispatch(item.order.id)}>
                      <Icon name="truck" className="h-4 w-4" />
                      Dispatch material
                    </Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
