import {
  CATALOG,
  addMonths,
  buildBom,
  estimatedLabourCost,
  productBySku,
  quoteTotals,
  subsidyFor,
} from '../shared/bom';
import type {
  BomLine,
  CapacityKw,
  DB,
  Enquiry,
  EnquirySource,
  EnquiryStatus,
  Expense,
  ExpenseCategory,
  Installation,
  Invoice,
  Order,
  Payment,
  PaymentMethod,
  Quote,
  SerialUnit,
  Subsidy,
  SubsidyStatus,
  Survey,
  SystemType,
  Technician,
  Ticket,
  TicketPart,
  TicketPriority,
  Timesheet,
} from '../shared/types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DAY = 86_400_000;
const nowIso = () => new Date().toISOString();

const require_ = <T>(value: T | undefined | null | '', message: string): T => {
  if (value === undefined || value === null || value === '') throw new ApiError(400, message);
  return value as T;
};

export function nextRef(db: DB, key: string, prefix: string) {
  db.counters[key] = (db.counters[key] ?? 0) + 1;
  return `${prefix}-${String(db.counters[key]).padStart(4, '0')}`;
}

export function jobProfit(order: Order) {
  return order.total - order.costTotal - order.labourCost - order.otherCost;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const after = (iso: string | undefined, from: Date) => !!iso && new Date(iso).getTime() >= from.getTime();

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function findOrder(db: DB, id: string) {
  const order = db.orders.find((o) => o.id === id || o.ref === id);
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
}

function findEnquiry(db: DB, id: string) {
  const enquiry = db.enquiries.find((e) => e.id === id || e.ref === id);
  if (!enquiry) throw new ApiError(404, 'Enquiry not found');
  return enquiry;
}

function findQuote(db: DB, id: string) {
  const quote = db.quotes.find((q) => q.id === id || q.ref === id);
  if (!quote) throw new ApiError(404, 'Quote not found');
  return quote;
}

function findTicket(db: DB, id: string) {
  const ticket = db.tickets.find((t) => t.id === id || t.ref === id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  return ticket;
}

function technicianName(db: DB, id?: string) {
  if (!id) return undefined;
  return db.technicians.find((t) => t.id === id)?.name ?? db.staff.find((s) => s.id === id)?.name ?? id;
}

/* ------------------------------------------------------------------ */
/* Enquiries                                                          */
/* ------------------------------------------------------------------ */

export interface EnquiryInput {
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
}

export function createEnquiry(db: DB, input: EnquiryInput): Enquiry {
  const name = require_(input.name?.trim(), 'Customer name is required');
  const phone = require_(input.phone?.trim(), 'Phone number is required');
  const address = require_(input.address?.trim(), 'Site address is required');
  const capacityKw = Number(input.capacityKw);
  if (![1, 2, 3, 4, 5].includes(capacityKw)) throw new ApiError(400, 'System size must be between 1 and 5 kW');

  if (input.pincode && !/^\d{6}$/.test(input.pincode.trim())) throw new ApiError(400, 'Pincode must be a 6-digit number');
  if (input.monthlyBill !== undefined && input.monthlyBill !== null) {
    const mb = Number(input.monthlyBill);
    if (!Number.isFinite(mb) || mb < 0) throw new ApiError(400, 'Monthly electricity bill cannot be negative');
  }
  if (input.roofAreaSqft !== undefined && input.roofAreaSqft !== null) {
    const ra = Number(input.roofAreaSqft);
    if (!Number.isFinite(ra) || ra < 0) throw new ApiError(400, 'Roof area cannot be negative');
  }

  const existing = db.customers.find((c) => c.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''));
  let customerId: string;
  if (existing) {
    customerId = existing.id;
    existing.address = address;
    existing.city = input.city?.trim() || existing.city;
    existing.pincode = input.pincode?.trim() || existing.pincode;
  } else {
    customerId = nextRef(db, 'customer', 'CUS');
    db.customers.push({
      id: customerId,
      name,
      phone,
      email: input.email?.trim() ?? '',
      address,
      city: input.city?.trim() ?? 'Bengaluru',
      pincode: input.pincode?.trim() ?? '',
      createdAt: nowIso(),
    });
  }

  const enquiry: Enquiry = {
    id: nextRef(db, 'enquiry', 'ENQ'),
    ref: '',
    customerId,
    customerName: name,
    phone,
    email: input.email?.trim() ?? '',
    address,
    city: input.city?.trim() ?? 'Bengaluru',
    pincode: input.pincode?.trim() ?? '',
    requestedKw: capacityKw as CapacityKw,
    requestedType: input.systemType,
    wantsSubsidy: !!input.wantsSubsidy,
    monthlyBill: input.monthlyBill ? Number(input.monthlyBill) : undefined,
    roofAreaSqft: input.roofAreaSqft ? Number(input.roofAreaSqft) : undefined,
    gridConnectionOk: undefined,
    source: input.source ?? 'web',
    notes: input.notes?.trim(),
    status: 'new',
    createdAt: nowIso(),
    nextActionAt: new Date(Date.now() + DAY).toISOString(),
  };
  enquiry.ref = enquiry.id;
  db.enquiries.unshift(enquiry);
  return enquiry;
}

export function updateEnquiry(db: DB, id: string, patch: Partial<Enquiry> & { notes?: string }) {
  const enquiry = findEnquiry(db, id);
  if (patch.pincode !== undefined && patch.pincode !== null && String(patch.pincode).trim() !== '' && !/^\d{6}$/.test(String(patch.pincode).trim())) throw new ApiError(400, 'Pincode must be a 6-digit number');
  if (patch.monthlyBill !== undefined && patch.monthlyBill !== null) {
    const mb = Number(patch.monthlyBill);
    if (!Number.isFinite(mb) || mb < 0) throw new ApiError(400, 'Monthly electricity bill cannot be negative');
  }
  if (patch.roofAreaSqft !== undefined && patch.roofAreaSqft !== null) {
    const ra = Number(patch.roofAreaSqft);
    if (!Number.isFinite(ra) || ra < 0) throw new ApiError(400, 'Roof area cannot be negative');
  }
  const allowed: (keyof Enquiry)[] = [
    'customerName',
    'phone',
    'email',
    'address',
    'city',
    'pincode',
    'requestedKw',
    'requestedType',
    'wantsSubsidy',
    'monthlyBill',
    'roofAreaSqft',
    'gridConnectionOk',
    'assignedTo',
    'notes',
    'status',
  ];
  for (const key of allowed) {
    if (key in patch && patch[key] !== undefined) {
      (enquiry as unknown as Record<string, unknown>)[key] = patch[key];
    }
  }
  return enquiry;
}

export function qualifyEnquiry(
  db: DB,
  id: string,
  input: { monthlyBill: number; roofAreaSqft: number; gridConnectionOk: boolean; assignedTo?: string; notes?: string },
) {
  const enquiry = findEnquiry(db, id);
  if (enquiry.status === 'lost' || enquiry.status === 'won') throw new ApiError(400, 'This enquiry is already closed');
  const mb = Number(input.monthlyBill);
  const ra = Number(input.roofAreaSqft);
  if (!Number.isFinite(mb) || mb < 0) throw new ApiError(400, 'Monthly electricity bill cannot be negative');
  if (!Number.isFinite(ra) || ra < 0) throw new ApiError(400, 'Roof area cannot be negative');
  enquiry.monthlyBill = mb;
  enquiry.roofAreaSqft = ra;
  enquiry.gridConnectionOk = !!input.gridConnectionOk;
  enquiry.assignedTo = input.assignedTo ?? enquiry.assignedTo;
  if (input.notes) enquiry.notes = input.notes;
  if (!enquiry.gridConnectionOk) {
    throw new ApiError(400, 'Grid connection is not suitable — record the reason and mark the enquiry lost instead');
  }
  if (enquiry.roofAreaSqft <= 0) throw new ApiError(400, 'Shadow-free roof area must be greater than zero');
  enquiry.status = 'qualified';
  enquiry.qualifiedAt = nowIso();
  return enquiry;
}

export function scheduleSurvey(
  db: DB,
  enquiryId: string,
  input: { scheduledAt: string; technicianId: string; notes?: string },
) {
  const enquiry = findEnquiry(db, enquiryId);
  if (!['qualified', 'survey_scheduled', 'surveyed'].includes(enquiry.status)) {
    throw new ApiError(400, 'Qualify the enquiry before booking a site survey');
  }
  require_(input.scheduledAt, 'Survey date is required');
  require_(input.technicianId, 'Assign a technician for the survey');
  const survey: Survey = {
    id: nextRef(db, 'survey', 'SUR'),
    ref: '',
    enquiryId: enquiry.id,
    customerId: enquiry.customerId,
    scheduledAt: new Date(input.scheduledAt).toISOString(),
    technicianId: input.technicianId,
    status: 'scheduled',
    findings: input.notes,
  };
  survey.ref = survey.id;
  db.surveys.unshift(survey);
  enquiry.status = 'survey_scheduled';
  return survey;
}

export function updateSurvey(
  db: DB,
  id: string,
  input: Partial<Pick<Survey, 'scheduledAt' | 'technicianId' | 'roofDirection' | 'tiltDegrees' | 'cableDistanceM' | 'shadowFreeAreaSqft' | 'structureType' | 'findings' | 'recommendedKw' | 'recommendedType'>>,
) {
  const survey = db.surveys.find((s) => s.id === id || s.ref === id);
  if (!survey) throw new ApiError(404, 'Survey not found');
  Object.assign(survey, input);
  return survey;
}

export function completeSurvey(
  db: DB,
  id: string,
  input: {
    roofDirection: string;
    tiltDegrees: number;
    cableDistanceM: number;
    shadowFreeAreaSqft: number;
    structureType: string;
    findings?: string;
    recommendedKw: number;
    recommendedType: SystemType;
  },
) {
  const survey = db.surveys.find((s) => s.id === id || s.ref === id);
  if (!survey) throw new ApiError(404, 'Survey not found');
  if (survey.status === 'approved') throw new ApiError(400, 'Survey is already approved');
  require_(input.roofDirection, 'Roof direction is required');
  const area = Number(input.shadowFreeAreaSqft);
  if (!area || area <= 0) throw new ApiError(400, 'Shadow-free roof area is required');
  const tilt = Number(input.tiltDegrees);
  const cable = Number(input.cableDistanceM);
  if (!Number.isFinite(tilt) || tilt < 0) throw new ApiError(400, 'Tilt angle cannot be negative');
  if (!Number.isFinite(cable) || cable < 0) throw new ApiError(400, 'Cable distance cannot be negative');
  survey.roofDirection = input.roofDirection;
  survey.tiltDegrees = tilt;
  survey.cableDistanceM = cable;
  survey.shadowFreeAreaSqft = area;
  survey.structureType = input.structureType;
  survey.findings = input.findings;
  survey.recommendedKw = Number(input.recommendedKw) as CapacityKw;
  survey.recommendedType = input.recommendedType;
  survey.completedAt = nowIso();
  survey.status = 'completed';
  const enquiry = findEnquiry(db, survey.enquiryId);
  enquiry.status = 'surveyed';
  return survey;
}

export function approveSurvey(db: DB, id: string, input: { approvedBy: string; notes?: string }) {
  const survey = db.surveys.find((s) => s.id === id || s.ref === id);
  if (!survey) throw new ApiError(404, 'Survey not found');
  if (survey.status !== 'completed') throw new ApiError(400, 'Complete the survey before approving it');
  survey.status = 'approved';
  survey.approvedBy = require_(input.approvedBy, 'Approver name is required');
  survey.approvedAt = nowIso();
  if (input.notes) survey.findings = `${survey.findings ?? ''}\n${input.notes}`.trim();
  const enquiry = findEnquiry(db, survey.enquiryId);
  enquiry.status = 'survey_approved';
  return survey;
}

export function rejectSurvey(db: DB, id: string, reason: string) {
  const survey = db.surveys.find((s) => s.id === id || s.ref === id);
  if (!survey) throw new ApiError(404, 'Survey not found');
  survey.status = 'rejected';
  survey.rejectionReason = require_(reason, 'Give a reason for rejecting the survey');
  const enquiry = findEnquiry(db, survey.enquiryId);
  enquiry.status = 'lost';
  enquiry.lostReason = `Survey rejected: ${reason}`;
  return survey;
}

export function loseEnquiry(db: DB, id: string, reason: string) {
  const enquiry = findEnquiry(db, id);
  enquiry.status = 'lost';
  enquiry.lostReason = require_(reason, 'Give a reason for losing this enquiry');
  return enquiry;
}

/* ------------------------------------------------------------------ */
/* Quotes                                                             */
/* ------------------------------------------------------------------ */

export function quoteForEnquiry(db: DB, enquiryId: string): Quote | undefined {
  return db.quotes.find((q) => q.enquiryId === enquiryId);
}

export function createQuote(
  db: DB,
  input: { enquiryId: string; capacityKw?: number; systemType?: SystemType; discount?: number; notes?: string },
) {
  const enquiry = findEnquiry(db, input.enquiryId);
  if (enquiry.status === 'lost') throw new ApiError(400, 'This enquiry was lost — reopen it before quoting');
  if (enquiry.status === 'won') throw new ApiError(400, 'This enquiry is already an order');
  const survey = db.surveys.find((s) => s.enquiryId === enquiry.id);
  if (!survey || survey.status !== 'approved') {
    throw new ApiError(400, 'The site survey must be approved before a quote can be prepared');
  }
  if (quoteForEnquiry(db, enquiry.id)) throw new ApiError(400, 'A quote already exists for this enquiry');

  const kw = Number(input.capacityKw ?? survey.recommendedKw ?? enquiry.requestedKw) as CapacityKw;
  if (![1, 2, 3, 4, 5].includes(kw)) throw new ApiError(400, 'Invalid system size');
  const type = (input.systemType ?? survey.recommendedType ?? enquiry.requestedType) as SystemType;
  const items = buildBom(kw, type);
  const discount = Math.max(0, Number(input.discount ?? 0));
  const totals = quoteTotals(items, discount, 0.138);
  const labour = estimatedLabourCost(kw);
  const margin = totals.subtotal - discount - totals.costTotal - labour;

  const quote: Quote = {
    id: nextRef(db, 'quote', 'QTN'),
    ref: '',
    enquiryId: enquiry.id,
    surveyId: survey.id,
    customerId: enquiry.customerId,
    customerName: enquiry.customerName,
    capacityKw: kw,
    systemType: type,
    items,
    subtotal: totals.subtotal,
    discount,
    taxRate: 0.138,
    taxAmount: totals.taxAmount,
    total: totals.total,
    costTotal: totals.costTotal,
    estLabourCost: labour,
    margin,
    marginPct: totals.subtotal ? Math.round((margin / (totals.subtotal - discount || 1)) * 100) : 0,
    subsidyExpected: enquiry.wantsSubsidy ? subsidyFor(kw) : 0,
    status: 'draft',
    validUntil: new Date(Date.now() + 15 * DAY).toISOString(),
    createdAt: nowIso(),
    notes: input.notes,
  };
  quote.ref = quote.id;
  db.quotes.unshift(quote);
  enquiry.status = 'quoted';
  return quote;
}

export function updateQuote(
  db: DB,
  id: string,
  input: { items?: Array<{ sku: string; qty: number; unitPrice?: number }>; discount?: number; notes?: string },
) {
  const quote = findQuote(db, id);
  if (quote.status === 'accepted') throw new ApiError(400, 'An accepted quote cannot be edited');
  if (input.items) {
    const lines: BomLine[] = input.items
      .filter((i) => Number(i.qty) > 0)
      .map((i) => {
        const product = productBySku(i.sku);
        if (!product) throw new ApiError(400, `Unknown product ${i.sku}`);
        const price = i.unitPrice != null ? Number(i.unitPrice) : product.sellPrice;
        const qty = Number(i.qty);
        return {
          sku: product.sku,
          name: product.name,
          category: product.category,
          unit: product.unit,
          qty,
          unitPrice: price,
          unitCost: product.costPrice,
          total: price * qty,
          totalCost: product.costPrice * qty,
          serialized: product.serialized,
          warrantyMonths: product.warrantyMonths,
        };
      });
    if (!lines.length) throw new ApiError(400, 'A quote needs at least one line item');
    quote.items = lines;
  }
  if (input.discount != null) quote.discount = Math.max(0, Number(input.discount));
  if (input.notes != null) quote.notes = input.notes;

  const totals = quoteTotals(quote.items, quote.discount, quote.taxRate);
  quote.subtotal = totals.subtotal;
  quote.taxAmount = totals.taxAmount;
  quote.total = totals.total;
  quote.costTotal = totals.costTotal;
  quote.estLabourCost = estimatedLabourCost(quote.capacityKw);
  quote.margin = totals.subtotal - quote.discount - totals.costTotal - quote.estLabourCost;
  quote.marginPct = quote.subtotal ? Math.round((quote.margin / (quote.subtotal - quote.discount || 1)) * 100) : 0;
  return quote;
}

export function sendQuote(db: DB, id: string) {
  const quote = findQuote(db, id);
  if (quote.status === 'accepted') throw new ApiError(400, 'Quote already accepted');
  quote.status = 'sent';
  return quote;
}

export function acceptQuote(db: DB, id: string) {
  const quote = findQuote(db, id);
  if (quote.status === 'rejected') throw new ApiError(400, 'A rejected quote cannot be accepted');
  quote.status = 'accepted';
  const enquiry = findEnquiry(db, quote.enquiryId);
  enquiry.status = 'won';
  return quote;
}

export function rejectQuote(db: DB, id: string, reason?: string) {
  const quote = findQuote(db, id);
  quote.status = 'rejected';
  const enquiry = findEnquiry(db, quote.enquiryId);
  enquiry.status = 'lost';
  enquiry.lostReason = reason || 'Quote declined by customer';
  return quote;
}

/* ------------------------------------------------------------------ */
/* Orders, dispatch and warranty                                      */
/* ------------------------------------------------------------------ */

const PACKAGE_SKU = /^PKG-([1-5])-(on-grid|off-grid|hardware)$/;

/** Merge a BOM line into the order lines, combining repeated SKUs. */
function mergeLine(lines: BomLine[], line: BomLine, multiplier: number) {
  const qty = line.qty * multiplier;
  const existing = lines.find((l) => l.sku === line.sku);
  if (existing) {
    existing.qty += qty;
    existing.total = existing.unitPrice * existing.qty;
    existing.totalCost = existing.unitCost * existing.qty;
    return;
  }
  lines.push({ ...line, qty, total: line.unitPrice * qty, totalCost: line.unitCost * qty });
}

function buildRequestedOrder(
  db: DB,
  input: {
    customerId: string;
    capacityKw: CapacityKw;
    systemType: SystemType;
    items: BomLine[];
    wantsSubsidy: boolean;
    channel: 'staff' | 'customer';
    quoteId?: string;
    requestedBy?: string;
    notes?: string;
    totals?: { subtotal: number; taxAmount: number; total: number; costTotal: number };
  },
): Order {
  const totals = input.totals ?? quoteTotals(input.items, 0, db.settings.taxRate || 0.138);
  const order: Order = {
    id: nextRef(db, 'order', 'ORD'),
    ref: '',
    quoteId: input.quoteId ?? '',
    customerId: input.customerId,
    customerName: db.customers.find((c) => c.id === input.customerId)?.name ?? 'Customer',
    capacityKw: input.capacityKw,
    systemType: input.systemType,
    items: input.items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    costTotal: totals.costTotal,
    labourCost: 0,
    otherCost: 1500,
    paidAmount: 0,
    paymentStatus: 'unpaid',
    status: 'requested',
    createdAt: nowIso(),
    crewIds: [],
    wantsSubsidy: input.wantsSubsidy,
    channel: input.channel,
    requestedBy: input.requestedBy,
    notes: input.notes,
  };
  order.ref = order.id;
  return order;
}

/** Reserve serial-tracked units so the warehouse knows exactly what to pack. */
function reserveSerials(db: DB, order: Order): SerialUnit[] {
  const allocated: SerialUnit[] = [];
  for (const line of order.items) {
    if (!line.serialized) continue;
    const pool = db.serials.filter((s) => s.productId === line.sku && s.status === 'in_stock' && !s.orderId);
    if (pool.length < line.qty) {
      throw new ApiError(400, `Only ${pool.length} units of ${line.name} in stock — receive stock before confirming`);
    }
    for (let i = 0; i < line.qty; i++) {
      const unit = pool[i];
      unit.status = 'reserved';
      unit.orderId = order.id;
      unit.customerId = order.customerId;
      unit.scanned = false;
      allocated.push(unit);
    }
  }
  return allocated;
}

function createOrderInvoice(db: DB, order: Order): Invoice {
  const invoice: Invoice = {
    id: nextRef(db, 'invoice', 'INV'),
    number: '',
    type: 'installation',
    orderId: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    description: `${order.capacityKw} kW ${order.systemType} solar installation — ${order.customerName}`,
    amount: order.subtotal,
    taxAmount: order.taxAmount,
    total: order.total,
    paidAmount: 0,
    status: 'draft',
    createdAt: nowIso(),
    dueAt: new Date(Date.now() + 15 * DAY).toISOString(),
  };
  invoice.number = invoice.id;
  db.invoices.unshift(invoice);
  return invoice;
}

function createOrderSubsidy(db: DB, order: Order): Subsidy {
  const subsidy: Subsidy = {
    id: nextRef(db, 'subsidy', 'SUB'),
    orderId: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    applicationNo: `PSG-2026-${String(1000 + db.subsidies.length * 37)}`,
    capacityKw: order.capacityKw,
    amount: subsidyFor(order.capacityKw),
    status: 'documents_pending',
    docs: [
      'Aadhaar & PAN copy',
      'Latest electricity bill',
      'Roof ownership proof',
      'Cancelled cheque / bank details',
      'Signed subsidy application',
      'Net-meter agreement',
    ].map((name) => ({ name, received: false })),
  };
  db.subsidies.unshift(subsidy);
  return subsidy;
}

function createOrderInstallation(db: DB, order: Order): Installation {
  const customer = db.customers.find((c) => c.id === order.customerId);
  const installation: Installation = {
    id: nextRef(db, 'installation', 'JOB'),
    ref: '',
    orderId: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    scheduledDate: order.scheduledDate ?? new Date(Date.now() + 2 * DAY).toISOString(),
    crewIds: order.crewIds,
    systemSizeKw: order.capacityKw,
    photos: [],
    status: 'scheduled',
    crewHours: order.crewIds.map((id) => ({ technicianId: id, hours: 8 })),
    address: `${customer?.address ?? ''}, ${customer?.city ?? ''}`,
  };
  installation.ref = installation.id;
  db.installations.unshift(installation);
  return installation;
}

/** Staff path: turn an accepted quote into a live order in one step. */
export function createOrder(
  db: DB,
  input: { quoteId: string; advance: number; method?: PaymentMethod; scheduledDate?: string; crewIds?: string[]; notes?: string },
) {
  const quote = findQuote(db, input.quoteId);
  if (quote.status !== 'accepted') throw new ApiError(400, 'Accept the quote before confirming the order');
  if (db.orders.some((o) => o.quoteId === quote.id)) throw new ApiError(400, 'This quote is already an order');

  const order = buildRequestedOrder(db, {
    customerId: quote.customerId,
    capacityKw: quote.capacityKw,
    systemType: quote.systemType,
    items: quote.items,
    wantsSubsidy: quote.subsidyExpected > 0,
    channel: 'staff',
    quoteId: quote.id,
    requestedBy: 'SunPower sales team',
    notes: input.notes,
    totals: {
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      costTotal: quote.costTotal,
    },
  });
  db.orders.unshift(order);
  return confirmOrder(db, order.id, input);
}

/** Confirm a request (from the shop or a quote) into a scheduled, invoiced job. */
export function confirmOrder(
  db: DB,
  id: string,
  input: { advance: number; method?: PaymentMethod; scheduledDate?: string; crewIds?: string[]; notes?: string },
) {
  const order = findOrder(db, id);
  if (order.status !== 'requested') throw new ApiError(400, `${order.ref} is already confirmed`);

  const advance = Number(input.advance);
  if (!advance || advance <= 0) throw new ApiError(400, 'Record an advance or full payment before work starts');
  if (advance > order.total + 1) throw new ApiError(400, 'Advance cannot exceed the order total');

  const crewIds =
    input.crewIds && input.crewIds.length
      ? input.crewIds
      : db.technicians.filter((t) => t.active).slice(0, 3).map((t) => t.id);
  if (!crewIds.length) throw new ApiError(400, 'Assign an installation crew');

  const allocated = reserveSerials(db, order);

  order.status = 'confirmed';
  order.confirmedAt = nowIso();
  order.scheduledDate = input.scheduledDate
    ? new Date(input.scheduledDate).toISOString()
    : new Date(Date.now() + 2 * DAY).toISOString();
  order.crewIds = crewIds;
  if (input.notes) order.notes = input.notes;

  const invoice = createOrderInvoice(db, order);
  order.invoiceId = invoice.id;
  if (order.wantsSubsidy) order.subsidyId = createOrderSubsidy(db, order).id;
  order.installationId = createOrderInstallation(db, order).id;

  addOrderPayment(db, order.id, { amount: advance, method: input.method ?? 'bank', kind: 'advance' });

  const quote = db.quotes.find((q) => q.id === order.quoteId);
  const enquiry = quote ? db.enquiries.find((e) => e.id === quote.enquiryId) : undefined;
  if (enquiry) enquiry.status = 'won';

  return { order, allocated };
}

/** Customer path: build a request from shop lines — nothing is reserved or invoiced yet. */
export function createCustomerOrder(
  db: DB,
  customerId: string,
  input: { items: Array<{ sku: string; qty: number }>; wantsSubsidy?: boolean; notes?: string },
) {
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) throw new ApiError(404, 'Your customer profile could not be found');

  const items: BomLine[] = [];
  let kw = 0;
  let hasOffGrid = false;
  let hasOnGrid = false;
  let subsidy = 0;

  for (const row of input.items ?? []) {
    const qty = Math.floor(Number(row.qty));
    if (!qty || qty <= 0) throw new ApiError(400, 'Every item needs a quantity of at least 1');

    const pkg = PACKAGE_SKU.exec(String(row.sku ?? ''));
    if (pkg) {
      const packageKw = Number(pkg[1]) as CapacityKw;
      const type = pkg[2] as SystemType;
      for (const line of buildBom(packageKw, type)) mergeLine(items, line, qty);
      kw += packageKw * qty;
      if (type === 'off-grid') hasOffGrid = true;
      if (type === 'on-grid') {
        hasOnGrid = true;
        subsidy += subsidyFor(packageKw) * qty;
      }
      continue;
    }

    const product = db.products.find((p) => p.sku === row.sku || p.id === row.sku);
    if (!product || !product.active) throw new ApiError(400, `${row.sku} is no longer available`);
    mergeLine(
      items,
      {
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        qty: 1,
        unitPrice: product.sellPrice,
        unitCost: product.costPrice,
        total: product.sellPrice,
        totalCost: product.costPrice,
        serialized: product.serialized,
        warrantyMonths: product.warrantyMonths,
      },
      qty,
    );
  }

  if (!items.length) throw new ApiError(400, 'Add at least one product before placing the order');

  const capacityKw = Math.min(5, Math.max(1, Math.round(kw || 3))) as CapacityKw;
  const systemType: SystemType = hasOffGrid ? 'off-grid' : hasOnGrid ? 'on-grid' : 'hardware';

  const order = buildRequestedOrder(db, {
    customerId,
    capacityKw,
    systemType,
    items,
    wantsSubsidy: subsidy > 0 && input.wantsSubsidy !== false,
    channel: 'customer',
    requestedBy: customer.email,
    notes: input.notes?.trim() || undefined,
  });
  db.orders.unshift(order);
  return order;
}

