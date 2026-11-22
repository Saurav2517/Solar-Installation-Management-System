import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, reloadDb, resetDb, saveDb } from './db';
import * as L from './logic';
import { ApiError } from './logic';
import { buildBom, quoteTotals, subsidyFor } from '../shared/bom';
import { accountForToken, createSession, destroySession, publicAccount, verifyPassword } from './auth';
import type {
  Account,
  AccountRole,
  EnquirySource,
  PaymentMethod,
  SystemType,
  TicketPriority,
} from '../shared/types';

const app = express();
app.use(express.json({ limit: '30mb' }));

/* -------------------------- authentication ------------------------- */

/** Open endpoints: health, login and the public price list used by the shop and enquiry form. */
const PUBLIC_API = new Set(['/health', '/auth/login', '/packages', '/catalog']);

type AuthedRequest = express.Request & { account?: Account };

app.use('/api', (req, res, next) => {
  if (PUBLIC_API.has(req.path)) return next();

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const account = token ? accountForToken(getDb(), token) : null;
  if (!account) {
    res.status(401).json({ error: 'Please sign in to continue' });
    return;
  }
  if (account.role === 'customer' && !req.path.startsWith('/portal/') && !req.path.startsWith('/auth/')) {
    res.status(403).json({ error: 'This area is for SunPower staff logins' });
    return;
  }
  (req as AuthedRequest).account = account;
  next();
});

const currentAccount = (req: express.Request) => {
  const account = (req as AuthedRequest).account;
  if (!account) throw new ApiError(401, 'Please sign in to continue');
  return account;
};

const currentCustomerId = (req: express.Request) => {
  const account = currentAccount(req);
  if (account.role !== 'customer' || !account.customerId) {
    throw new ApiError(403, 'This area is for customer logins only');
  }
  return account.customerId;
};

const bearerToken = (req: express.Request) => (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

const wrap =
  (fn: (req: express.Request, res: express.Response) => unknown) =>
  (req: express.Request, res: express.Response) => {
    try {
      const result = fn(req, res);
      saveDb();
      if (!res.headersSent) res.json(result ?? { ok: true });
    } catch (err) {
      reloadDb();
      const status = err instanceof ApiError ? err.status : 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: (err as Error).message || 'Something went wrong' });
    }
  };

const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/* ---------------------------- meta --------------------------------- */

app.get('/api/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

/* ------------------------------ auth ------------------------------- */

app.post(
  '/api/auth/login',
  wrap((req) => {
    const db = getDb();
    const { email, password, role } = req.body as { email?: string; password?: string; role?: AccountRole };
    const account = db.accounts.find((a) => a.email.toLowerCase() === String(email ?? '').trim().toLowerCase());
    if (!account || !verifyPassword(String(password ?? ''), account.passwordHash)) {
      throw new ApiError(401, 'Email or password is incorrect');
    }
    if (role && account.role !== role) {
      throw new ApiError(
        403,
        account.role === 'admin'
          ? 'That is a staff login — use the Admin tab'
          : 'That is a customer login — use the Customer tab',
      );
    }
    const session = createSession(db, account);
    return { token: session.token, account: publicAccount(account) };
  }),
);

app.get('/api/auth/me', wrap((req) => ({ account: publicAccount(currentAccount(req)) })));

app.post(
  '/api/auth/logout',
  wrap((req) => {
    destroySession(getDb(), bearerToken(req));
    return { ok: true };
  }),
);

app.get(
  '/api/meta',
  wrap(() => {
    const db = getDb();
    return {
      staff: db.staff,
      technicians: db.technicians,
      products: db.products,
      customers: db.customers,
      settings: db.settings,
    };
  }),
);

app.get('/api/dashboard', wrap(() => L.dashboard(getDb())));

app.get(
  '/api/reports',
  wrap((req) =>
    L.reports(getDb(), { from: req.query.from as string | undefined, to: req.query.to as string | undefined }),
  ),
);

function packageCatalog() {
  const types: SystemType[] = ['on-grid', 'off-grid', 'hardware'];
  return types.flatMap((type) =>
    [1, 2, 3, 4, 5].map((kw) => {
      const items = buildBom(kw, type);
      const totals = quoteTotals(items, 0, 0.138);
      return {
        sku: `PKG-${kw}-${type}`,
        kw,
        type,
        title: `${kw} kW ${type === 'hardware' ? 'panel set' : type.replace('-', ' ')}`,
        subtotal: totals.subtotal,
        total: totals.total,
        subsidy: type === 'on-grid' ? subsidyFor(kw) : 0,
        panels: Math.ceil((kw * 1000) / 550),
        batteries: type === 'off-grid' ? Math.ceil(kw / 2.5) : 0,
      };
    }),
  );
}

app.get(
  '/api/packages',
  wrap(() => ({ packages: packageCatalog() })),
);

app.get(
  '/api/catalog',
  wrap(() => {
    const db = getDb();
    const categories = ['battery', 'controller', 'bos', 'wiring', 'structure', 'service'];
    const accessories = db.products
      .filter((p) => p.active && categories.includes(p.category))
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit,
        price: p.sellPrice,
        warrantyMonths: p.warrantyMonths,
      }));
    return {
      packages: packageCatalog(),
      accessories,
      categories: categories.filter((c) => accessories.some((a) => a.category === c)),
    };
  }),
);

