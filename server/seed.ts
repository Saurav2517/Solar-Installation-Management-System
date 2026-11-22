import {
  CATALOG,
  addMonths,
  buildBom,
  estimatedLabourCost,
  quoteTotals,
  subsidyFor,
} from '../shared/bom';
import { demoAccounts } from './auth';
import type {
  BomLine,
  CapacityKw,
  DB,
  Enquiry,
  EnquirySource,
  EnquiryStatus,
  Expense,
  Installation,
  Invoice,
  Order,
  Payment,
  PaymentKind,
  PaymentMethod,
  Product,
  Quote,
  SerialUnit,
  Staff,
  Subsidy,
  SubsidyStatus,
  Survey,
  SystemType,
  Technician,
  Ticket,
  TicketPart,
  TicketPriority,
  TicketStatus,
  Timesheet,
} from '../shared/types';

const DAY = 86_400_000;
const NOW = Date.now();

const iso = (daysAgo: number, hour = 10, minute = 0) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const addDays = (isoDate: string, days: number) => new Date(new Date(isoDate).getTime() + days * DAY).toISOString();

const signature = (name: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220"><rect width="640" height="220" fill="#ffffff"/><text x="44" y="128" font-family="Segoe Script, Brush Script MT, cursive" font-size="46" fill="#1e293b">${name}</text><line x1="44" y1="158" x2="470" y2="158" stroke="#94a3b8" stroke-width="2"/><text x="44" y="196" font-family="Arial, sans-serif" font-size="16" fill="#64748b">Customer acceptance — signed on site</text></svg>`,
  );