/* -------------------- customer-safe order payloads ------------------- */

export function publicOrder(order: Order) {
  return {
    id: order.id,
    ref: order.ref,
    status: order.status,
    capacityKw: order.capacityKw,
    systemType: order.systemType,
    items: order.items.map((l) => ({
      sku: l.sku,
      name: l.name,
      qty: l.qty,
      unitPrice: l.unitPrice,
      total: l.total,
      warrantyMonths: l.warrantyMonths,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    total: order.total,
    paidAmount: order.paidAmount,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    scheduledDate: order.scheduledDate,
    dispatchedAt: order.dispatchedAt,
    installedAt: order.installedAt,
    wantsSubsidy: order.wantsSubsidy,
    notes: order.notes,
  };
}

export function customerOrders(db: DB, customerId: string) {
  return db.orders
    .filter((o) => o.customerId === customerId && o.status !== 'cancelled')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => {
      const invoice = db.invoices.find((i) => i.orderId === o.id);
      const subsidy = db.subsidies.find((s) => s.orderId === o.id);
      return {
        ...publicOrder(o),
        steps: orderSteps(db, o),
        invoiceNumber: invoice?.number,
        invoiceStatus: invoice?.status,
        subsidyStatus: subsidy?.status,
        subsidyAmount: subsidy?.amount,
      };
    });
}

export function customerOrderView(db: DB, order: Order) {
  const invoice = db.invoices.find((i) => i.orderId === order.id);
  const subsidy = db.subsidies.find((s) => s.orderId === order.id);
  const installation = db.installations.find((i) => i.orderId === order.id);
  return {
    order: publicOrder(order),
    steps: orderSteps(db, order),
    invoice: invoice
      ? {
          number: invoice.number,
          amount: invoice.amount,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          paidAmount: invoice.paidAmount,
          status: invoice.status,
          issuedAt: invoice.issuedAt,
          dueAt: invoice.dueAt,
        }
      : undefined,
    subsidy: subsidy
      ? {
          scheme: subsidy.scheme,
          applicationNo: subsidy.applicationNo,
          amount: subsidy.amount,
          status: subsidy.status,
          docs: subsidy.docs,
        }
      : undefined,
    installation: installation
      ? {
          ref: installation.ref,
          scheduledDate: installation.scheduledDate,
          status: installation.status,
          crewNames: installation.crewIds.map((id) => technicianName(db, id)).filter(Boolean),
        }
      : undefined,
  };
}

export function addOrderPayment(
  db: DB,
  orderId: string,
  input: { amount: number; method?: PaymentMethod; kind?: Payment['kind']; reference?: string; receivedBy?: string },
) {
  const order = findOrder(db, orderId);
  if (order.status === 'cancelled') throw new ApiError(400, 'Order is cancelled');
  if (order.status === 'requested') throw new ApiError(400, 'Confirm the order request before recording payments');
  const amount = Number(input.amount);
  if (!amount || amount <= 0) throw new ApiError(400, 'Payment amount must be greater than zero');
  const due = order.total - order.paidAmount;
  if (amount > due + 1) throw new ApiError(400, `Payment exceeds the balance due of ₹${Math.round(due).toLocaleString('en-IN')}`);

  const payment: Payment = {
    id: nextRef(db, 'payment', 'PAY'),
    ref: '',
    orderId: order.id,
    customerId: order.customerId,
    amount,
    method: input.method ?? 'bank',
    kind: input.kind ?? (order.paidAmount > 0 ? 'balance' : 'advance'),
    reference: input.reference,
    receivedAt: nowIso(),
    receivedBy: input.receivedBy ?? 'Priya Sharma',
  };
  payment.ref = payment.id;
  db.payments.unshift(payment);

  order.paidAmount += amount;
  order.paymentStatus = order.paidAmount >= order.total - 1 ? 'paid' : 'advance';
  if (order.paymentStatus === 'paid' && order.status === 'installed') {
    order.status = 'closed';
    order.closedAt = nowIso();
  }

  const invoice = db.invoices.find((i) => i.orderId === order.id);
  if (invoice) {
    invoice.paidAmount = order.paidAmount;
    if (invoice.paidAmount >= invoice.total - 1) {
      invoice.status = 'paid';
      invoice.paidAt = nowIso();
    } else if (invoice.status === 'draft') {
      invoice.status = 'sent';
      invoice.issuedAt = invoice.issuedAt ?? nowIso();
    }
  }
  return { order, payment };
}

export function scanSerial(db: DB, orderId: string, serialNo: string) {
  const order = findOrder(db, orderId);
  if (order.status !== 'confirmed') throw new ApiError(400, 'This order has already left the warehouse');
  const code = require_(serialNo?.trim(), 'Scan or type a serial number').toUpperCase();
  const unit = db.serials.find(
    (s) => s.orderId === order.id && (s.serialNo.toUpperCase() === code || s.id.toUpperCase() === code),
  );
  if (!unit) throw new ApiError(400, `${code} is not part of ${order.ref}. Check you are packing the right unit.`);
  if (unit.scanned) throw new ApiError(400, `${unit.serialNo} is already scanned`);
  unit.scanned = true;
  return unit;
}

export function dispatchOrder(db: DB, orderId: string) {
  const order = findOrder(db, orderId);
  if (order.status !== 'confirmed') throw new ApiError(400, 'Order is not awaiting dispatch');
  const units = db.serials.filter((s) => s.orderId === order.id && s.status === 'reserved');
  const unscanned = units.filter((u) => !u.scanned);
  if (unscanned.length) {
    throw new ApiError(400, `${unscanned.length} serial number(s) still to scan before dispatch`);
  }
  if (!units.length) throw new ApiError(400, 'No serial-tracked units were allocated to this order');

  const dispatchedAt = nowIso();
  for (const unit of units) {
    const product = db.products.find((p) => p.id === unit.productId);
    if (!product) continue;
    unit.status = 'dispatched';
    unit.dispatchedAt = dispatchedAt;
    unit.scanned = true;
    unit.warrantyStart = dispatchedAt;
    unit.warrantyEnd = addMonths(dispatchedAt, product.warrantyMonths);
    product.stockQty = Math.max(0, product.stockQty - 1);
  }
  for (const line of order.items.filter((l) => !l.serialized)) {
    const product = db.products.find((p) => p.id === line.sku);
    if (product) product.stockQty = Math.max(0, product.stockQty - line.qty);
  }
  order.status = 'dispatched';
  order.dispatchedAt = dispatchedAt;
  return order;
}

/* ------------------------------------------------------------------ */
/* Installations                                                      */
/* ------------------------------------------------------------------ */

export function updateInstallation(db: DB, id: string, input: Partial<Installation>) {
  const installation = db.installations.find((i) => i.id === id || i.ref === id);
  if (!installation) throw new ApiError(404, 'Installation not found');
  if (installation.status === 'completed') throw new ApiError(400, 'Completed installations are locked');
  const allowed: (keyof Installation)[] = [
    'scheduledDate',
    'crewIds',
    'startedAt',
    'finishedAt',
    'panelsInstalled',
    'generationTestKw',
    'inverterSerial',
    'notes',
    'photos',
    'crewHours',
  ];
  for (const key of allowed) {
    if (key in input && input[key] !== undefined) {
      (installation as unknown as Record<string, unknown>)[key] = input[key];
    }
  }
  if (input.startedAt && installation.status === 'scheduled') installation.status = 'in_progress';
  return installation;
}

export function completeInstallation(
  db: DB,
  id: string,
  input: {
    signatureDataUrl: string;
    signedByName: string;
    photos: string[];
    startedAt?: string;
    finishedAt?: string;
    generationTestKw?: number;
    panelsInstalled?: number;
    notes?: string;
    crewHours?: Array<{ technicianId: string; hours: number }>;
  },
) {
  const installation = db.installations.find((i) => i.id === id || i.ref === id);
  if (!installation) throw new ApiError(404, 'Installation not found');
  if (installation.status === 'completed') throw new ApiError(400, 'Installation is already signed off');
  const order = findOrder(db, installation.orderId);
  if (order.status === 'confirmed') throw new ApiError(400, 'Dispatch the material before signing off the installation');

  require_(input.signatureDataUrl, 'Customer signature is required to close the job');
  require_(input.signedByName?.trim(), 'Enter the name of the person who signed');
  if (!input.photos?.length) throw new ApiError(400, 'Upload at least one photo of the finished roof');

  const finishedAt = input.finishedAt ? new Date(input.finishedAt).toISOString() : nowIso();
  const startedAt = input.startedAt
    ? new Date(input.startedAt).toISOString()
    : installation.startedAt ?? new Date(new Date(finishedAt).getTime() - 6 * 3_600_000).toISOString();

  installation.startedAt = startedAt;
  installation.finishedAt = finishedAt;
  installation.photos = input.photos.slice(0, 8);
  installation.signatureDataUrl = input.signatureDataUrl;
  installation.signedByName = input.signedByName.trim();
  installation.signedAt = nowIso();
  installation.notes = input.notes ?? installation.notes;
  installation.generationTestKw = input.generationTestKw != null ? Number(input.generationTestKw) : installation.generationTestKw;
  installation.panelsInstalled =
    input.panelsInstalled != null ? Number(input.panelsInstalled) : Math.ceil((installation.systemSizeKw * 1000) / 550);
  installation.status = 'completed';

  const crewHours = input.crewHours?.length
    ? input.crewHours.filter((c) => c.hours > 0)
    : installation.crewIds.map((technicianId) => ({ technicianId, hours: 8 }));
  installation.crewHours = crewHours;

  const labourCost = crewHours.reduce((sum, entry) => {
    const tech = db.technicians.find((t) => t.id === entry.technicianId);
    return sum + (tech?.hourlyRate ?? 0) * entry.hours;
  }, 0);
  order.labourCost = labourCost;
  order.status = 'installed';
  order.installedAt = finishedAt;

  for (const unit of db.serials.filter((s) => s.orderId === order.id)) {
    unit.status = 'installed';
    unit.installedAt = finishedAt;
  }

  for (const entry of crewHours) {
    const tech = db.technicians.find((t) => t.id === entry.technicianId);
    if (!tech) continue;
    const exists = db.timesheets.find(
      (t) => t.refId === installation.id && t.technicianId === entry.technicianId,
    );
    if (exists) {
      exists.hours = entry.hours;
      exists.rate = tech.hourlyRate;
    } else {
      db.timesheets.unshift({
        id: nextRef(db, 'timesheet', 'TS'),
        technicianId: entry.technicianId,
        date: finishedAt,
        hours: entry.hours,
        rate: tech.hourlyRate,
        source: 'installation',
        refId: installation.id,
        paid: false,
      });
    }
  }

  const invoice = db.invoices.find((i) => i.orderId === order.id);
  if (invoice && invoice.status === 'draft') {
    invoice.status = 'sent';
    invoice.issuedAt = nowIso();
  }

  return { installation, order };
}

/* ------------------------------------------------------------------ */
/* Service tickets                                                    */
/* ------------------------------------------------------------------ */

export function warrantyForSerial(db: DB, serialNo: string) {
  const code = serialNo.trim().toUpperCase();
  const unit = db.serials.find((s) => s.serialNo.toUpperCase() === code || s.id.toUpperCase() === code);
  if (!unit) return { found: false as const };
  const product = db.products.find((p) => p.id === unit.productId);
  const customer = db.customers.find((c) => c.id === unit.customerId);
  const order = db.orders.find((o) => o.id === unit.orderId);
  const active = !!unit.warrantyEnd && new Date(unit.warrantyEnd).getTime() > Date.now();
  return {
    found: true as const,
    unit,
    product,
    customer,
    order,
    inWarranty: active,
    warrantyStatus: unit.warrantyEnd ? (active ? ('in_warranty' as const) : ('out_of_warranty' as const)) : ('unknown' as const),
  };
}

export function createTicket(
  db: DB,
  input: {
    customerId?: string;
    orderId?: string;
    serialNo?: string;
    faultCode?: string;
    description: string;
    priority?: TicketPriority;
    assignedTo?: string;
    photos?: string[];
  },
) {
  const description = require_(input.description?.trim(), 'Describe the fault reported by the customer');
  let customerId = input.customerId;
  let orderId = input.orderId;
  let serial: SerialUnit | undefined;
  let warrantyEnd: string | undefined;
  let productId: string | undefined;

  if (input.serialNo?.trim()) {
    const lookup = warrantyForSerial(db, input.serialNo);
    if (lookup.found) {
      serial = lookup.unit;
      customerId = lookup.unit.customerId ?? customerId;
      orderId = lookup.unit.orderId ?? orderId;
      warrantyEnd = lookup.unit.warrantyEnd;
      productId = lookup.unit.productId;
    }
  }
  if (!customerId && orderId) {
    const order = db.orders.find((o) => o.id === orderId || o.ref === orderId);
    customerId = order?.customerId;
  }
  if (!customerId) throw new ApiError(400, 'Select the customer or scan the faulty unit’s serial number');
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  if (!orderId) {
    const candidate = db.orders
      .filter((o) => o.customerId === customerId && o.status !== 'cancelled')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    orderId = candidate?.id;
  }
  if (serial && !warrantyEnd) {
    const order = db.orders.find((o) => o.id === serial!.orderId);
    warrantyEnd = order?.dispatchedAt ? addMonths(order.dispatchedAt, productBySku(serial.productId)?.warrantyMonths ?? 0) : undefined;
  }

  const inWarranty = !!warrantyEnd && new Date(warrantyEnd).getTime() > Date.now();
  const priority = input.priority ?? 'medium';
  const slaHours = priority === 'high' ? 24 : priority === 'medium' ? 48 : 72;
  const installation = db.installations.find((i) => i.orderId === orderId);

  const ticket: Ticket = {
    id: nextRef(db, 'ticket', 'TKT'),
    ref: '',
    customerId,
    customerName: customer.name,
    phone: customer.phone,
    address: installation?.address ?? `${customer.address}, ${customer.city}`,
    orderId,
    serialId: serial?.id,
    serialNo: serial?.serialNo,
    productId,
    faultCode: input.faultCode?.trim(),
    description,
    priority,
    status: input.assignedTo ? 'assigned' : 'open',
    reportedAt: nowIso(),
    assignedTo: input.assignedTo,
    warrantyStatus: warrantyEnd ? (inWarranty ? 'in_warranty' : 'out_of_warranty') : 'unknown',
    warrantyEnd,
    chargeable: warrantyEnd ? !inWarranty : true,
    parts: [],
    labourHours: 0,
    labourRate: 450,
    visitCharge: warrantyEnd && !inWarranty ? 500 : 0,
    partsTotal: 0,
    labourTotal: 0,
    totalCharge: 0,
    warrantyCost: 0,
    slaDueAt: new Date(Date.now() + slaHours * 3_600_000).toISOString(),
    photos: input.photos ?? [],
  };
  ticket.ref = ticket.id;
  db.tickets.unshift(ticket);
  return ticket;
}

export function updateTicket(
  db: DB,
  id: string,
  input: Partial<Pick<Ticket, 'assignedTo' | 'priority' | 'diagnosis' | 'status' | 'faultCode'>>,
) {
  const ticket = findTicket(db, id);
  if (input.assignedTo !== undefined) {
    ticket.assignedTo = input.assignedTo;
    if (ticket.status === 'open' && input.assignedTo) ticket.status = 'assigned';
  }
  if (input.priority) {
    ticket.priority = input.priority;
    const slaHours = input.priority === 'high' ? 24 : input.priority === 'medium' ? 48 : 72;
    ticket.slaDueAt = new Date(new Date(ticket.reportedAt).getTime() + slaHours * 3_600_000).toISOString();
  }
  if (input.diagnosis !== undefined) ticket.diagnosis = input.diagnosis;
  if (input.faultCode !== undefined) ticket.faultCode = input.faultCode;
  if (input.status) ticket.status = input.status;
  if (ticket.status === 'in_progress' && !ticket.assignedTo) throw new ApiError(400, 'Assign a technician first');
  return ticket;
}

export function resolveTicket(
  db: DB,
  id: string,
  input: {
    diagnosis: string;
    resolution: string;
    parts?: Array<{ sku: string; qty: number }>;
    labourHours?: number;
    labourRate?: number;
    assignedTo?: string;
  },
) {
  const ticket = findTicket(db, id);
  if (ticket.status === 'closed') throw new ApiError(400, 'Ticket is already closed');
  require_(input.diagnosis?.trim(), 'Record the diagnosis');
  require_(input.resolution?.trim(), 'Record what was done to fix the fault');

  ticket.diagnosis = input.diagnosis.trim();
  ticket.resolution = input.resolution.trim();
  ticket.assignedTo = input.assignedTo ?? ticket.assignedTo;
  ticket.labourHours = Math.max(0, Number(input.labourHours ?? ticket.labourHours));
  ticket.labourRate = Number(input.labourRate ?? ticket.labourRate);

  const parts: TicketPart[] = (input.parts ?? []).filter((p) => Number(p.qty) > 0).map((p) => {
    const product = productBySku(p.sku);
    if (!product) throw new ApiError(400, `Unknown part ${p.sku}`);
    return {
      sku: product.sku,
      name: product.name,
      qty: Number(p.qty),
      unitPrice: product.sellPrice,
      unitCost: product.costPrice,
    };
  });
  ticket.parts = parts;
  ticket.partsTotal = parts.reduce((sum, p) => sum + p.unitPrice * p.qty, 0);
  ticket.labourTotal = Math.round(ticket.labourHours * ticket.labourRate);
  ticket.visitCharge = ticket.chargeable ? ticket.visitCharge || 500 : 0;
  ticket.totalCharge = ticket.chargeable ? ticket.partsTotal + ticket.labourTotal + ticket.visitCharge : 0;
  ticket.warrantyCost = ticket.chargeable
    ? 0
    : parts.reduce((sum, p) => sum + p.unitCost * p.qty, 0) + ticket.labourTotal;
  ticket.resolvedAt = nowIso();
  ticket.status = 'resolved';

  if (ticket.chargeable && ticket.totalCharge > 0 && !ticket.invoiceId) {
    const amount = ticket.totalCharge;
    const tax = Math.round(amount * 0.18);
    const invoice: Invoice = {
      id: nextRef(db, 'invoice', 'INV'),
      number: '',
      type: 'service',
      ticketId: ticket.id,
      customerId: ticket.customerId,
      customerName: ticket.customerName,
      description: `Service call ${ticket.ref} — ${ticket.faultCode ?? 'repair'}`,
      amount,
      taxAmount: tax,
      total: amount + tax,
      paidAmount: 0,
      status: 'sent',
      issuedAt: nowIso(),
      dueAt: new Date(Date.now() + 7 * DAY).toISOString(),
      createdAt: nowIso(),
    };
    invoice.number = invoice.id;
    db.invoices.unshift(invoice);
    ticket.invoiceId = invoice.id;
  }

  if (ticket.labourHours > 0 && ticket.assignedTo) {
    const tech = db.technicians.find((t) => t.id === ticket.assignedTo);
    if (tech) {
      db.timesheets.unshift({
        id: nextRef(db, 'timesheet', 'TS'),
        technicianId: tech.id,
        date: nowIso(),
        hours: ticket.labourHours,
        rate: ticket.labourRate,
        source: 'service',
        refId: ticket.id,
        paid: false,
      });
    }
  }
  return ticket;
}

export function confirmTicket(db: DB, id: string, note?: string) {
  const ticket = findTicket(db, id);
  if (ticket.status !== 'resolved') throw new ApiError(400, 'Resolve the ticket before the customer can confirm it');
  ticket.status = 'closed';
  ticket.confirmedAt = nowIso();
  if (note) ticket.resolution = `${ticket.resolution ?? ''}\nCustomer: ${note}`.trim();
  return ticket;
}

/* ------------------------------------------------------------------ */
/* Billing, subsidy, stock, payroll                                   */
/* ------------------------------------------------------------------ */

export function issueInvoice(db: DB, id: string) {
  const invoice = db.invoices.find((i) => i.id === id || i.number === id);
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  if (invoice.status === 'paid') throw new ApiError(400, 'Invoice is already paid');
  invoice.status = 'sent';
  invoice.issuedAt = invoice.issuedAt ?? nowIso();
  invoice.dueAt = invoice.dueAt ?? new Date(Date.now() + 15 * DAY).toISOString();
  return invoice;
}

export function payInvoice(db: DB, id: string, input: { method?: PaymentMethod; reference?: string }) {
  const invoice = db.invoices.find((i) => i.id === id || i.number === id);
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  if (invoice.status === 'paid') throw new ApiError(400, 'Invoice is already paid');
  const due = invoice.total - invoice.paidAmount;
  if (due <= 0) throw new ApiError(400, 'Nothing left to collect');

  const payment: Payment = {
    id: nextRef(db, 'payment', 'PAY'),
    ref: '',
    orderId: invoice.orderId,
    ticketId: invoice.ticketId,
    customerId: invoice.customerId,
    amount: due,
    method: input.method ?? 'upi',
    kind: invoice.type === 'service' ? 'service' : 'balance',
    reference: input.reference,
    receivedAt: nowIso(),
    receivedBy: 'Sneha Iyer',
  };
  payment.ref = payment.id;
  db.payments.unshift(payment);

  invoice.paidAmount = invoice.total;
  invoice.status = 'paid';
  invoice.paidAt = nowIso();

  if (invoice.orderId) {
    const order = db.orders.find((o) => o.id === invoice.orderId);
    if (order) {
      order.paidAmount = Math.min(order.total, order.paidAmount + due);
      order.paymentStatus = order.paidAmount >= order.total - 1 ? 'paid' : 'advance';
      if (order.paymentStatus === 'paid' && order.status === 'installed') {
        order.status = 'closed';
        order.closedAt = nowIso();
      }
    }
  }
  return invoice;
}

export function updateSubsidy(
  db: DB,
  id: string,
  input: { docs?: Array<{ name: string; received: boolean }>; status?: SubsidyStatus; notes?: string; applicationNo?: string },
) {
  const subsidy = db.subsidies.find((s) => s.id === id);
  if (!subsidy) throw new ApiError(404, 'Subsidy file not found');
  if (input.docs) subsidy.docs = input.docs;
  if (input.notes !== undefined) subsidy.notes = input.notes;
  if (input.applicationNo !== undefined) subsidy.applicationNo = input.applicationNo;
  if (input.status) {
    subsidy.status = input.status;
    if (input.status === 'submitted') subsidy.submittedAt = subsidy.submittedAt ?? nowIso();
    if (input.status === 'approved') {
      subsidy.approvedAt = nowIso();
      if (subsidy.docs.some((d) => !d.received)) throw new ApiError(400, 'Collect every document before marking the subsidy approved');
    }
    if (input.status === 'received') {
      subsidy.approvedAt = subsidy.approvedAt ?? nowIso();
      subsidy.receivedAt = nowIso();
      if (subsidy.docs.some((d) => !d.received)) throw new ApiError(400, 'Collect every document before recording the subsidy payout');
      db.payments.unshift({
        id: nextRef(db, 'payment', 'PAY'),
        ref: '',
        orderId: subsidy.orderId,
        customerId: subsidy.customerId,
        amount: subsidy.amount,
        method: 'bank',
        kind: 'subsidy',
        receivedAt: nowIso(),
        receivedBy: 'Government portal',
      });
    }
  }
  return subsidy;
}

export function addExpense(
  db: DB,
  input: { date?: string; category: ExpenseCategory; description: string; amount: number; vendor?: string; orderId?: string },
) {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) throw new ApiError(400, 'Expense amount must be greater than zero');
  const expense: Expense = {
    id: nextRef(db, 'expense', 'EXP'),
    ref: '',
    date: input.date ? new Date(input.date).toISOString() : nowIso(),
    category: input.category,
    description: require_(input.description?.trim(), 'Describe the expense'),
    amount,
    vendor: input.vendor,
    orderId: input.orderId,
  };
  expense.ref = expense.id;
  db.expenses.unshift(expense);
  return expense;
}

export function receiveStock(
  db: DB,
  input: { sku: string; qty: number; unitCost?: number; vendor?: string; createExpense?: boolean },
) {
  const product = db.products.find((p) => p.sku === input.sku || p.id === input.sku);
  if (!product) throw new ApiError(404, 'Product not found');
  const qty = Number(input.qty);
  if (!qty || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
  const unitCost = input.unitCost != null ? Number(input.unitCost) : product.costPrice;
  product.stockQty += qty;
  if (input.unitCost != null) product.costPrice = unitCost;

  if (product.serialized) {
    const existing = db.serials.filter((s) => s.productId === product.id).length;
    for (let i = 0; i < qty; i++) {
      const sn = `${product.sku}-${String(existing + i + 1).padStart(5, '0')}`;
      db.serials.push({ id: sn, serialNo: sn, productId: product.id, status: 'in_stock' });
    }
  }

  if (input.createExpense !== false) {
    addExpense(db, {
      category: 'stock',
      description: `Stock received — ${qty} × ${product.name}`,
      amount: qty * unitCost,
      vendor: input.vendor ?? 'Stock purchase',
    });
  }
  return product;
}

export function payTechnician(db: DB, technicianId: string, period?: { from?: string; to?: string }) {
  const tech = db.technicians.find((t) => t.id === technicianId);
  if (!tech) throw new ApiError(404, 'Technician not found');
  const from = period?.from ? new Date(period.from) : new Date(0);
  const to = period?.to ? new Date(period.to) : new Date(Date.now() + DAY);
  const entries = db.timesheets.filter(
    (t) =>
      t.technicianId === technicianId &&
      !t.paid &&
      new Date(t.date).getTime() >= from.getTime() &&
      new Date(t.date).getTime() <= to.getTime(),
  );
  if (!entries.length) throw new ApiError(400, 'No unpaid timesheets for this technician');
  const amount = entries.reduce((sum, t) => sum + t.hours * t.rate, 0);
  const expense = addExpense(db, {
    category: 'salaries',
    description: `Technician payout — ${tech.name} (${entries.length} jobs)`,
    amount,
    vendor: 'SunPower payroll',
  });
  for (const entry of entries) {
    entry.paid = true;
    entry.expenseId = expense.id;
  }
  return { technician: tech, amount, entries: entries.length, expense };
}

/* ------------------------------------------------------------------ */
/* Views                                                              */
/* ------------------------------------------------------------------ */

export function orderSteps(db: DB, order: Order) {
  const invoice = db.invoices.find((i) => i.orderId === order.id);
  const subsidy = db.subsidies.find((s) => s.orderId === order.id);
  const units = db.serials.filter((s) => s.orderId === order.id);
  const scanned = units.filter((u) => u.scanned).length;
  if (order.status === 'requested') {
    return [
      { key: 'request', label: 'Order request received', done: true },
      { key: 'confirm', label: 'SunPower confirms the order', done: false },
      { key: 'payment', label: 'Advance received', done: false },
      { key: 'dispatch', label: 'Material dispatched', done: false },
      { key: 'install', label: 'Installed & signed off', done: false },
      { key: 'invoice', label: 'Invoice issued', done: false },
      { key: 'settled', label: 'Payment settled', done: false },
    ];
  }
  return [
    { key: 'quote', label: 'Quote accepted', done: true },
    { key: 'payment', label: 'Advance received', done: order.paidAmount > 0 },
    { key: 'scan', label: `Serials scanned (${scanned}/${units.length})`, done: units.length > 0 && scanned === units.length },
    { key: 'dispatch', label: 'Material dispatched', done: !!order.dispatchedAt },
    { key: 'install', label: 'Installed & signed off', done: !!order.installedAt },
    { key: 'invoice', label: 'Invoice issued', done: !!invoice && invoice.status !== 'draft' },
    { key: 'settled', label: 'Payment settled', done: order.paymentStatus === 'paid' },
    ...(subsidy
      ? [{ key: 'subsidy', label: 'Subsidy submitted', done: subsidy.status !== 'documents_pending' }]
      : []),
  ];
}

export function orderView(db: DB, order: Order) {
  return {
    order,
    customer: db.customers.find((c) => c.id === order.customerId),
    quote: db.quotes.find((q) => q.id === order.quoteId),
    installation: db.installations.find((i) => i.orderId === order.id),
    invoice: db.invoices.find((i) => i.orderId === order.id),
    subsidy: db.subsidies.find((s) => s.orderId === order.id),
    serials: db.serials.filter((s) => s.orderId === order.id),
    payments: db.payments.filter((p) => p.orderId === order.id),
    steps: orderSteps(db, order),
    profit: jobProfit(order),
    marginPct: order.total ? Math.round((jobProfit(order) / order.total) * 100) : 0,
  };
}

export function enquiryView(db: DB, enquiry: Enquiry) {
  const survey = db.surveys.find((s) => s.enquiryId === enquiry.id);
  const quote = db.quotes.find((q) => q.enquiryId === enquiry.id);
  const order = quote ? db.orders.find((o) => o.quoteId === quote.id) : undefined;
  return { enquiry, survey, quote, order, technician: survey ? technicianName(db, survey.technicianId) : undefined };
}

export function ticketView(db: DB, ticket: Ticket) {
  const order = ticket.orderId ? db.orders.find((o) => o.id === ticket.orderId) : undefined;
  const product = ticket.productId ? db.products.find((p) => p.id === ticket.productId) : undefined;
  const serial = ticket.serialId ? db.serials.find((s) => s.id === ticket.serialId) : undefined;
  const invoice = ticket.invoiceId ? db.invoices.find((i) => i.id === ticket.invoiceId) : undefined;
  return {
    ticket,
    order,
    product,
    serial,
    invoice,
    technicianName: technicianName(db, ticket.assignedTo),
    warrantyActive: !!ticket.warrantyEnd && new Date(ticket.warrantyEnd).getTime() > Date.now(),
    overdue: ['open', 'assigned', 'in_progress'].includes(ticket.status) && new Date(ticket.slaDueAt).getTime() < Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard and reports                                              */
/* ------------------------------------------------------------------ */

export function dashboard(db: DB) {
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);

  const sumPayments = (from: Date) =>
    db.payments.filter((p) => after(p.receivedAt, from)).reduce((s, p) => s + p.amount, 0);

  const installedThisMonth = db.orders.filter((o) => after(o.installedAt, month) && o.status !== 'cancelled');
  const grossProfit = installedThisMonth.reduce((s, o) => s + jobProfit(o), 0);
  const revenueBooked = installedThisMonth.reduce((s, o) => s + o.total, 0);

  const receivables = db.orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'requested')
    .reduce((s, o) => s + Math.max(0, o.total - o.paidAmount), 0);

  const pipeline = db.quotes
    .filter((q) => q.status === 'sent' || q.status === 'draft')
    .reduce((s, q) => s + q.total, 0);

  const openTickets = db.tickets.filter((t) => !['closed', 'confirmed'].includes(t.status));
  const activeTicket = (t: Ticket) => ['open', 'assigned', 'in_progress'].includes(t.status);
  const overdueTickets = openTickets.filter((t) => activeTicket(t) && new Date(t.slaDueAt).getTime() < Date.now());
  const inProgress = db.orders.filter((o) => o.status === 'confirmed' || o.status === 'dispatched');
  const subsidyPending = db.subsidies
    .filter((s) => !['received', 'rejected'].includes(s.status))
    .reduce((s, x) => s + x.amount, 0);
  const lowStock = db.products.filter((p) => p.reorderLevel > 0 && p.stockQty <= p.reorderLevel);

  const revenueSeries: Array<{ date: string; label: string; revenue: number; jobs: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const key = dateKey(d.toISOString());
    const revenue = db.payments
      .filter((p) => dateKey(p.receivedAt) === key)
      .reduce((s, p) => s + p.amount, 0);
    const jobs = db.installations.filter((inst) => inst.finishedAt && dateKey(inst.finishedAt) === key).length;
    revenueSeries.push({
      date: key,
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue,
      jobs,
    });
  }

  const todayInstallations = db.installations
    .filter((i) => i.scheduledDate && dateKey(i.scheduledDate) === dateKey(now.toISOString()) && i.status !== 'completed')
    .map((i) => ({
      id: i.id,
      ref: i.ref,
      customerName: i.customerName,
      systemSizeKw: i.systemSizeKw,
      crew: i.crewIds.map((id) => technicianName(db, id)).filter(Boolean),
      status: i.status,
      address: i.address,
    }));

  const todaySurveys = db.surveys
    .filter((s) => dateKey(s.scheduledAt) === dateKey(now.toISOString()) && s.status === 'scheduled')
    .map((s) => ({
      id: s.id,
      ref: s.ref,
      customerName: db.enquiries.find((e) => e.id === s.enquiryId)?.customerName ?? '',
      technician: technicianName(db, s.technicianId),
      scheduledAt: s.scheduledAt,
    }));

  const alerts: Array<{ level: 'danger' | 'warn' | 'info'; title: string; detail: string; link: string }> = [];
  // Customer-placed orders go first so they can never be trimmed off the alert list.
  for (const o of db.orders.filter((o) => o.status === 'requested')) {
    alerts.push({
      level: 'warn',
      title: `New customer order — ${o.ref}`,
      detail: `${o.customerName} · ${o.capacityKw} kW ${o.systemType} · awaiting confirmation`,
      link: `/orders/${o.id}`,
    });
  }
  for (const t of overdueTickets.slice(0, 4)) {
    alerts.push({
      level: 'danger',
      title: `${t.ref} overdue — ${t.customerName}`,
      detail: `${t.faultCode ?? 'Service call'} · due ${new Date(t.slaDueAt).toLocaleDateString('en-IN')}`,
      link: `/tickets/${t.id}`,
    });
  }
  for (const o of db.orders.filter((o) => o.status === 'confirmed' && Date.now() - new Date(o.confirmedAt ?? o.createdAt).getTime() > 2 * DAY)) {
    alerts.push({
      level: 'warn',
      title: `${o.ref} waiting to be dispatched`,
      detail: `${o.customerName} · confirmed ${Math.floor((Date.now() - new Date(o.confirmedAt ?? o.createdAt).getTime()) / DAY)} days ago`,
      link: `/orders/${o.id}`,
    });
  }
  for (const s of db.subsidies.filter((s) => s.status === 'documents_pending')) {
    alerts.push({
      level: 'info',
      title: `Subsidy documents pending — ${s.customerName}`,
      detail: `${s.docs.filter((d) => !d.received).length} of ${s.docs.length} documents still missing`,
      link: `/billing?tab=subsidy`,
    });
  }
  for (const p of lowStock.slice(0, 3)) {
    alerts.push({
      level: 'warn',
      title: `Low stock — ${p.name}`,
      detail: `${p.stockQty} ${p.unit}(s) left, reorder level ${p.reorderLevel}`,
      link: '/inventory',
    });
  }

  return {
    kpis: {
      revenueToday: sumPayments(today),
      revenueWeek: sumPayments(week),
      revenueMonth: sumPayments(month),
      cashCollectedMonth: sumPayments(month),
      grossProfitMonth: grossProfit,
      revenueBookedMonth: revenueBooked,
      jobsCompletedMonth: installedThisMonth.length,
      avgMarginPct: revenueBooked ? Math.round((grossProfit / revenueBooked) * 100) : 0,
      receivables,
      pipeline,
      openTickets: openTickets.length,
      overdueTickets: overdueTickets.length,
      jobsInProgress: inProgress.length,
      subsidyPending,
      lowStockCount: lowStock.length,
      newEnquiries: db.enquiries.filter((e) => e.status === 'new').length,
    },
    revenueSeries,
    pipelineCounts: {
      new: db.enquiries.filter((e) => e.status === 'new').length,
      qualified: db.enquiries.filter((e) => ['contacted', 'qualified'].includes(e.status)).length,
      survey: db.enquiries.filter((e) => ['survey_scheduled', 'surveyed', 'survey_approved'].includes(e.status)).length,
      quoted: db.enquiries.filter((e) => e.status === 'quoted').length,
      won: db.enquiries.filter((e) => e.status === 'won').length,
    },
    todayInstallations,
    todaySurveys,
    alerts: alerts.slice(0, 8),
    recentEnquiries: [...db.enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    openTickets: openTickets.slice(0, 5).map((t) => ({
      ...t,
      technicianName: technicianName(db, t.assignedTo),
      overdue: activeTicket(t) && new Date(t.slaDueAt).getTime() < Date.now(),
    })),
    unfinished: [...db.orders]
      .filter((o) => o.status !== 'closed' && o.status !== 'cancelled' && o.status !== 'requested')
      .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt))
      .slice(0, 6)
      .map((o) => ({ id: o.id, ref: o.ref, customerName: o.customerName, status: o.status, steps: orderSteps(db, o) })),
  };
}

export function reports(db: DB, range?: { from?: string; to?: string }) {
  const from = range?.from ? new Date(range.from) : startOfMonth(new Date());
  const to = range?.to ? new Date(range.to) : new Date();
  const inRange = (iso?: string) => !!iso && new Date(iso) >= from && new Date(iso) <= to;

  const orders = db.orders.filter((o) => inRange(o.installedAt ?? o.confirmedAt));
  const jobRows = orders.map((o) => {
    const expensesForJob = db.expenses.filter((e) => e.orderId === o.id).reduce((s, e) => s + e.amount, 0);
    return {
      id: o.id,
      ref: o.ref,
      customerName: o.customerName,
      capacityKw: o.capacityKw,
      systemType: o.systemType,
      status: o.status,
      installedAt: o.installedAt,
      revenue: o.total,
      partsCost: o.costTotal,
      labourCost: o.labourCost,
      otherCost: o.otherCost,
      expenses: expensesForJob,
      profit: jobProfit(o),
      marginPct: o.total ? Math.round((jobProfit(o) / o.total) * 100) : 0,
      collected: o.paidAmount,
      due: Math.max(0, o.total - o.paidAmount),
    };
  });

  const totals = {
    revenue: jobRows.reduce((s, r) => s + r.revenue, 0),
    partsCost: jobRows.reduce((s, r) => s + r.partsCost, 0),
    labourCost: jobRows.reduce((s, r) => s + r.labourCost, 0),
    otherCost: jobRows.reduce((s, r) => s + r.otherCost, 0),
    profit: jobRows.reduce((s, r) => s + r.profit, 0),
    jobs: jobRows.length,
    collected: jobRows.reduce((s, r) => s + r.collected, 0),
    due: jobRows.reduce((s, r) => s + r.due, 0),
  };

  const operatingExpenses = db.expenses
    .filter((e) => inRange(e.date) && e.category !== 'stock' && !e.orderId)
    .reduce((s, e) => s + e.amount, 0);
  const stockPurchases = db.expenses
    .filter((e) => inRange(e.date) && e.category === 'stock')
    .reduce((s, e) => s + e.amount, 0);

  const monthlySeries: Array<{ month: string; label: string; revenue: number; profit: number; jobs: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthOrders = db.orders.filter(
      (o) => o.installedAt && new Date(o.installedAt) >= mStart && new Date(o.installedAt) <= mEnd,
    );
    monthlySeries.push({
      month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue: monthOrders.reduce((s, o) => s + o.total, 0),
      profit: monthOrders.reduce((s, o) => s + jobProfit(o), 0),
      jobs: monthOrders.length,
    });
  }

  const unfinished = db.orders
    .filter((o) => o.status !== 'closed' && o.status !== 'cancelled' && o.status !== 'requested')
    .map((o) => {
      const steps = orderSteps(db, o);
      return {
        id: o.id,
        ref: o.ref,
        customerName: o.customerName,
        status: o.status,
        value: o.total,
        due: Math.max(0, o.total - o.paidAmount),
        pendingSteps: steps.filter((s) => !s.done).map((s) => s.label),
      };
    });

  const openRepairs = db.tickets
    .filter((t) => !['closed', 'confirmed'].includes(t.status))
    .map((t) => ({
      id: t.id,
      ref: t.ref,
      customerName: t.customerName,
      fault: t.faultCode,
      priority: t.priority,
      status: t.status,
      warrantyStatus: t.warrantyStatus,
      overdue: ['open', 'assigned', 'in_progress'].includes(t.status) && new Date(t.slaDueAt).getTime() < Date.now(),
      reportedAt: t.reportedAt,
      technicianName: technicianName(db, t.assignedTo),
    }));

  const capacityMix = [1, 2, 3, 4, 5].map((kw) => ({
    kw,
    count: db.orders.filter((o) => o.capacityKw === kw).length,
    revenue: db.orders.filter((o) => o.capacityKw === kw).reduce((s, o) => s + o.total, 0),
  }));

  const technicianPayroll = db.technicians.map((t) => {
    const entries = db.timesheets.filter((ts) => ts.technicianId === t.id && !ts.paid);
    const hours = entries.reduce((s, e) => s + e.hours, 0);
    return {
      id: t.id,
      name: t.name,
      role: t.role,
      hours,
      amount: entries.reduce((s, e) => s + e.hours * e.rate, 0),
      jobs: entries.length,
    };
  });

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      ...totals,
      operatingExpenses,
      stockPurchases,
      netProfit: totals.profit - operatingExpenses,
    },
    jobRows: jobRows.sort((a, b) => b.profit - a.profit),
    monthlySeries,
    unfinished,
    openRepairs,
    capacityMix,
    technicianPayroll,
    receivables: db.orders
      .filter((o) => o.status !== 'cancelled' && o.total - o.paidAmount > 0)
      .map((o) => ({
        id: o.id,
        ref: o.ref,
        customerName: o.customerName,
        due: o.total - o.paidAmount,
        ageDays: Math.floor((Date.now() - new Date(o.confirmedAt ?? o.createdAt).getTime()) / DAY),
        status: o.status,
      }))
      .sort((a, b) => b.due - a.due),
    subsidy: {
      pending: db.subsidies.filter((s) => !['received', 'rejected'].includes(s.status)).reduce((s, x) => s + x.amount, 0),
      received: db.subsidies.filter((s) => s.status === 'received').reduce((s, x) => s + x.amount, 0),
      files: db.subsidies.length,
    },
  };
}