/* -------------------------- enquiries ------------------------------ */

app.get(
  '/api/enquiries',
  wrap(() => {
    const db = getDb();
    const rows = db.enquiries.map((e) => {
      const survey = db.surveys.find((s) => s.enquiryId === e.id);
      const quote = db.quotes.find((q) => q.enquiryId === e.id);
      const order = quote ? db.orders.find((o) => o.quoteId === quote.id) : undefined;
      return {
        ...e,
        ageDays: ageDays(e.createdAt),
        surveyStatus: survey?.status,
        surveyId: survey?.id,
        quoteRef: quote?.ref,
        quoteTotal: quote?.total,
        quoteStatus: quote?.status,
        orderRef: order?.ref,
      };
    });
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { enquiries: rows, staff: db.staff, technicians: db.technicians };
  }),
);

app.post(
  '/api/enquiries',
  wrap((req) => {
    const db = getDb();
    const body = req.body as {
      name: string;
      phone: string;
      email?: string;
      address: string;
      city?: string;
      pincode?: string;
      capacityKw: number;
      systemType: SystemType;
      wantsSubsidy?: boolean;
      monthlyBill?: number;
      roofAreaSqft?: number;
      notes?: string;
      source?: EnquirySource;
    };
    const enquiry = L.createEnquiry(db, body);
    return { enquiry };
  }),
);

app.get(
  '/api/enquiries/:id',
  wrap((req) => {
    const db = getDb();
    const enquiry = db.enquiries.find((e) => e.id === req.params.id || e.ref === req.params.id);
    if (!enquiry) throw new ApiError(404, 'Enquiry not found');
    return { ...L.enquiryView(db, enquiry), technicians: db.technicians, staff: db.staff };
  }),
);

app.patch(
  '/api/enquiries/:id',
  wrap((req) => {
    const db = getDb();
    const enquiry = L.updateEnquiry(db, req.params.id, req.body);
    return L.enquiryView(db, enquiry);
  }),
);

app.post(
  '/api/enquiries/:id/qualify',
  wrap((req) => {
    const db = getDb();
    const enquiry = L.qualifyEnquiry(db, req.params.id, req.body);
    return L.enquiryView(db, enquiry);
  }),
);

app.post(
  '/api/enquiries/:id/survey',
  wrap((req) => {
    const db = getDb();
    const survey = L.scheduleSurvey(db, req.params.id, req.body);
    return { survey };
  }),
);

app.post(
  '/api/enquiries/:id/lost',
  wrap((req) => {
    const db = getDb();
    return L.loseEnquiry(db, req.params.id, req.body.reason);
  }),
);

