import type {
  Customer,
  Enquiry,
  Expense,
  Installation,
  Invoice,
  Order,
  OrderStatus,
  Payment,
  Product,
  Quote,
  SerialUnit,
  Staff,
  Subsidy,
  Survey,
  SystemType,
  Technician,
  Ticket,
  Timesheet,
} from '../../shared/types';

export interface Meta {
  staff: Staff[];
  technicians: Technician[];
  products: Product[];
  customers: Customer[];
  settings: { companyName: string; taxRate: number; currency: string };
}

export interface DashboardData {
  kpis: {
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    cashCollectedMonth: number;
    grossProfitMonth: number;
    revenueBookedMonth: number;
    jobsCompletedMonth: number;
    avgMarginPct: number;
    receivables: number;
    pipeline: number;
    openTickets: number;
    overdueTickets: number;
    jobsInProgress: number;
    subsidyPending: number;
    lowStockCount: number;
    newEnquiries: number;
  };
  revenueSeries: Array<{ date: string; label: string; revenue: number; jobs: number }>;
  pipelineCounts: { new: number; qualified: number; survey: number; quoted: number; won: number };
  todayInstallations: Array<{
    id: string;
    ref: string;
    customerName: string;
    systemSizeKw: number;
    crew: Array<string | undefined>;
    status: string;
    address: string;
  }>;
  todaySurveys: Array<{ id: string; ref: string; customerName: string; technician?: string; scheduledAt: string }>;
  alerts: Array<{ level: 'danger' | 'warn' | 'info'; title: string; detail: string; link: string }>;
  recentEnquiries: Enquiry[];
  openTickets: Array<Ticket & { technicianName?: string; overdue: boolean }>;
  unfinished: Array<{
    id: string;
    ref: string;
    customerName: string;
    status: string;
    steps: Array<{ key: string; label: string; done: boolean }>;
  }>;
}

export interface EnquiryRow extends Enquiry {
  ageDays: number;
  surveyStatus?: string;
  surveyId?: string;
  quoteRef?: string;
  quoteTotal?: number;
  quoteStatus?: string;
  orderRef?: string;
}

export interface EnquiriesData {
  enquiries: EnquiryRow[];
  staff: Staff[];
  technicians: Technician[];
}

export interface EnquiryDetailData {
  enquiry: Enquiry;
  survey?: Survey;
  quote?: Quote;
  order?: Order;
  technician?: string;
  technicians: Technician[];
  staff: Staff[];
}

export interface SurveyRow extends Survey {
  customerName?: string;
  phone?: string;
  technicianName?: string;
  enquiryStatus?: string;
}

export interface SurveyData {
  surveys: SurveyRow[];
  technicians: Technician[];
}

export interface QuoteRow extends Quote {
  enquiryRef?: string;
  orderRef?: string;
}

export interface QuoteDetailData {
  quote: Quote;
  enquiry?: Enquiry;
  survey?: Survey;
  order?: Order;
  products: Product[];
  technicians: Technician[];
}

export interface OrderRow extends Order {
  balance: number;
  profit: number;
  stepsDone: number;
  stepsTotal: number;
  serialsTotal: number;
  serialsScanned: number;
  installationStatus?: string;
  invoiceStatus?: string;
}

export interface OrderDetailData {
  order: Order;
  customer?: Customer;
  quote?: Quote;
  installation?: Installation;
  invoice?: Invoice;
  subsidy?: Subsidy;
  serials: SerialUnit[];
  payments: Payment[];
  steps: Array<{ key: string; label: string; done: boolean }>;
  profit: number;
  marginPct: number;
  technicians: Technician[];
}

export interface DispatchQueueItem {
  order: Order;
  customer?: Customer;
  serials: Array<SerialUnit & { productName?: string }>;
  scanned: number;
  total: number;
}

export interface InstallationRow extends Installation {
  crewNames: string[];
  orderRef?: string;
  orderStatus?: string;
}

export interface InstallationsData {
  installations: InstallationRow[];
}

export interface InstallationDetailData {
  installation: Installation;
  order?: Order;
  customer?: Customer;
  serials: SerialUnit[];
  technicians: Technician[];
  crewNames: string[];
}

export interface SerialRow extends SerialUnit {
  productName?: string;
  customerName?: string;
  orderRef?: string;
  inWarranty?: boolean;
}

export interface InventoryData {
  products: Array<Product & { availableSerials: number; low: boolean }>;
  serials: SerialRow[];
  stats: { inStock: number; dispatched: number; installed: number; value: number };
}