export function catalogueSummary() {
  return CATALOG.filter((c) => c.category !== 'service').map((c) => ({
    sku: c.sku,
    name: c.name,
    category: c.category,
    sellPrice: c.sellPrice,
    warrantyMonths: c.warrantyMonths,
  }));
}

export function availableTechnicians(db: DB): Technician[] {
  return db.technicians.filter((t) => t.active);
}

export function stockStatus(db: DB) {
  return db.products.map((p) => {
    const available = db.serials.filter((s) => s.productId === p.id && s.status === 'in_stock').length;
    return {
      ...p,
      availableSerials: available,
      low: p.reorderLevel > 0 && p.stockQty <= p.reorderLevel,
    };
  });
}

export function serialSearch(db: DB, query: string) {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return db.serials
    .filter((s) => s.serialNo.toUpperCase().includes(q))
    .slice(0, 20)
    .map((s) => {
      const product = db.products.find((p) => p.id === s.productId);
      const customer = db.customers.find((c) => c.id === s.customerId);
      const order = db.orders.find((o) => o.id === s.orderId);
      return {
        ...s,
        productName: product?.name,
        customerName: customer?.name,
        orderRef: order?.ref,
        inWarranty: !!s.warrantyEnd && new Date(s.warrantyEnd).getTime() > Date.now(),
      };
    });
}

export function timesheetSummary(db: DB) {
  return db.technicians.map((t) => {
    const entries = db.timesheets.filter((ts) => ts.technicianId === t.id);
    const unpaid = entries.filter((e) => !e.paid);
    return {
      ...t,
      totalHours: entries.reduce((s, e) => s + e.hours, 0),
      unpaidHours: unpaid.reduce((s, e) => s + e.hours, 0),
      unpaidAmount: unpaid.reduce((s, e) => s + e.hours * e.rate, 0),
      unpaidJobs: unpaid.length,
    };
  });
}

export type TimesheetRow = Timesheet;