/* --------------------------- surveys ------------------------------- */

app.get(
  '/api/surveys',
  wrap(() => {
    const db = getDb();
    return {
      surveys: db.surveys.map((s) => ({
        ...s,
        customerName: db.enquiries.find((e) => e.id === s.enquiryId)?.customerName,
        phone: db.enquiries.find((e) => e.id === s.enquiryId)?.phone,
        technicianName: db.technicians.find((t) => t.id === s.technicianId)?.name,
        enquiryStatus: db.enquiries.find((e) => e.id === s.enquiryId)?.status,
      })),
      technicians: db.technicians,
    };
  }),
);

app.patch(
  '/api/surveys/:id',
  wrap((req) => L.updateSurvey(getDb(), req.params.id, req.body)),
);

app.post(
  '/api/surveys/:id/complete',
  wrap((req) => {
    const db = getDb();
    const survey = L.completeSurvey(db, req.params.id, req.body);
    return L.enquiryView(db, db.enquiries.find((e) => e.id === survey.enquiryId)!);
  }),
);

app.post(
  '/api/surveys/:id/approve',
  wrap((req) => {
    const db = getDb();
    const survey = L.approveSurvey(db, req.params.id, req.body);
    return L.enquiryView(db, db.enquiries.find((e) => e.id === survey.enquiryId)!);
  }),
);

app.post(
  '/api/surveys/:id/reject',
  wrap((req) => L.rejectSurvey(getDb(), req.params.id, req.body.reason)),
);

/* ---------------------------- quotes ------------------------------- */

app.get(
  '/api/quotes',
  wrap(() => {
    const db = getDb();
    return {
      quotes: [...db.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((q) => ({
        ...q,
        enquiryRef: db.enquiries.find((e) => e.id === q.enquiryId)?.ref,
        orderRef: db.orders.find((o) => o.quoteId === q.id)?.ref,
      })),
    };
  }),
);

app.get(
  '/api/quote-preview',
  wrap((req) => {
    const db = getDb();
    const kw = Number(req.query.kw ?? 3);
    const type = (req.query.type ?? 'on-grid') as SystemType;
    const items = buildBom(kw, type);
    const totals = quoteTotals(items, 0, 0.138);
    return { items, ...totals, subsidy: subsidyFor(kw), products: db.products };
  }),
);

app.get(
  '/api/quotes/:id',
  wrap((req) => {
    const db = getDb();
    const quote = db.quotes.find((q) => q.id === req.params.id || q.ref === req.params.id);
    if (!quote) throw new ApiError(404, 'Quote not found');
    return {
      quote,
      enquiry: db.enquiries.find((e) => e.id === quote.enquiryId),
      survey: db.surveys.find((s) => s.id === quote.surveyId),
      order: db.orders.find((o) => o.quoteId === quote.id),
      products: db.products,
      technicians: db.technicians,
    };
  }),
);

app.post(
  '/api/quotes',
  wrap((req) => L.createQuote(getDb(), req.body)),
);

app.patch(
  '/api/quotes/:id',
  wrap((req) => L.updateQuote(getDb(), req.params.id, req.body)),
);

app.post(
  '/api/quotes/:id/send',
  wrap((req) => L.sendQuote(getDb(), req.params.id)),
);

app.post(
  '/api/quotes/:id/accept',
  wrap((req) => L.acceptQuote(getDb(), req.params.id)),
);

app.post(
  '/api/quotes/:id/reject',
  wrap((req) => L.rejectQuote(getDb(), req.params.id, req.body.reason)),
);

/* ---------------------------- orders ------------------------------- */

app.get(
  '/api/orders',
  wrap(() => {
    const db = getDb();
    return {
      orders: [...db.orders]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => {
        const steps = L.orderSteps(db, o);
        const serials = db.serials.filter((s) => s.orderId === o.id);
        return {
          ...o,
          balance: Math.max(0, o.total - o.paidAmount),
          profit: L.jobProfit(o),
          stepsDone: steps.filter((s) => s.done).length,
          stepsTotal: steps.length,
          serialsTotal: serials.length,
          serialsScanned: serials.filter((s) => s.scanned).length,
          installationStatus: db.installations.find((i) => i.orderId === o.id)?.status,
          invoiceStatus: db.invoices.find((i) => i.orderId === o.id)?.status,
        };
        }),
    };
  }),
);

