import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Badge, Btn, Card, Empty, ErrorState, Loading, PageHeader, useToast } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { inr, inrCompact } from '../../lib/format';
import type { SystemType } from '../../../shared/types';

interface CatalogPackage {
  sku: string;
  kw: number;
  type: SystemType;
  title: string;
  subtotal: number;
  total: number;
  subsidy: number;
  panels: number;
  batteries: number;
}

interface Accessory {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  warrantyMonths: number;
}

interface Catalog {
  packages: CatalogPackage[];
  accessories: Accessory[];
  categories: string[];
}

interface CartLine {
  sku: string;
  name: string;
  qty: number;
  net: number;
  kind: 'package' | 'accessory';
}

const TYPES: Array<{ id: SystemType; label: string; blurb: string }> = [
  { id: 'on-grid', label: 'On-Grid', blurb: 'Grid-tied, subsidy eligible' },
  { id: 'off-grid', label: 'Off-Grid', blurb: 'Battery backup for outages' },
  { id: 'hardware', label: 'Panel set', blurb: 'Panels, stands and wiring' },
];

const GST = 0.138;
const ADVANCE_RATE = 0.2;

export default function Shop() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Catalog>('/catalog');
  const [type, setType] = useState<SystemType>('on-grid');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [wantsSubsidy, setWantsSubsidy] = useState(true);
  const [placing, setPlacing] = useState(false);

  const add = (line: Omit<CartLine, 'qty'>) => {
    setCart((current) => {
      const existing = current.find((l) => l.sku === line.sku);
      if (existing) return current.map((l) => (l.sku === line.sku ? { ...l, qty: l.qty + 1 } : l));
      return [...current, { ...line, qty: 1 }];
    });
  };

  const changeQty = (sku: string, delta: number) => {
    setCart((current) =>
      current
        .map((l) => (l.sku === sku ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const totals = useMemo(() => {
    const net = cart.reduce((sum, l) => sum + l.net * l.qty, 0);
    const tax = Math.round(net * GST);
    const subsidy = cart.reduce((sum, l) => {
      if (l.kind !== 'package') return sum;
      const pkg = data?.packages.find((p) => p.sku === l.sku);
      return sum + (pkg?.subsidy ?? 0) * l.qty;
    }, 0);
    const total = net + tax;
    return { net, tax, total, subsidy, advance: Math.round(total * ADVANCE_RATE) };
  }, [cart, data]);

  const placeOrder = async () => {
    if (!cart.length) return;
    setPlacing(true);
    try {
      const result = await api.post<{ order: { id: string; ref: string } }>('/portal/orders', {
        items: cart.map((l) => ({ sku: l.sku, qty: l.qty })),
        wantsSubsidy,
        notes,
      });
      toast(`Order ${result.order.ref} created — pay the 20% advance to confirm it`);
      navigate(`/portal/orders/${result.order.id}/pay`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Loading label="Loading the catalogue…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const packages = data.packages.filter((p) => p.type === type);

  return (
    <>
      <PageHeader
        title="Build your solar system"
        subtitle="Pick a ready-made package or add accessories. Your order goes straight to the SunPower team for confirmation."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="section-title">Solar packages</h2>
                <p className="mt-0.5 text-xs text-slate-500">Complete systems with panels, inverter, mounting and wiring.</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      type === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="px-5 pt-3 text-[11px] text-slate-500">{TYPES.find((t) => t.id === type)?.blurb}</p>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {packages.map((pkg) => (
                <div key={pkg.sku} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold capitalize text-slate-900">{pkg.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {pkg.panels} panels
                        {pkg.batteries ? ` · ${pkg.batteries} batteries` : ''}
                      </p>
                    </div>
                    {pkg.subsidy > 0 && <Badge tone="green">₹{inrCompact(pkg.subsidy)} subsidy</Badge>}
                  </div>
                  <p className="mono mt-3 text-lg font-bold text-slate-900">{inr(pkg.total)}</p>
                  <p className="text-[10px] text-slate-500">incl. GST · {inr(pkg.subtotal)} + 13.8%</p>
                  <Btn
                    variant="primary"
                    size="sm"
                    className="mt-3 w-full justify-center"
                    onClick={() =>
                      add({ sku: pkg.sku, name: pkg.title, net: pkg.subtotal, kind: 'package' })
                    }
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    Add to cart
                  </Btn>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Add-ons &amp; accessories</h2>
              <p className="mt-0.5 text-xs text-slate-500">Batteries, cabling, structure and service plans.</p>
            </div>
            {data.accessories.length === 0 ? (
              <Empty title="No add-ons" hint="Ask SunPower about additional equipment." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.accessories.map((item) => (
                  <li key={item.sku} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.category} · per {item.unit} · {item.warrantyMonths} month warranty
                      </p>
                    </div>
                    <span className="mono text-xs font-semibold">{inr(item.price)}</span>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => add({ sku: item.sku, name: item.name, net: item.price, kind: 'accessory' })}
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />
                      Add
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-20">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Your cart</h2>
              <Badge tone={cart.length ? 'amber' : 'slate'}>{cart.reduce((s, l) => s + l.qty, 0)} items</Badge>
            </div>

            {cart.length === 0 ? (
              <Empty title="Nothing added yet" hint="Add a package or an accessory to start your order." />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {cart.map((line) => (
                    <li key={line.sku} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">{line.name}</p>
                        <p className="mono whitespace-nowrap text-xs font-semibold">{inr(line.net * line.qty)}</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => changeQty(line.sku, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                          aria-label={`Remove one ${line.name}`}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{line.qty}</span>
                        <button
                          onClick={() => changeQty(line.sku, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                          aria-label={`Add one ${line.name}`}
                        >
                          +
                        </button>
                        <button
                          onClick={() => changeQty(line.sku, -line.qty)}
                          className="ml-auto text-[11px] font-medium text-slate-500 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1.5 border-t border-slate-100 px-5 py-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="mono">{inr(totals.net)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST 13.8%</span>
                    <span className="mono">{inr(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm font-bold text-slate-900">
                    <span>Estimated total</span>
                    <span className="mono">{inr(totals.total)}</span>
                  </div>
                  {totals.subsidy > 0 && (
                    <p className="text-[11px] font-medium text-emerald-700">
                      Up to {inr(totals.subsidy)} PM Surya Ghar subsidy may apply.
                    </p>
                  )}
                  <div className="flex justify-between rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-900">
                    <span>Advance payable now (20%)</span>
                    <span className="mono">{inr(totals.advance)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Balance after advance</span>
                    <span className="mono">{inr(totals.total - totals.advance)}</span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                  <label className="flex items-start gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={wantsSubsidy}
                      onChange={(e) => setWantsSubsidy(e.target.checked)}
                      className="mt-0.5"
                    />
                    Apply for the PM Surya Ghar subsidy on my behalf
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Anything the team should know — roof type, preferred install week…"
                    className="input text-xs"
                  />
                  <Btn variant="accent" className="w-full justify-center" disabled={placing} onClick={() => void placeOrder()}>
                    {placing ? 'Creating your order…' : `Place order & pay ${inr(totals.advance)} advance`}
                  </Btn>
                  <p className="text-[10px] text-slate-500">
                    You pay a 20% advance now to confirm the order. The balance is due once the system is installed.
                  </p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