const roofPhoto = (label: string, tone: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${tone}"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient><linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="800" height="520" fill="url(#sky)"/><circle cx="660" cy="90" r="46" fill="#fde68a" opacity="0.85"/><rect y="300" width="800" height="220" fill="#cbd5e1"/><g transform="translate(70,190) skewX(-12)"><g fill="url(#panel)" stroke="#93c5fd" stroke-width="3">${[0, 1, 2, 3]
      .map((r) =>
        [0, 1, 2, 3, 4, 5]
          .map(
            (c) =>
              `<rect x="${c * 108}" y="${r * 62}" width="102" height="56" rx="4"/>`,
          )
          .join(''),
      )
      .join('')}</g></g><text x="36" y="480" font-family="Arial, sans-serif" font-size="22" fill="#334155">${label}</text></svg>`,
  );

interface Scenario {
  key: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  kw: CapacityKw;
  type: SystemType;
  subsidy: boolean;
  bill: number;
  roof: number;
  source: EnquirySource;
  created: number;
  surveyAt?: number;
  surveyed?: number;
  approved?: number;
  quoted?: number;
  accepted?: number;
  confirmed?: number;
  dispatched?: number;
  installed?: number;
  paid?: number;
  advancePct?: number;
  scannedCount?: number;
  crew?: number;
  lostReason?: string;
  subsidyStatus?: SubsidyStatus;
  invoiceIssued?: boolean;
  forceStatus?: EnquiryStatus;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'hegde',
    name: 'Nagaraj Hegde',
    phone: '+91 98450 11223',
    email: 'nagaraj.hegde@gmail.com',
    address: '18, 4th Cross, Malleshwaram',
    city: 'Bengaluru',
    pincode: '560003',
    kw: 3,
    type: 'on-grid',
    subsidy: true,
    bill: 4200,
    roof: 320,
    source: 'call',
    created: 900,
    surveyAt: 897,
    surveyed: 895,
    approved: 893,
    quoted: 892,
    accepted: 890,
    confirmed: 889,
    dispatched: 886,
    installed: 884,
    paid: 884,
    subsidyStatus: 'received',
    crew: 0,
  },
  {
    key: 'iyer',
    name: 'Ramesh Iyer',
    phone: '+91 99001 44556',
    email: 'ramesh.iyer@outlook.com',
    address: '42, Sarjapur Road, Bellandur',
    city: 'Bengaluru',
    pincode: '560103',
    kw: 3,
    type: 'on-grid',
    subsidy: true,
    bill: 5100,
    roof: 340,
    source: 'web',
    created: 82,
    surveyAt: 80,
    surveyed: 79,
    approved: 77,
    quoted: 76,
    accepted: 75,
    confirmed: 74,
    dispatched: 72,
    installed: 70,
    paid: 68,
    subsidyStatus: 'received',
    crew: 1,
  },
  {
    key: 'gowda',
    name: 'Suresh Gowda',
    phone: '+91 98440 77889',
    email: 'suresh.gowda@gmail.com',
    address: 'Sy. No. 44, Kanakapura Main Road',
    city: 'Bengaluru',
    pincode: '560082',
    kw: 5,
    type: 'off-grid',
    subsidy: false,
    bill: 8900,
    roof: 560,
    source: 'whatsapp',
    created: 74,
    surveyAt: 72,
    surveyed: 71,
    approved: 70,
    quoted: 69,
    accepted: 68,
    confirmed: 67,
    dispatched: 65,
    installed: 63,
    paid: 60,
    subsidyStatus: undefined,
    crew: 2,
  },
  {
    key: 'desai',
    name: 'Anita Desai',
    phone: '+91 90080 22334',
    email: 'anita.desai@gmail.com',
    address: '7, Indiranagar 2nd Stage',
    city: 'Bengaluru',
    pincode: '560038',
    kw: 2,
    type: 'on-grid',
    subsidy: true,
    bill: 2800,
    roof: 210,
    source: 'web',
    created: 62,
    surveyAt: 60,
    surveyed: 59,
    approved: 58,
    quoted: 57,
    accepted: 56,
    confirmed: 55,
    dispatched: 53,
    installed: 51,
    paid: 48,
    subsidyStatus: 'received',
    crew: 3,
  },
  {
    key: 'rafiq',
    name: 'Mohammed Rafiq',
    phone: '+91 97400 55667',
    email: 'rafiq.m@gmail.com',
    address: '112, Frazer Town, Mosque Road',
    city: 'Bengaluru',
    pincode: '560005',
    kw: 4,
    type: 'on-grid',
    subsidy: true,
    bill: 6400,
    roof: 420,
    source: 'call',
    created: 51,
    surveyAt: 49,
    surveyed: 48,
    approved: 47,
    quoted: 46,
    accepted: 45,
    confirmed: 44,
    dispatched: 42,
    installed: 40,
    paid: 37,
    subsidyStatus: 'received',
    crew: 0,
  },
  {
    key: 'reddy',
    name: 'Kavita Reddy',
    phone: '+91 98860 33445',
    email: 'kavita.reddy@gmail.com',
    address: '23, HSR Layout Sector 2',
    city: 'Bengaluru',
    pincode: '560102',
    kw: 1,
    type: 'on-grid',
    subsidy: true,
    bill: 1600,
    roof: 140,
    source: 'web',
    created: 42,
    surveyAt: 40,
    surveyed: 39,
    approved: 38,
    quoted: 37,
    accepted: 36,
    confirmed: 35,
    dispatched: 33,
    installed: 31,
    paid: 28,
    subsidyStatus: 'approved',
    crew: 1,
  },
  {
    key: 'shetty',
    name: 'Vinod Shetty',
    phone: '+91 98450 66778',
    email: 'vinod@sspack.in',
    address: 'Plot 19, Peenya Industrial Area',
    city: 'Bengaluru',
    pincode: '560058',
    kw: 5,
    type: 'on-grid',
    subsidy: false,
    bill: 21500,
    roof: 700,
    source: 'call',
    created: 34,
    surveyAt: 32,
    surveyed: 31,
    approved: 30,
    quoted: 29,
    accepted: 28,
    confirmed: 27,
    dispatched: 25,
    installed: 23,
    paid: 20,
    subsidyStatus: undefined,
    crew: 2,
  },
  {
    key: 'nair',
    name: 'Priyanka Nair',
    phone: '+91 99860 99001',
    email: 'priyanka.nair@gmail.com',
    address: '56, Whitefield Main Road',
    city: 'Bengaluru',
    pincode: '560066',
    kw: 3,
    type: 'off-grid',
    subsidy: false,
    bill: 4700,
    roof: 360,
    source: 'whatsapp',
    created: 26,
    surveyAt: 24,
    surveyed: 23,
    approved: 22,
    quoted: 21,
    accepted: 20,
    confirmed: 19,
    dispatched: 17,
    installed: 15,
    paid: 12,
    subsidyStatus: undefined,
    crew: 3,
  },
  {
    key: 'patel',
    name: 'Harish Patel',
    phone: '+91 90350 44556',
    email: 'harish.patel@gmail.com',
    address: '9, Jayanagar 4th Block',
    city: 'Bengaluru',
    pincode: '560011',
    kw: 2,
    type: 'on-grid',
    subsidy: true,
    bill: 2400,
    roof: 190,
    source: 'web',
    created: 20,
    surveyAt: 18,
    surveyed: 17,
    approved: 16,
    quoted: 15,
    accepted: 14,
    confirmed: 13,
    dispatched: 11,
    installed: 9,
    paid: 6,
    subsidyStatus: 'submitted',
    crew: 0,
  },
  {
    key: 'krishnan',
    name: 'Deepa Krishnan',
    phone: '+91 98450 88990',
    email: 'deepa.krishnan@gmail.com',
    address: '31, Koramangala 5th Block',
    city: 'Bengaluru',
    pincode: '560095',
    kw: 3,
    type: 'on-grid',
    subsidy: true,
    bill: 3900,
    roof: 300,
    source: 'web',
    created: 13,
    surveyAt: 11,
    surveyed: 10,
    approved: 9,
    quoted: 8,
    accepted: 7,
    confirmed: 6,
    dispatched: 4,
    installed: 2,
    subsidyStatus: 'documents_pending',
    crew: 1,
  },
  {
    key: 'kumar',
    name: 'Rakesh Kumar',
    phone: '+91 97400 11332',
    email: 'rakesh.kumar@gmail.com',
    address: '88, Rajajinagar 1st Block',
    city: 'Bengaluru',
    pincode: '560010',
    kw: 5,
    type: 'on-grid',
    subsidy: true,
    bill: 7600,
    roof: 520,
    source: 'whatsapp',
    created: 10,
    surveyAt: 8,
    surveyed: 7,
    approved: 6,
    quoted: 5,
    accepted: 4,
    confirmed: 3,
    dispatched: 1,
    installed: 0,
    paid: 0,
    subsidyStatus: 'documents_pending',
    crew: 2,
  },
  {
    key: 'joshi',
    name: 'Sunita Joshi',
    phone: '+91 98860 77665',
    email: 'sunita.joshi@gmail.com',
    address: '14, Banashankari 2nd Stage',
    city: 'Bengaluru',
    pincode: '560070',
    kw: 3,
    type: 'on-grid',
    subsidy: true,
    bill: 3300,
    roof: 310,
    source: 'web',
    created: 12,
    surveyAt: 10,
    surveyed: 9,
    approved: 8,
    quoted: 7,
    accepted: 6,
    confirmed: 5,
    dispatched: 3,
    installed: 1,
    advancePct: 0.3,
    subsidyStatus: 'submitted',
    crew: 3,
  },
  {
    key: 'rao',
    name: 'Ganesh Rao',
    phone: '+91 90080 66554',
    email: 'ganesh.rao@gmail.com',
    address: '204, Electronic City Phase 1',
    city: 'Bengaluru',
    pincode: '560100',
    kw: 4,
    type: 'off-grid',
    subsidy: false,
    bill: 6100,
    roof: 440,
    source: 'call',
    created: 9,
    surveyAt: 7,
    surveyed: 6,
    approved: 5,
    quoted: 4,
    accepted: 3,
    confirmed: 2,
    dispatched: 1,
    advancePct: 0.3,
    subsidyStatus: undefined,
    crew: 0,
  },
  {
    key: 'ali',
    name: 'Farhan Ali',
    phone: '+91 98450 33447',
    email: 'farhan.ali@gmail.com',
    address: '6, Shivajinagar, Russell Market Road',
    city: 'Bengaluru',
    pincode: '560051',
    kw: 3,
    type: 'on-grid',
    subsidy: true,
    bill: 3600,
    roof: 290,
    source: 'whatsapp',
    created: 5,
    surveyAt: 3,
    surveyed: 3,
    approved: 2,
    quoted: 2,
    accepted: 1,
    confirmed: 0,
    advancePct: 0.5,
    scannedCount: 4,
    subsidyStatus: 'documents_pending',
    crew: 1,
  },
  {
    key: 'menon',
    name: 'Meera Menon',
    phone: '+91 99860 22331',
    email: 'meera.menon@gmail.com',
    address: '77, JP Nagar 6th Phase',
    city: 'Bengaluru',
    pincode: '560078',
    kw: 2,
    type: 'on-grid',
    subsidy: true,
    bill: 2100,
    roof: 180,
    source: 'web',
    created: 4,
    surveyAt: 2,
    surveyed: 1,
    approved: 0,
    quoted: 0,
    subsidyStatus: 'documents_pending',
    crew: 2,
  },
  {
    key: 'kulkarni',
    name: 'Ashwin Kulkarni',
    phone: '+91 97400 88997',
    email: 'ashwin.k@gmail.com',
    address: '5, Sadashivanagar',
    city: 'Bengaluru',
    pincode: '560080',
    kw: 5,
    type: 'on-grid',
    subsidy: true,
    bill: 8200,
    roof: 600,
    source: 'web',
    created: 2,
    surveyAt: 1,
    surveyed: 0,
    subsidyStatus: undefined,
    crew: 3,
  },
  {
    key: 'narayan',
    name: 'Lakshmi Narayan',
    phone: '+91 90350 55664',
    email: 'lakshmi.n@gmail.com',
    address: '16, Basavanagudi, Gandhi Bazaar',
    city: 'Bengaluru',
    pincode: '560004',
    kw: 1,
    type: 'on-grid',
    subsidy: true,
    bill: 1500,
    roof: 120,
    source: 'call',
    created: 1,
    surveyAt: 0,
    subsidyStatus: undefined,
    crew: 0,
  },
  {
    key: 'bhat',
    name: 'Prakash Bhat',
    phone: '+91 98450 99002',
    email: 'prakash.bhat@gmail.com',
    address: '28, Vijayanagar 2nd Stage',
    city: 'Bengaluru',
    pincode: '560040',
    kw: 3,
    type: 'on-grid',
    subsidy: true,
    bill: 4100,
    roof: 330,
    source: 'whatsapp',
    created: 1,
    subsidyStatus: undefined,
    crew: 1,
  },
  {
    key: 'gupta',
    name: 'Neha Gupta',
    phone: '+91 99860 11009',
    email: 'neha.gupta@gmail.com',
    address: '63, HRBR Layout 2nd Block',
    city: 'Bengaluru',
    pincode: '560043',
    kw: 2,
    type: 'off-grid',
    subsidy: false,
    bill: 2700,
    roof: 200,
    source: 'web',
    created: 0,
    subsidyStatus: undefined,
    forceStatus: 'new',
  },
  {
    key: 'jain',
    name: 'Rahul Jain',
    phone: '+91 90080 44771',
    email: 'rahul.jain@gmail.com',
    address: 'Plot 8, Kengeri Satellite Town',
    city: 'Bengaluru',
    pincode: '560060',
    kw: 5,
    type: 'on-grid',
    subsidy: true,
    bill: 9100,
    roof: 640,
    source: 'web',
    created: 0,
    subsidyStatus: undefined,
    forceStatus: 'new',
  },
  {
    key: 'sridhar',
    name: 'Sridhar Rao',
    phone: '+91 98440 22335',
    email: 'sridhar.rao@gmail.com',
    address: '41, Yelahanka New Town',
    city: 'Bengaluru',
    pincode: '560064',
    kw: 4,
    type: 'on-grid',
    subsidy: true,
    bill: 6800,
    roof: 460,
    source: 'web',
    created: 24,
    surveyAt: 22,
    surveyed: 21,
    approved: 20,
    quoted: 19,
    lostReason: 'Went with a competitor quoting ₹18,000 less',
  },
];

const TECH_SEED: Array<{ name: string; role: Technician['role']; rate: number; skills: string[] }> = [
  { name: 'Ramesh Kumar', role: 'lead', rate: 450, skills: ['Rooftop', 'On-grid', 'Earthing'] },
  { name: 'Suresh Babu', role: 'lead', rate: 450, skills: ['Off-grid', 'Battery', 'Wiring'] },
  { name: 'Mahesh Patil', role: 'lead', rate: 450, skills: ['Industrial', 'HT panels', 'Commissioning'] },
  { name: 'Anil Verma', role: 'lead', rate: 450, skills: ['Rooftop', 'Structure', 'Safety'] },
  { name: 'Deepak Singh', role: 'technician', rate: 350, skills: ['Panel mounting', 'DC wiring'] },
  { name: 'Karthik R', role: 'technician', rate: 350, skills: ['Inverter setup', 'Net meter'] },
  { name: 'Imran Khan', role: 'technician', rate: 350, skills: ['Battery', 'MPPT'] },
  { name: 'Sanjay Gupta', role: 'technician', rate: 350, skills: ['Structure', 'Welding'] },
  { name: 'Ravi Shankar', role: 'technician', rate: 350, skills: ['AC wiring', 'Earthing'] },
  { name: 'Manoj Yadav', role: 'technician', rate: 350, skills: ['Panel mounting', 'Testing'] },
  { name: 'Vijay Kumar', role: 'technician', rate: 350, skills: ['Inverter setup', 'Service'] },
  { name: 'Prakash Jha', role: 'technician', rate: 350, skills: ['DC wiring', 'Safety'] },
  { name: 'Sunil Das', role: 'helper', rate: 250, skills: ['Material handling'] },
  { name: 'Ashok Reddy', role: 'helper', rate: 250, skills: ['Structure assembly'] },
  { name: 'Naveen Kumar', role: 'helper', rate: 250, skills: ['Site cleaning', 'Cable pulling'] },
];

const STAFF: Staff[] = [
  { id: 'U1', name: 'Rajesh Menon', role: 'director', phone: '+91 98450 10101', email: 'rajesh@sunpower.in' },
  { id: 'U2', name: 'Priya Sharma', role: 'sales', phone: '+91 98450 20202', email: 'priya@sunpower.in' },
  { id: 'U3', name: 'Arjun Nair', role: 'sales', phone: '+91 98450 30303', email: 'arjun@sunpower.in' },
  { id: 'U4', name: 'Vikram Rao', role: 'warehouse', phone: '+91 98450 40404', email: 'vikram@sunpower.in' },
  { id: 'U5', name: 'Sneha Iyer', role: 'support', phone: '+91 98450 50505', email: 'sneha@sunpower.in' },
];

const CREWS: string[][] = [
  ['T1', 'T5', 'T13'],
  ['T2', 'T6', 'T14'],
  ['T3', 'T7', 'T15'],
  ['T4', 'T8', 'T12'],
];

const SUBSIDY_DOCS = [
  'Aadhaar & PAN copy',
  'Latest electricity bill',
  'Roof ownership proof',
  'Cancelled cheque / bank details',
  'Signed subsidy application',
  'Net-meter agreement',
];

export function seed(): DB {
  const counters: Record<string, number> = {};
  const next = (key: string, prefix: string) => {
    counters[key] = (counters[key] ?? 0) + 1;
    return `${prefix}-${String(counters[key]).padStart(4, '0')}`;
  };

  const products: Product[] = CATALOG.map((c) => ({
    id: c.sku,
    sku: c.sku,
    name: c.name,
    category: c.category,
    unit: c.unit,
    costPrice: c.costPrice,
    sellPrice: c.sellPrice,
    serialized: c.serialized,
    warrantyMonths: c.warrantyMonths,
    stockQty: c.openingStock,
    reorderLevel: c.reorderLevel,
    active: true,
    notes: c.notes,
  }));

  const technicians: Technician[] = TECH_SEED.map((t, i) => ({
    id: `T${i + 1}`,
    name: t.name,
    phone: `+91 98${String(45000000 + i * 12345).slice(0, 8)}`,
    role: t.role,
    hourlyRate: t.rate,
    active: true,
    skills: t.skills,
  }));

  const serialCounters: Record<string, number> = {};
  const serials: SerialUnit[] = [];
  for (const p of products) {
    if (!p.serialized) continue;
    for (let i = 0; i < p.stockQty; i++) {
      serialCounters[p.sku] = (serialCounters[p.sku] ?? 0) + 1;
      const sn = `${p.sku}-${String(serialCounters[p.sku]).padStart(5, '0')}`;
      serials.push({ id: sn, serialNo: sn, productId: p.id, status: 'in_stock' });
    }
  }

  const customers: DB['customers'] = [];
  const enquiries: Enquiry[] = [];
  const surveys: Survey[] = [];
  const quotes: Quote[] = [];
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const installations: Installation[] = [];
  const invoices: Invoice[] = [];
  const subsidies: Subsidy[] = [];
  const expenses: Expense[] = [];
  const timesheets: Timesheet[] = [];
  const tickets: Ticket[] = [];

  const ordersByKey: Record<string, Order> = {};
  const serialsByOrder: Record<string, SerialUnit[]> = {};

  const allocateSerials = (order: Order, lines: BomLine[]) => {
    const allocated: SerialUnit[] = [];
    for (const line of lines) {
      if (!line.serialized) continue;
      const pool = serials.filter((s) => s.productId === line.sku && s.status === 'in_stock' && !s.orderId);
      if (pool.length < line.qty) throw new Error(`Seed stock short for ${line.sku}`);
      for (let i = 0; i < line.qty; i++) {
        const unit = pool[i];
        unit.status = 'reserved';
        unit.orderId = order.id;
        unit.customerId = order.customerId;
        unit.scanned = false;
        allocated.push(unit);
      }
    }
    serialsByOrder[order.id] = allocated;
    return allocated;
  };

  const applyPayment = (order: Order, amount: number, kind: PaymentKind, at: string, method: PaymentMethod) => {
    const payment: Payment = {
      id: `PAY-${String(payments.length + 1).padStart(4, '0')}`,
      ref: next('payment', 'PAY'),
      orderId: order.id,
      customerId: order.customerId,
      amount,
      method,
      kind,
      receivedAt: at,
      receivedBy: 'Priya Sharma',
    };
    payments.push(payment);
    order.paidAmount += amount;
    order.paymentStatus = order.paidAmount >= order.total - 1 ? 'paid' : order.paidAmount > 0 ? 'advance' : 'unpaid';
    const inv = invoices.find((i) => i.orderId === order.id);
    if (inv) {
      inv.paidAmount = order.paidAmount;
      inv.status = inv.paidAmount >= inv.total - 1 ? 'paid' : inv.status === 'draft' ? 'draft' : 'sent';
      if (inv.status === 'paid') inv.paidAt = at;
    }
    return payment;
  };

  for (const s of SCENARIOS) {
    const createdAt = iso(s.created);
    const customerId = next('customer', 'CUS');
    customers.push({
      id: customerId,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      city: s.city,
      pincode: s.pincode,
      createdAt,
    });

    const status: EnquiryStatus =
      s.forceStatus ??
      (s.paid != null || s.installed != null || s.confirmed != null
        ? 'won'
        : s.quoted != null
          ? 'quoted'
          : s.approved != null
            ? 'survey_approved'
            : s.surveyed != null
              ? 'surveyed'
              : s.surveyAt != null
                ? 'survey_scheduled'
                : s.bill
                  ? 'qualified'
                  : s.created > 1
                    ? 'contacted'
                    : 'new');

    const enquiry: Enquiry = {
      id: next('enquiry', 'ENQ'),
      ref: next('enquiryRef', 'ENQ'),
      customerId,
      customerName: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      city: s.city,
      pincode: s.pincode,
      requestedKw: s.kw,
      requestedType: s.type,
      wantsSubsidy: s.subsidy,
      monthlyBill: s.bill,
      roofAreaSqft: s.roof,
      gridConnectionOk: true,
      source: s.source,
      notes:
        s.source === 'web'
          ? 'Submitted through the website enquiry form.'
          : s.source === 'whatsapp'
            ? 'Came in on the sales WhatsApp number.'
            : 'Logged by the sales desk.',
      status: s.lostReason ? 'lost' : status,
      assignedTo: s.created % 2 === 0 ? 'Priya Sharma' : 'Arjun Nair',
      createdAt,
      qualifiedAt: s.bill ? iso(Math.max(s.created - 1, 0)) : undefined,
      lostReason: s.lostReason,
      nextActionAt: s.created <= 1 ? addDays(createdAt, 1) : undefined,
    };
    enquiries.push(enquiry);

    let survey: Survey | undefined;
    if (s.surveyAt != null) {
      const scheduledAt = iso(s.surveyAt, 11);
      survey = {
        id: next('survey', 'SUR'),
        ref: next('surveyRef', 'SUR'),
        enquiryId: enquiry.id,
        customerId,
        scheduledAt,
        completedAt: s.surveyed != null ? iso(s.surveyed, 15) : undefined,
        technicianId: CREWS[s.crew ?? 0][0],
        roofDirection: s.surveyed != null ? ['South', 'South-East', 'South-West', 'East'][s.created % 4] : undefined,
        tiltDegrees: s.surveyed != null ? 10 + (s.created % 6) : undefined,
        cableDistanceM: s.surveyed != null ? 18 + (s.created % 25) : undefined,
        shadowFreeAreaSqft: s.surveyed != null ? s.roof : undefined,
        structureType: s.surveyed != null ? (s.type === 'off-grid' ? 'RCC Roof' : 'RCC Roof') : undefined,
        findings:
          s.surveyed != null
            ? `Shadow-free area measured, ${s.kw} kW layout fits with ${s.kw * 2} panels per row. Cable route from roof to meter room is clear.`
            : undefined,
        recommendedKw: s.surveyed != null ? s.kw : undefined,
        recommendedType: s.surveyed != null ? s.type : undefined,
        status: s.approved != null ? 'approved' : s.surveyed != null ? 'completed' : 'scheduled',
        approvedBy: s.approved != null ? 'Rajesh Menon' : undefined,
        approvedAt: s.approved != null ? iso(s.approved, 17) : undefined,
      };
      surveys.push(survey);
    }

    let quote: Quote | undefined;
    if (s.quoted != null && survey) {
      const items = buildBom(s.kw, s.type);
      const totals = quoteTotals(items, 0, 0.138);
      const labour = estimatedLabourCost(s.kw);
      const margin = totals.subtotal - totals.costTotal - labour;
      const quotedAt = iso(s.quoted, 12);
      quote = {
        id: next('quote', 'QTN'),
        ref: next('quoteRef', 'QTN'),
        enquiryId: enquiry.id,
        surveyId: survey.id,
        customerId,
        customerName: s.name,
        capacityKw: s.kw,
        systemType: s.type,
        items,
        subtotal: totals.subtotal,
        discount: 0,
        taxRate: 0.138,
        taxAmount: totals.taxAmount,
        total: totals.total,
        costTotal: totals.costTotal,
        estLabourCost: labour,
        margin,
        marginPct: totals.subtotal ? Math.round((margin / totals.subtotal) * 100) : 0,
        subsidyExpected: s.subsidy ? subsidyFor(s.kw) : 0,
        status: s.accepted != null ? 'accepted' : s.lostReason ? 'rejected' : 'sent',
        validUntil: addDays(quotedAt, 15),
        createdAt: quotedAt,
        notes: s.subsidy ? `Subsidy of ₹${subsidyFor(s.kw).toLocaleString('en-IN')} handled by SunPower.` : undefined,
      };
      quotes.push(quote);
    }

    if (s.confirmed != null && quote) {
      const confirmedAt = iso(s.confirmed, 13);
      const orderId = next('order', 'ORD');
      const order: Order = {
        id: orderId,
        ref: next('orderRef', 'ORD'),
        quoteId: quote.id,
        customerId,
        customerName: s.name,
        capacityKw: s.kw,
        systemType: s.type,
        items: quote.items,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        costTotal: quote.costTotal,
        labourCost: 0,
        otherCost: 1500,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        status: 'confirmed',
        createdAt: confirmedAt,
        confirmedAt,
        scheduledDate: iso(Math.max(s.confirmed - 2, 0), 9),
        crewIds: CREWS[s.crew ?? 0],
        wantsSubsidy: s.subsidy,
        notes: 'Order confirmed after quote acceptance.',
      };
      orders.push(order);
      ordersByKey[s.key] = order;
      allocateSerials(order, order.items);

      const invoice: Invoice = {
        id: next('invoice', 'INV'),
        number: next('invoiceRef', 'INV'),
        type: 'installation',
        orderId: order.id,
        customerId,
        customerName: s.name,
        description: `${s.kw} kW ${s.type} solar installation — ${s.name}`,
        amount: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        paidAmount: 0,
        status: 'sent',
        issuedAt: confirmedAt,
        dueAt: addDays(confirmedAt, 15),
        createdAt: confirmedAt,
      };
      invoices.push(invoice);
      order.invoiceId = invoice.id;

      if (s.subsidy) {
        const subsidy: Subsidy = {
          id: next('subsidy', 'SUB'),
          orderId: order.id,
          customerId,
          customerName: s.name,
          scheme: 'PM Surya Ghar: Muft Bijli Yojana',
          applicationNo: `PSG-2026-${String(1000 + subsidies.length * 37)}`,
          capacityKw: s.kw,
          amount: subsidyFor(s.kw),
          status: s.subsidyStatus ?? 'documents_pending',
          docs: SUBSIDY_DOCS.map((name, i) => ({
            name,
            received: (s.subsidyStatus ?? 'documents_pending') !== 'documents_pending' ? true : i < 3,
          })),
          submittedAt:
            s.subsidyStatus && ['submitted', 'under_review', 'approved', 'received'].includes(s.subsidyStatus)
              ? iso(Math.max(s.confirmed - 3, 0))
              : undefined,
          approvedAt:
            s.subsidyStatus && ['approved', 'received'].includes(s.subsidyStatus)
              ? iso(Math.max(s.confirmed - 15, 0))
              : undefined,
          receivedAt: s.subsidyStatus === 'received' ? iso(Math.max(s.confirmed - 25, 0)) : undefined,
        };
        subsidies.push(subsidy);
        order.subsidyId = subsidy.id;
      }

      const installId = next('installation', 'JOB');
      const installation: Installation = {
        id: installId,
        ref: next('installationRef', 'JOB'),
        orderId: order.id,
        customerId,
        customerName: s.name,
        scheduledDate: iso(Math.max(s.confirmed - 2, 0), 9),
        crewIds: CREWS[s.crew ?? 0],
        systemSizeKw: s.kw,
        photos: [],
        status: 'scheduled',
        crewHours: [],
        address: `${s.address}, ${s.city} ${s.pincode}`,
      };
      installations.push(installation);
      order.installationId = installId;

      const advancePct = s.advancePct ?? 0.4;
      applyPayment(order, Math.round(order.total * advancePct), 'advance', confirmedAt, 'bank');

      if (s.scannedCount != null) {
        const units = serialsByOrder[order.id] ?? [];
        units.slice(0, s.scannedCount).forEach((u) => {
          u.scanned = true;
        });
      }

      if (s.dispatched != null) {
        const dispatchedAt = iso(s.dispatched, 8);
        order.status = 'dispatched';
        order.dispatchedAt = dispatchedAt;
        for (const unit of serialsByOrder[order.id] ?? []) {
          unit.status = 'dispatched';
          unit.dispatchedAt = dispatchedAt;
          unit.scanned = true;
          const product = products.find((p) => p.id === unit.productId)!;
          unit.warrantyStart = dispatchedAt;
          unit.warrantyEnd = addMonths(dispatchedAt, product.warrantyMonths);
          product.stockQty = Math.max(0, product.stockQty - 1);
        }
        for (const line of order.items.filter((l) => !l.serialized)) {
          const product = products.find((p) => p.id === line.sku);
          if (product) product.stockQty = Math.max(0, product.stockQty - line.qty);
        }
      }

      if (s.installed != null) {
        const installedAt = iso(s.installed, 16);
        const crew = CREWS[s.crew ?? 0];
        const hours = s.kw <= 2 ? 6 : s.kw <= 4 ? 8 : 10;
        installation.status = 'completed';
        installation.startedAt = iso(s.installed, 8);
        installation.finishedAt = installedAt;
        installation.panelsInstalled = Math.ceil((s.kw * 1000) / 550);
        installation.generationTestKw = Number((s.kw * 0.82).toFixed(1));
        installation.crewHours = crew.map((id) => ({ technicianId: id, hours }));
        installation.photos = [roofPhoto(`${s.name} — rooftop array`, '#bfdbfe'), roofPhoto('Inverter & DCDB mounted', '#fde68a')];
        installation.signatureDataUrl = signature(s.name);
        installation.signedByName = s.name;
        installation.signedAt = installedAt;
        installation.notes = 'Array commissioned, generation test completed, customer briefed on app monitoring.';
        const inverterSerial = (serialsByOrder[order.id] ?? []).find((u) => u.productId.startsWith('INV-'));
        installation.inverterSerial = inverterSerial?.serialNo;

        order.status = 'installed';
        order.installedAt = installedAt;
        order.labourCost = crew.reduce((sum, id) => {
          const tech = technicians.find((t) => t.id === id)!;
          return sum + tech.hourlyRate * hours;
        }, 0);

        for (const unit of serialsByOrder[order.id] ?? []) {
          unit.status = 'installed';
          unit.installedAt = installedAt;
        }

        for (const id of crew) {
          const tech = technicians.find((t) => t.id === id)!;
          timesheets.push({
            id: `TS-${String(timesheets.length + 1).padStart(4, '0')}`,
            technicianId: id,
            date: iso(s.installed),
            hours,
            rate: tech.hourlyRate,
            source: 'installation',
            refId: order.id,
            paid: s.installed > 20,
          });
        }
      }

      if (s.paid != null) {
        const paidAt = iso(s.paid, 15);
        const balance = order.total - order.paidAmount;
        if (balance > 0) applyPayment(order, balance, 'balance', paidAt, s.paid % 2 === 0 ? 'upi' : 'bank');
        order.status = 'closed';
        order.closedAt = paidAt;
      }

      if (s.invoiceIssued === false) {
        invoice.status = 'draft';
      }
    }
  }

  // ---- Service tickets -------------------------------------------------
  interface TicketSeed {
    key: string;
    fault: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
    reported: number;
    sku: string;
    hours: number;
    parts?: Array<{ sku: string; qty: number }>;
    diagnosis?: string;
    resolution?: string;
    technician: string;
  }

  const TICKET_SEEDS: TicketSeed[] = [
    {
      key: 'shetty',
      fault: 'E-03 Grid Fault',
      description: 'Inverter showing fault code E-03 and zero power since last night. Factory load is down to grid bypass only.',
      priority: 'high',
      status: 'open',
      reported: 3,
      sku: 'INV-OG-5',
      hours: 0,
      technician: 'T3',
    },
    {
      key: 'iyer',
      fault: 'Fan noise / derating',
      description: 'Inverter fan running loud and output dropping to 60% in the afternoon heat.',
      priority: 'medium',
      status: 'resolved',
      reported: 5,
      sku: 'INV-OG-3',
      hours: 1.5,
      diagnosis: 'Cooling fan bearing worn out, heatsink clogged with dust.',
      resolution: 'Fan module replaced under warranty, heatsink cleaned, output tested at full capacity.',
      technician: 'T5',
    },
    {
      key: 'desai',
      fault: 'Wi-Fi dongle offline',
      description: 'Monitoring app shows the plant offline for four days. Customer restarted the dongle with no change.',
      priority: 'medium',
      status: 'in_progress',
      reported: 2,
      sku: 'INV-OG-2',
      hours: 0,
      technician: 'T6',
    },
    {
      key: 'gowda',
      fault: 'Battery BMS alarm',
      description: 'Off-grid battery bank showing BMS over-temperature alarm in the evening.',
      priority: 'high',
      status: 'confirmed',
      reported: 9,
      sku: 'BAT-LI-512',
      hours: 2,
      diagnosis: 'Battery compartment ventilation blocked, one module running hot.',
      resolution: 'Ventilation restored, firmware updated, bank balanced and load tested for two hours.',
      technician: 'T7',
    },
    {
      key: 'hegde',
      fault: 'Inverter dead',
      description: 'Inverter completely dead, no display. Customer reports burning smell.',
      priority: 'high',
      status: 'resolved',
      reported: 4,
      sku: 'INV-OG-3',
      hours: 3,
      parts: [{ sku: 'INV-OG-3', qty: 1 }],
      diagnosis: 'DC surge damaged the inverter control board. Unit out of warranty.',
      resolution: 'Replaced inverter with a new unit, installed additional surge protection, tested generation.',
      technician: 'T2',
    },
    {
      key: 'patel',
      fault: 'AC wiring loose',
      description: 'ACDB terminal heating and flickering power at the meter.',
      priority: 'medium',
      status: 'closed',
      reported: 8,
      sku: 'INV-OG-2',
      hours: 1,
      diagnosis: 'Loose neutral termination at the ACDB.',
      resolution: 'Terminals re-crimped and torqued, thermal check done.',
      technician: 'T9',
    },
    {
      key: 'krishnan',
      fault: 'Zero generation at noon',
      description: 'App shows zero generation between 12 and 2 pm even on clear days.',
      priority: 'medium',
      status: 'assigned',
      reported: 1,
      sku: 'INV-OG-3',
      hours: 0,
      technician: 'T10',
    },
  ];

  for (const t of TICKET_SEEDS) {
    const order = ordersByKey[t.key];
    if (!order) continue;
    const serial = (serialsByOrder[order.id] ?? []).find((u) => u.productId === t.sku) ??
      (serialsByOrder[order.id] ?? []).find((u) => u.productId.startsWith('INV-'));
    if (!serial) continue;
    const reportedAt = iso(t.reported, 9);
    const warrantyEnd = serial.warrantyEnd;
    const inWarranty = warrantyEnd ? new Date(warrantyEnd).getTime() > NOW : false;
    const slaHours = t.priority === 'high' ? 24 : t.priority === 'medium' ? 48 : 72;
    const parts: TicketPart[] = (t.parts ?? []).map((p) => {
      const prod = products.find((x) => x.id === p.sku)!;
      return { sku: prod.sku, name: prod.name, qty: p.qty, unitPrice: prod.sellPrice, unitCost: prod.costPrice };
    });
    const labourRate = 450;
    const visitCharge = inWarranty ? 0 : 500;
    const partsTotal = parts.reduce((sum, p) => sum + p.unitPrice * p.qty, 0);
    const labourTotal = Math.round(t.hours * labourRate);
    const chargeable = !inWarranty;
    const totalCharge = chargeable ? partsTotal + labourTotal + visitCharge : 0;

    const ticket: Ticket = {
      id: next('ticket', 'TKT'),
      ref: next('ticketRef', 'TKT'),
      customerId: order.customerId,
      customerName: order.customerName,
      phone: customers.find((c) => c.id === order.customerId)?.phone ?? '',
      address: installations.find((i) => i.orderId === order.id)?.address ?? '',
      orderId: order.id,
      serialId: serial.id,
      serialNo: serial.serialNo,
      productId: serial.productId,
      faultCode: t.fault,
      description: t.description,
      priority: t.priority,
      status: t.status,
      reportedAt,
      assignedTo: t.technician,
      warrantyStatus: inWarranty ? 'in_warranty' : 'out_of_warranty',
      warrantyEnd,
      chargeable,
      diagnosis: t.diagnosis,
      resolution: t.resolution,
      parts,
      labourHours: t.hours,
      labourRate,
      visitCharge,
      partsTotal,
      labourTotal,
      totalCharge,
      warrantyCost: inWarranty
        ? parts.reduce((sum, p) => sum + p.unitCost * p.qty, 0) + labourTotal
        : 0,
      resolvedAt: t.status === 'resolved' || t.status === 'confirmed' || t.status === 'closed' ? iso(t.reported - 1, 16) : undefined,
      confirmedAt: t.status === 'confirmed' || t.status === 'closed' ? iso(t.reported - 2, 11) : undefined,
      slaDueAt: new Date(new Date(reportedAt).getTime() + slaHours * 3_600_000).toISOString(),
      photos: [],
    };

    if (chargeable && (t.status === 'resolved' || t.status === 'confirmed' || t.status === 'closed')) {
      const inv: Invoice = {
        id: next('invoice', 'INV'),
        number: next('invoiceRef', 'INV'),
        type: 'service',
        ticketId: ticket.id,
        customerId: order.customerId,
        customerName: order.customerName,
        description: `Service call ${ticket.ref} — ${t.fault}`,
        amount: totalCharge,
        taxAmount: Math.round(totalCharge * 0.18),
        total: totalCharge + Math.round(totalCharge * 0.18),
        paidAmount: 0,
        status: 'sent',
        issuedAt: ticket.resolvedAt,
        dueAt: ticket.resolvedAt ? addDays(ticket.resolvedAt, 7) : undefined,
        createdAt: ticket.resolvedAt ?? reportedAt,
      };
      invoices.push(inv);
      ticket.invoiceId = inv.id;
      if (t.status !== 'resolved') {
        inv.status = 'paid';
        inv.paidAmount = inv.total;
        inv.paidAt = iso(t.reported - 1, 18);
        payments.push({
          id: `PAY-${String(payments.length + 1).padStart(4, '0')}`,
          ref: next('payment', 'PAY'),
          ticketId: ticket.id,
          customerId: order.customerId,
          amount: inv.total,
          method: 'upi',
          kind: 'service',
          receivedAt: inv.paidAt,
          receivedBy: 'Sneha Iyer',
        });
      }
    }

    if (t.hours > 0) {
      timesheets.push({
        id: `TS-${String(timesheets.length + 1).padStart(4, '0')}`,
        technicianId: t.technician,
        date: ticket.resolvedAt ?? reportedAt,
        hours: t.hours,
        rate: labourRate,
        source: 'service',
        refId: ticket.id,
        paid: t.reported > 20,
      });
    }

    tickets.push(ticket);
  }

  // ---- Expenses --------------------------------------------------------
  const expenseSeed: Array<[number, Expense['category'], string, number, string?]> = [
    [78, 'stock', 'Panel stock — 120 × 550W modules', 1380000, 'Waaree Distributors'],
    [66, 'stock', 'Inverter stock — 40 units mixed capacity', 620000, 'Growatt India'],
    [55, 'transport', 'Truck hire for Peenya factory delivery', 8500, 'Sharma Logistics'],
    [45, 'stock', 'Battery stock — 12 × 5.12 kWh', 1104000, 'Deye Energy'],
    [40, 'marketing', 'Google Ads — rooftop solar campaign', 24000, 'Google'],
    [34, 'office', 'Office rent — August', 35000, 'Prestige Properties'],
    [30, 'salaries', 'Field staff salaries — August', 185000, 'SunPower payroll'],
    [20, 'stock', 'Mounting structure stock — 200 sets', 580000, 'AluSteel Fabricators'],
    [12, 'transport', 'Installation transport — 6 sites', 9500, 'Sharma Logistics'],
    [8, 'office', 'Office rent — September', 35000, 'Prestige Properties'],
    [6, 'stock', 'Cable, MC4 and earthing consumables', 96000, 'Polycab Dealer'],
    [2, 'marketing', 'WhatsApp business API and leaflets', 7500, 'Meta'],
  ];
  for (const [days, category, description, amount, vendor] of expenseSeed) {
    expenses.push({
      id: next('expense', 'EXP'),
      ref: next('expenseRef', 'EXP'),
      date: iso(days),
      category,
      description,
      amount,
      vendor,
    });
  }
  // Job-specific transport costs
  for (const order of orders) {
    if (order.installedAt) {
      expenses.push({
        id: next('expense', 'EXP'),
        ref: next('expenseRef', 'EXP'),
        date: order.installedAt,
        category: 'transport',
        description: `Site transport — ${order.customerName}`,
        amount: 1500,
        vendor: 'Sharma Logistics',
        orderId: order.id,
      });
    }
  }

  const settings = { companyName: 'SunPower Solutions', taxRate: 0.138, currency: 'INR' };

  return {
    products,
    serials,
    customers,
    enquiries,
    surveys,
    quotes,
    orders,
    payments,
    installations,
    tickets,
    invoices,
    subsidies,
    expenses,
    technicians,
    timesheets,
    staff: STAFF,
    accounts: demoAccounts(customers),
    sessions: [],
    counters,
    settings,
  };
}