app.get(
  '/api/orders/:id',
  wrap((req) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id || o.ref === req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    return { ...L.orderView(db, order), technicians: db.technicians };
  }),
);

app.post(
  '/api/orders',
  wrap((req) => {
    const result = L.createOrder(getDb(), req.body);
    return { order: result.order };
  }),
);

app.post(
  '/api/orders/:id/confirm',
  wrap((req) => {
    const db = getDb();
    const { order } = L.confirmOrder(db, req.params.id, req.body as {
      advance: number;
      method?: PaymentMethod;
      scheduledDate?: string;
      crewIds?: string[];
      notes?: string;
    });
    return { order };
  }),
);

/* ------------------------- customer portal ------------------------- */

app.get(
  '/api/portal/orders',
  wrap((req) => {
    const db = getDb();
    const customerId = currentCustomerId(req);
    return {
      orders: L.customerOrders(db, customerId),
      customer: db.customers.find((c) => c.id === customerId),
    };
  }),
);

app.get(
  '/api/portal/orders/:id',
  wrap((req) => {
    const db = getDb();
    const customerId = currentCustomerId(req);
    const order = db.orders.find(
      (o) => (o.id === req.params.id || o.ref === req.params.id) && o.customerId === customerId,
    );
    if (!order) throw new ApiError(404, 'Order not found');
    return L.customerOrderView(db, order);
  }),
);

app.post(
  '/api/portal/orders',
  wrap((req) => {
    const db = getDb();
    const customerId = currentCustomerId(req);
    const order = L.createCustomerOrder(db, customerId, req.body);
    return L.customerOrderView(db, order);
  }),
);

app.post(
  '/api/orders/:id/payments',
  wrap((req) => {
    const db = getDb();
    const { order } = L.addOrderPayment(db, req.params.id, req.body as { amount: number; method?: PaymentMethod });
    return L.orderView(db, order);
  }),
);

app.post(
  '/api/orders/:id/scan',
  wrap((req) => {
    const db = getDb();
    const unit = L.scanSerial(db, req.params.id, req.body.serialNo);
    const order = db.orders.find((o) => o.id === req.params.id || o.ref === req.params.id)!;
    const units = db.serials.filter((s) => s.orderId === order.id);
    return {
      unit,
      scanned: units.filter((u) => u.scanned).length,
      total: units.length,
    };
  }),
);

app.post(
  '/api/orders/:id/dispatch',
  wrap((req) => {
    const db = getDb();
    const order = L.dispatchOrder(db, req.params.id);
    return L.orderView(db, order);
  }),
);

app.get(
  '/api/dispatch',
  wrap(() => {
    const db = getDb();
    const orders = db.orders
      .filter((o) => o.status === 'confirmed')
      .map((o) => {
        const units = db.serials.filter((s) => s.orderId === o.id);
        return {
          order: o,
          customer: db.customers.find((c) => c.id === o.customerId),
          serials: units.map((u) => ({
            ...u,
            productName: db.products.find((p) => p.id === u.productId)?.name,
          })),
          scanned: units.filter((u) => u.scanned).length,
          total: units.length,
        };
      });
    return { queue: orders };
  }),
);

/* ------------------------ installations ---------------------------- */

app.get(
  '/api/installations',
  wrap(() => {
    const db = getDb();
    return {
      installations: [...db.installations].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)).map((i) => ({
        ...i,
        crewNames: i.crewIds.map((id) => db.technicians.find((t) => t.id === id)?.name ?? id),
        orderRef: db.orders.find((o) => o.id === i.orderId)?.ref,
        orderStatus: db.orders.find((o) => o.id === i.orderId)?.status,
      })),
    };
  }),
);

