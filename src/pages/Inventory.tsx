import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { fmtDate, inr, inrCompact } from '../lib/format';
import type { InventoryData, SerialRow, WarrantyLookup } from '../lib/types';

export default function Inventory() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<InventoryData>('/inventory');
  const [tab, setTab] = useState('products');
  const [stockFor, setStockFor] = useState<string | null>(null);
  const [stockForm, setStockForm] = useState({ qty: '10', unitCost: '', vendor: '' });
  const [busy, setBusy] = useState(false);
  const [serialQuery, setSerialQuery] = useState('');
  const [serialResults, setSerialResults] = useState<SerialRow[] | null>(null);
  const [warrantyQuery, setWarrantyQuery] = useState('');
  const [warranty, setWarranty] = useState<WarrantyLookup | null>(null);

  const products = data?.products ?? [];
  const product = products.find((p) => p.sku === stockFor);

  const receive = async () => {
    if (!product) return;
    setBusy(true);
    try {
      await api.post('/inventory/stock', {
        sku: product.sku,
        qty: Number(stockForm.qty),
        unitCost: stockForm.unitCost ? Number(stockForm.unitCost) : undefined,
        vendor: stockForm.vendor || undefined,
        createExpense: true,
      });
      toast(`Stock received — ${stockForm.qty} × ${product.name}`);
      setStockFor(null);
      setStockForm({ qty: '10', unitCost: '', vendor: '' });
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const searchSerials = async (q: string) => {
    setSerialQuery(q);
    if (q.trim().length < 2) {
      setSerialResults(null);
      return;
    }
    try {
      setSerialResults(await api.get<SerialRow[]>(`/serials?q=${encodeURIComponent(q)}`));
    } catch {
      setSerialResults([]);
    }
  };

  const lookupWarranty = async () => {
    if (!warrantyQuery.trim()) return;
    try {
      setWarranty(await api.get<WarrantyLookup>(`/warranty?serial=${encodeURIComponent(warrantyQuery)}`));
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <>
      <PageHeader
        title="Inventory & serials"
        subtitle="Panels, inverters, batteries and controllers — every unit traceable to a customer and a warranty."
        actions={
          <Btn variant="accent" onClick={() => setStockFor(products[0]?.sku ?? '')}>
            <Icon name="plus" className="h-4 w-4" />
            Receive stock
          </Btn>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Serials in stock" value={data?.stats.inStock ?? 0} />
        <MiniStat label="Dispatched" value={data?.stats.dispatched ?? 0} />
        <MiniStat label="Installed" value={data?.stats.installed ?? 0} />
        <MiniStat label="Stock value at cost" value={inrCompact(data?.stats.value ?? 0)} />
      </div>

      <Card>
        <div className="px-4 pt-4">
          <Tabs
            tabs={[
              { id: 'products', label: 'Products', count: products.length },
              { id: 'serials', label: 'Serial register' },
              { id: 'warranty', label: 'Warranty lookup' },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === 'products' && (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>SKU / product</th>
                  <th>Category</th>
                  <th className="text-right">In stock</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Sell</th>
                  <th>Warranty</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.sku}>
                    <td>
                      <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {p.sku}
                        {p.serialized ? ' · serial tracked' : ''}
                      </p>
                    </td>
                    <td className="text-[11px] capitalize text-slate-500">{p.category}</td>
                    <td className="mono text-right text-xs">
                      <span className={p.low ? 'font-bold text-rose-600' : 'font-semibold'}>{p.stockQty}</span>
                      {p.serialized && <span className="block text-[10px] text-slate-400">{p.availableSerials} serials</span>}
                      {p.low && <Badge tone="red">Reorder</Badge>}
                    </td>
                    <td className="mono text-right text-xs">{inr(p.costPrice)}</td>
                    <td className="mono text-right text-xs font-semibold">{inr(p.sellPrice)}</td>
                    <td className="whitespace-nowrap text-[11px] text-slate-500">
                      {p.warrantyMonths ? `${p.warrantyMonths >= 12 ? `${Math.round(p.warrantyMonths / 12)} yr` : `${p.warrantyMonths} mo`}` : '—'}
                    </td>
                    <td className="text-right">
                      <Btn variant="ghost" size="sm" onClick={() => setStockFor(p.sku)}>
                        Receive
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'serials' && (
          <div className="p-4">
            <div className="relative max-w-md">
              <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={serialQuery}
                onChange={(e) => void searchSerials(e.target.value)}
                placeholder="Search any serial number…"
                className="input pl-9 font-mono text-xs"
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Customer / order</th>
                    <th>Warranty until</th>
                  </tr>
                </thead>
                <tbody>
                  {(serialResults ?? data?.serials ?? []).map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap font-mono text-[11px]">{s.serialNo}</td>
                      <td className="max-w-[240px] truncate text-[11px]">{s.productName}</td>
                      <td>
                        <StatusBadge kind="serial" status={s.status} />
                      </td>
                      <td className="text-[11px]">
                        {s.customerName ?? '—'}
                        <span className="block text-[10px] text-slate-400">{s.orderRef ?? ''}</span>
                      </td>
                      <td className="whitespace-nowrap text-[11px]">
                        {fmtDate(s.warrantyEnd)}
                        {s.warrantyEnd && (
                          <span className={`block text-[10px] ${s.inWarranty ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {s.inWarranty ? 'In warranty' : 'Expired'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(serialResults ?? data?.serials ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-500">
                        No serials match that search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'warranty' && (
          <div className="p-5">
            <div className="flex max-w-xl flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={warrantyQuery}
                  onChange={(e) => setWarrantyQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void lookupWarranty()}
                  placeholder="Scan or type an inverter / battery serial"
                  className="input pl-9 font-mono text-xs"
                />
              </div>
              <Btn variant="primary" onClick={() => void lookupWarranty()}>
                Check warranty
              </Btn>
            </div>

            {warranty && !warranty.found && (
              <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                No unit found with that serial. Check the label again — every unit we ship is registered here.
              </div>
            )}

            {warranty?.found && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</p>
                    <Badge tone={warranty.inWarranty ? 'green' : 'red'}>
                      {warranty.inWarranty ? 'In warranty' : 'Out of warranty'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{warranty.product?.name}</p>
                  <p className="font-mono text-[11px] text-slate-500">{warranty.unit?.serialNo}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Warranty ends {fmtDate(warranty.unit?.warrantyEnd)} · dispatched {fmtDate(warranty.unit?.dispatchedAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Installed at</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{warranty.customer?.name ?? '—'}</p>
                  <p className="text-[11px] text-slate-500">{warranty.customer?.phone}</p>
                  <p className="text-[11px] text-slate-500">
                    {warranty.customer?.address}, {warranty.customer?.city}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">Order {warranty.order?.ref ?? '—'}</p>
                  <Btn
                    variant="accent"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      navigate(
                        `/tickets?new=1&serial=${encodeURIComponent(warranty.unit?.serialNo ?? '')}&customer=${encodeURIComponent(
                          warranty.customer?.id ?? '',
                        )}`,
                      )
                    }
                  >
                    Raise service ticket
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={!!stockFor}
        onClose={() => setStockFor(null)}
        title="Receive stock"
        subtitle={product ? `${product.name} · currently ${product.stockQty} in stock` : ''}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setStockFor(null)}>
              Cancel
            </Btn>
            <Btn variant="accent" disabled={busy || !stockForm.qty} onClick={() => void receive()}>
              {busy ? 'Saving…' : 'Add to stock'}
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product" className="sm:col-span-2">
            <select className="input" value={stockFor ?? ''} onChange={(e) => setStockFor(e.target.value)}>
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <Input type="number" value={stockForm.qty} onChange={(e) => setStockForm({ ...stockForm, qty: e.target.value })} />
          </Field>
          <Field label="Unit cost (₹)" hint="Leave blank to keep the current cost">
            <Input
              type="number"
              value={stockForm.unitCost}
              onChange={(e) => setStockForm({ ...stockForm, unitCost: e.target.value })}
              placeholder={String(product?.costPrice ?? '')}
            />
          </Field>
          <Field label="Vendor" className="sm:col-span-2">
            <Input value={stockForm.vendor} onChange={(e) => setStockForm({ ...stockForm, vendor: e.target.value })} placeholder="Supplier name" />
          </Field>
          <p className="text-[11px] text-slate-500 sm:col-span-2">
            Serial-tracked products get new serial numbers automatically. A stock purchase expense is recorded for the director&apos;s reports.
          </p>
        </div>
      </Modal>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mono mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