export interface TicketRow extends Ticket {
  technicianName?: string;
  overdue: boolean;
  invoiceNumber?: string;
}

export interface TicketsData {
  tickets: TicketRow[];
  technicians: Technician[];
  customers: Customer[];
}

export interface TicketDetailData {
  ticket: Ticket;
  order?: Order;
  product?: Product;
  serial?: SerialUnit;
  invoice?: Invoice;
  technicianName?: string;
  warrantyActive: boolean;
  overdue: boolean;
  technicians: Technician[];
  products: Product[];
}

export interface BillingData {
  invoices: Array<Invoice & { due: number }>;
  subsidies: Array<Subsidy & { docsReceived: number; docsTotal: number; orderRef?: string }>;
  expenses: Expense[];
  payments: Array<Payment & { customerName?: string }>;
  summary: {
    invoiced: number;
    collected: number;
    outstanding: number;
    subsidyPending: number;
    subsidyReceived: number;
    expenses: number;
  };
}

export interface ReportsData {
  range: { from: string; to: string };
  totals: {
    revenue: number;
    partsCost: number;
    labourCost: number;
    otherCost: number;
    profit: number;
    jobs: number;
    collected: number;
    due: number;
    operatingExpenses: number;
    stockPurchases: number;
    netProfit: number;
  };
  jobRows: Array<{
    id: string;
    ref: string;
    customerName: string;
    capacityKw: number;
    systemType: SystemType;
    status: string;
    installedAt?: string;
    revenue: number;
    partsCost: number;
    labourCost: number;
    otherCost: number;
    expenses: number;
    profit: number;
    marginPct: number;
    collected: number;
    due: number;
  }>;
  monthlySeries: Array<{ month: string; label: string; revenue: number; profit: number; jobs: number }>;
  unfinished: Array<{
    id: string;
    ref: string;
    customerName: string;
    status: string;
    value: number;
    due: number;
    pendingSteps: string[];
  }>;
  openRepairs: Array<{
    id: string;
    ref: string;
    customerName: string;
    fault?: string;
    priority: string;
    status: string;
    warrantyStatus: string;
    overdue: boolean;
    reportedAt: string;
    technicianName?: string;
  }>;
  capacityMix: Array<{ kw: number; count: number; revenue: number }>;
  technicianPayroll: Array<{ id: string; name: string; role: string; hours: number; amount: number; jobs: number }>;
  receivables: Array<{ id: string; ref: string; customerName: string; due: number; ageDays: number; status: string }>;
  subsidy: { pending: number; received: number; files: number };
}

export interface TechniciansData {
  technicians: Array<
    Technician & {
      totalHours: number;
      unpaidHours: number;
      unpaidAmount: number;
      unpaidJobs: number;
    }
  >;
  timesheets: Array<Timesheet & { technicianName?: string }>;
}

export interface WarrantyLookup {
  found: boolean;
  unit?: SerialUnit;
  product?: Product;
  customer?: Customer;
  order?: Order;
  inWarranty?: boolean;
  warrantyStatus?: 'in_warranty' | 'out_of_warranty' | 'unknown';
}

export interface CustomerOrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  warrantyMonths: number;
}

export interface CustomerOrder {
  id: string;
  ref: string;
  status: OrderStatus;
  capacityKw: number;
  systemType: SystemType;
  items: CustomerOrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  createdAt: string;
  confirmedAt?: string;
  scheduledDate?: string;
  dispatchedAt?: string;
  installedAt?: string;
  wantsSubsidy: boolean;
  notes?: string;
  steps: Array<{ key: string; label: string; done: boolean }>;
  invoiceNumber?: string;
  invoiceStatus?: string;
  subsidyStatus?: string;
  subsidyAmount?: number;
}

export interface CustomerOrderView {
  order: CustomerOrder;
  steps: Array<{ key: string; label: string; done: boolean }>;
  invoice?: {
    number: string;
    amount: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    status: string;
    issuedAt?: string;
    dueAt?: string;
  };
  subsidy?: {
    scheme: string;
    applicationNo?: string;
    amount: number;
    status: string;
    docs: Array<{ name: string; received: boolean }>;
  };
  installation?: { ref: string; scheduledDate: string; status: string; crewNames: string[] };
}

export interface QuotePreview {
  items: Quote['items'];
  subtotal: number;
  costTotal: number;
  taxAmount: number;
  total: number;
  taxable: number;
  subsidy: number;
  products: Product[];
}