app.get(
  '/api/installations/:id',
  wrap((req) => {
    const db = getDb();
    const installation = db.installations.find((i) => i.id === req.params.id || i.ref === req.params.id);
    if (!installation) throw new ApiError(404, 'Installation not found');
    const order = db.orders.find((o) => o.id === installation.orderId);
    return {
      installation,
      order,
      customer: db.customers.find((c) => c.id === installation.customerId),
      serials: db.serials.filter((s) => s.orderId === installation.orderId),
      technicians: db.technicians,
      crewNames: installation.crewIds.map((id) => db.technicians.find((t) => t.id === id)?.name ?? id),
    };
  }),
);

app.patch(
  '/api/installations/:id',
  wrap((req) => {
    const db = getDb();
    const installation = L.updateInstallation(db, req.params.id, req.body);
    return { installation };
  }),
);

app.post(
  '/api/installations/:id/complete',
  wrap((req) => {
    const db = getDb();
    const { installation } = L.completeInstallation(db, req.params.id, req.body);
    return { installation, order: db.orders.find((o) => o.id === installation.orderId) };
  }),
);

/* --------------------------- inventory ----------------------------- */

app.get(
  '/api/inventory',
  wrap(() => {
    const db = getDb();
    return {
      products: L.stockStatus(db),
      serials: db.serials
        .filter((s) => s.status !== 'in_stock')
        .sort((a, b) => (a.dispatchedAt ?? '') < (b.dispatchedAt ?? '') ? 1 : -1)
        .slice(0, 60)
        .map((s) => ({
          ...s,
          productName: db.products.find((p) => p.id === s.productId)?.name,
          customerName: db.customers.find((c) => c.id === s.customerId)?.name,
          orderRef: db.orders.find((o) => o.id === s.orderId)?.ref,
          inWarranty: !!s.warrantyEnd && new Date(s.warrantyEnd).getTime() > Date.now(),
        })),
      stats: {
        inStock: db.serials.filter((s) => s.status === 'in_stock').length,
        dispatched: db.serials.filter((s) => s.status === 'dispatched').length,
        installed: db.serials.filter((s) => s.status === 'installed').length,
        value: db.products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0),
      },
    };
  }),
);

app.post(
  '/api/inventory/stock',
  wrap((req) => L.receiveStock(getDb(), req.body)),
);

app.get(
  '/api/serials',
  wrap((req) => L.serialSearch(getDb(), String(req.query.q ?? ''))),
);

app.get(
  '/api/warranty',
  wrap((req) => L.warrantyForSerial(getDb(), String(req.query.serial ?? ''))),
);

/* ---------------------------- tickets ------------------------------ */

app.get(
  '/api/tickets',
  wrap(() => {
    const db = getDb();
    return {
      tickets: [...db.tickets].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)).map((t) => {
        const view = L.ticketView(db, t);
        return { ...t, technicianName: view.technicianName, overdue: view.overdue, invoiceNumber: view.invoice?.number };
      }),
      technicians: db.technicians,
      customers: db.customers,
    };
  }),
);

app.get(
  '/api/tickets/:id',
  wrap((req) => {
    const db = getDb();
    const ticket = db.tickets.find((t) => t.id === req.params.id || t.ref === req.params.id);
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    return { ...L.ticketView(db, ticket), technicians: db.technicians, products: db.products };
  }),
);

app.post(
  '/api/tickets',
  wrap((req) => {
    const db = getDb();
    const ticket = L.createTicket(db, req.body as {
      customerId?: string;
      orderId?: string;
      serialNo?: string;
      faultCode?: string;
      description: string;
      priority?: TicketPriority;
      assignedTo?: string;
    });
    return L.ticketView(db, ticket);
  }),
);

app.patch(
  '/api/tickets/:id',
  wrap((req) => {
    const db = getDb();
    const ticket = L.updateTicket(db, req.params.id, req.body);
    return L.ticketView(db, ticket);
  }),
);

