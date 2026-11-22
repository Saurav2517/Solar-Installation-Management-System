import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Badge,
  Btn,
  Card,
  Empty,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Progress,
  Select,
  Stat,
  StatusBadge,
  Tabs,
  useToast,
} from '../components/ui';
import { api, useApi } from '../lib/api';
import { fmtDate, inr, inrCompact } from '../lib/format';
import type { BillingData } from '../lib/types';
import type { ExpenseCategory } from '../../shared/types';

export default function Billing() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<BillingData>('/billing');
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') ?? 'invoices');
  const [busy, setBusy] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expense, setExpense] = useState({
    category: 'other' as ExpenseCategory,
    description: '',
    amount: '',
    vendor: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const run = async (fn: () => Promise<unknown>, message: string, key = 'x') => {
    setBusy(key);
    try {
      await fn();
      toast(message);
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const addExpense = async () => {
    setBusy('expense');
    try {
      await api.post('/expenses', {
        ...expense,
        amount: Number(expense.amount),
      });
      toast('Expense recorded');
      setExpenseOpen(false);
      setExpense({ category: 'other', description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) });
      await reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const s = data.summary;

  return (
    <>
      <PageHeader
        title="Billing & subsidy"
        subtitle="Invoices, government claims and every rupee that went out of the business."
        actions={
          <Btn variant="accent" onClick={() => setExpenseOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Record expense
          </Btn>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invoiced" value={inrCompact(s.invoiced)} sub={`${data.invoices.length} invoices`} tone="blue" icon={<Icon name="receipt" />} />
        <Stat label="Collected" value={inrCompact(s.collected)} sub={`${inrCompact(s.outstanding)} still due`} tone="green" icon={<Icon name="money" />} />
        <Stat label="Subsidy pending" value={inrCompact(s.subsidyPending)} sub={`${inrCompact(s.subsidyReceived)} received`} tone="amber" icon={<Icon name="shield" />} />
        <Stat label="Expenses booked" value={inrCompact(s.expenses)} sub="Stock, salaries and overheads" tone="slate" icon={<Icon name="chart" />} />
      </div>

      <Card>
        <div className="px-4 pt-4">
          <Tabs
            tabs={[
              { id: 'invoices', label: 'Invoices', count: data.invoices.length },
              { id: 'subsidy', label: 'Subsidy', count: data.subsidies.length },
              { id: 'expenses', label: 'Expenses', count: data.expenses.length },
              { id: 'payments', label: 'Payments', count: data.payments.length },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Issued</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="whitespace-nowrap font-mono text-[11px]">{inv.number}</td>
                    <td className="text-xs font-medium">{inv.customerName}</td>
                    <td className="text-[11px] capitalize text-slate-500">{inv.type}</td>
                    <td className="whitespace-nowrap text-[11px]">{fmtDate(inv.issuedAt)}</td>
                    <td className="mono text-right text-xs font-semibold">{inr(inv.total)}</td>
                    <td className="mono text-right text-xs">{inv.due > 0 ? inr(inv.due) : '—'}</td>
                    <td>
                      <StatusBadge kind="invoice" status={inv.status} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {inv.status === 'draft' && (
                        <Btn
                          variant="ghost"
                          size="sm"
                          disabled={busy === inv.id}
                          onClick={() => void run(() => api.post(`/invoices/${inv.id}/issue`), 'Invoice issued', inv.id)}
                        >
                          Issue
                        </Btn>
                      )}
                      {inv.status !== 'paid' && (
                        <Btn
                          variant="accent"
                          size="sm"
                          className="ml-1"
                          disabled={busy === inv.id}
                          onClick={() => void run(() => api.post(`/invoices/${inv.id}/pay`, { method: 'upi' }), 'Payment collected', inv.id)}
                        >
                          Collect
                        </Btn>
                      )}
                      {inv.orderId && (
                        <Link to={`/orders/${inv.orderId}`} className="ml-2 text-[11px] font-semibold text-amber-700">
                          Order
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'subsidy' && (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Application</th>
                  <th className="text-right">Amount</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.subsidies.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <p className="text-xs font-semibold text-slate-800">{sub.customerName}</p>
                      <p className="text-[10px] text-slate-400">
                        {sub.orderRef} · {sub.capacityKw} kW
                      </p>
                    </td>
                    <td className="text-[11px]">
                      {sub.applicationNo}
                      <span className="block text-[10px] text-slate-400">{sub.scheme}</span>
                    </td>
                    <td className="mono text-right text-xs font-semibold">{inr(sub.amount)}</td>
                    <td className="min-w-[120px]">
                      <Progress value={(sub.docsReceived / Math.max(1, sub.docsTotal)) * 100} tone={sub.docsReceived === sub.docsTotal ? 'green' : 'amber'} />
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {sub.docsReceived}/{sub.docsTotal} collected
                      </span>
                    </td>
                    <td>
                      <StatusBadge kind="subsidy" status={sub.status} />
                    </td>
                    <td className="text-right">
                      <Link to={`/orders/${sub.orderId}`} className="text-[11px] font-semibold text-amber-700">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-[10px] text-slate-400">{e.ref}</td>
                    <td className="whitespace-nowrap text-[11px]">{fmtDate(e.date)}</td>
                    <td>
                      <StatusBadge kind="expense" status={e.category} />
                    </td>
                    <td className="text-xs">{e.description}</td>
                    <td className="text-[11px] text-slate-500">{e.vendor ?? '—'}</td>
                    <td className="mono text-right text-xs font-semibold">{inr(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Received</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-[10px] text-slate-400">{p.ref}</td>
                    <td className="whitespace-nowrap text-[11px]">{fmtDate(p.receivedAt)}</td>
                    <td className="text-[11px]">{p.customerName ?? p.customerId}</td>
                    <td className="text-[11px] capitalize">{p.kind}</td>
                    <td className="text-[11px] uppercase">{p.method}</td>
                    <td className="mono text-right text-xs font-semibold text-emerald-700">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.invoices.length === 0 && tab === 'invoices' && <Empty title="No invoices yet" hint="Confirm an order and its invoice is created automatically." />}
      </Card>

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Record an expense"
        subtitle="Stock purchases, salaries, transport, office and marketing."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="accent" disabled={busy === 'expense' || !expense.amount || !expense.description} onClick={() => void addExpense()}>
              Save expense
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <Select value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value as ExpenseCategory })}>
              <option value="stock">Stock purchase</option>
              <option value="salaries">Salaries / payout</option>
              <option value="transport">Transport</option>
              <option value="office">Office</option>
              <option value="marketing">Marketing</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} placeholder="What was it for?" />
          </Field>
          <Field label="Amount (₹)">
            <Input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} />
          </Field>
          <Field label="Vendor">
            <Input value={expense.vendor} onChange={(e) => setExpense({ ...expense, vendor: e.target.value })} />
          </Field>
        </div>
        {expense.category === 'stock' && (
          <p className="mt-3 text-[11px] text-slate-500">
            Prefer <Link to="/inventory" className="font-semibold text-amber-700">Receive stock</Link> — it updates quantities, serials and the expense together.
          </p>
        )}
      </Modal>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="card-pad">
          <h2 className="section-title mb-2">Subsidy pipeline</h2>
          <ul className="space-y-1.5 text-xs">
            {(['documents_pending', 'submitted', 'under_review', 'approved', 'received'] as const).map((status) => {
              const items = data.subsidies.filter((x) => x.status === status);
              return (
                <li key={status} className="flex items-center justify-between gap-2">
                  <StatusBadge kind="subsidy" status={status} />
                  <span className="text-slate-500">
                    {items.length} files · {inrCompact(items.reduce((sum, x) => sum + x.amount, 0))}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="card-pad">
          <h2 className="section-title mb-2">Collections</h2>
          <p className="text-xs text-slate-500">
            {inr(s.outstanding)} outstanding across installation and service invoices. Use <strong>Collect</strong> on an invoice to record the
            payment — the order closes automatically when the balance clears.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="green">Collected {inrCompact(s.collected)}</Badge>
            <Badge tone="amber">Due {inrCompact(s.outstanding)}</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}