app.post(
  '/api/tickets/:id/resolve',
  wrap((req) => {
    const db = getDb();
    const ticket = L.resolveTicket(db, req.params.id, req.body);
    return L.ticketView(db, ticket);
  }),
);

app.post(
  '/api/tickets/:id/confirm',
  wrap((req) => {
    const db = getDb();
    const ticket = L.confirmTicket(db, req.params.id, req.body.note);
    return L.ticketView(db, ticket);
  }),
);

/* ---------------------------- billing ------------------------------ */

app.get(
  '/api/billing',
  wrap(() => {
    const db = getDb();
    return {
      invoices: [...db.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((i) => ({
        ...i,
        due: Math.max(0, i.total - i.paidAmount),
      })),
      subsidies: db.subsidies.map((s) => ({
        ...s,
        docsReceived: s.docs.filter((d) => d.received).length,
        docsTotal: s.docs.length,
        orderRef: db.orders.find((o) => o.id === s.orderId)?.ref,
      })),
      expenses: db.expenses,
      payments: db.payments.slice(0, 40).map((p) => ({
        ...p,
        customerName: db.customers.find((c) => c.id === p.customerId)?.name ?? p.customerId,
      })),
      summary: {
        invoiced: db.invoices.reduce((s, i) => s + i.total, 0),
        collected: db.invoices.reduce((s, i) => s + i.paidAmount, 0),
        outstanding: db.invoices.reduce((s, i) => s + Math.max(0, i.total - i.paidAmount), 0),
        subsidyPending: db.subsidies
          .filter((s) => !['received', 'rejected'].includes(s.status))
          .reduce((s, x) => s + x.amount, 0),
        subsidyReceived: db.subsidies.filter((s) => s.status === 'received').reduce((s, x) => s + x.amount, 0),
        expenses: db.expenses.reduce((s, e) => s + e.amount, 0),
      },
    };
  }),
);

app.post(
  '/api/invoices/:id/issue',
  wrap((req) => L.issueInvoice(getDb(), req.params.id)),
);

app.post(
  '/api/invoices/:id/pay',
  wrap((req) => L.payInvoice(getDb(), req.params.id, req.body)),
);

app.patch(
  '/api/subsidies/:id',
  wrap((req) => L.updateSubsidy(getDb(), req.params.id, req.body)),
);

app.post(
  '/api/expenses',
  wrap((req) => L.addExpense(getDb(), req.body)),
);

/* -------------------------- technicians ---------------------------- */

app.get(
  '/api/technicians',
  wrap(() => {
    const db = getDb();
    return {
      technicians: L.timesheetSummary(db),
      timesheets: db.timesheets.slice(0, 120).map((t) => ({
        ...t,
        technicianName: db.technicians.find((x) => x.id === t.technicianId)?.name,
      })),
    };
  }),
);

app.post(
  '/api/technicians',
  wrap((req) => {
    const db = getDb();
    const { name, role, hourlyRate, phone } = req.body as {
      name: string;
      role: 'lead' | 'technician' | 'helper';
      hourlyRate: number;
      phone?: string;
    };
    if (!name?.trim()) throw new ApiError(400, 'Technician name is required');
    const tech = {
      id: `T${db.technicians.length + 1}`,
      name: name.trim(),
      phone: phone ?? '',
      role: role ?? 'technician',
      hourlyRate: Number(hourlyRate) || 350,
      active: true,
      skills: [],
    };
    db.technicians.push(tech);
    return tech;
  }),
);

app.post(
  '/api/technicians/:id/pay',
  wrap((req) => L.payTechnician(getDb(), req.params.id, req.body)),
);

/* ----------------------------- misc -------------------------------- */

app.post(
  '/api/reset',
  wrap(() => {
    const db = resetDb();
    return { ok: true, counts: { orders: db.orders.length, tickets: db.tickets.length } };
  }),
);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

const dist = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`SunPower API listening on http://localhost:${PORT}`);
});
