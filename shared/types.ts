export type SystemType = 'on-grid' | 'off-grid' | 'hardware';
export type CapacityKw = 1 | 2 | 3 | 4 | 5;
export type Role = 'director' | 'sales' | 'warehouse' | 'crew' | 'support';

export type ProductCategory =
  | 'panel'
  | 'inverter'
  | 'battery'
  | 'controller'
  | 'structure'
  | 'wiring'
  | 'bos'
  | 'service';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  costPrice: number;
  sellPrice: number;
  serialized: boolean;
  warrantyMonths: number;
  stockQty: number;
  reorderLevel: number;
  active: boolean;
  notes?: string;
}

export type SerialStatus = 'in_stock' | 'reserved' | 'dispatched' | 'installed' | 'returned' | 'faulty';

export interface SerialUnit {
  id: string;
  serialNo: string;
  productId: string;
  status: SerialStatus;
  orderId?: string;
  customerId?: string;
  scanned?: boolean;
  dispatchedAt?: string;
  installedAt?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  createdAt: string;
  notes?: string;
}

export type EnquirySource = 'web' | 'whatsapp' | 'call' | 'walk-in';
export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'survey_scheduled'
  | 'surveyed'
  | 'survey_approved'
  | 'quoted'
  | 'won'
  | 'lost';

export interface Enquiry {
  id: string;
  ref: string;
  customerId: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  requestedKw: CapacityKw;
  requestedType: SystemType;
  wantsSubsidy: boolean;
  monthlyBill?: number;
  roofAreaSqft?: number;
  gridConnectionOk?: boolean;
  source: EnquirySource;
  notes?: string;
  status: EnquiryStatus;
  assignedTo?: string;
  createdAt: string;
  qualifiedAt?: string;
  lostReason?: string;
  nextActionAt?: string;
}

export type SurveyStatus = 'scheduled' | 'completed' | 'approved' | 'rejected';

export interface Survey {
  id: string;
  ref: string;
  enquiryId: string;
  customerId: string;
  scheduledAt: string;
  completedAt?: string;
  technicianId?: string;
  roofDirection?: string;
  tiltDegrees?: number;
  cableDistanceM?: number;
  shadowFreeAreaSqft?: number;
  structureType?: string;
  findings?: string;
  recommendedKw?: CapacityKw;
  recommendedType?: SystemType;
  status: SurveyStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface BomLine {
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  total: number;
  totalCost: number;
  serialized: boolean;
  warrantyMonths: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  ref: string;
  enquiryId: string;
  surveyId?: string;
  customerId: string;
  customerName: string;
  capacityKw: CapacityKw;
  systemType: SystemType;
  items: BomLine[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  costTotal: number;
  estLabourCost: number;
  margin: number;
  marginPct: number;
  subsidyExpected: number;
  status: QuoteStatus;
  validUntil: string;
  createdAt: string;
  notes?: string;
}

export type OrderStatus = 'requested' | 'confirmed' | 'dispatched' | 'installed' | 'closed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'advance' | 'paid';

export interface Order {
  id: string;
  ref: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  capacityKw: CapacityKw;
  systemType: SystemType;
  items: BomLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  costTotal: number;
  labourCost: number;
  otherCost: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  confirmedAt?: string;
  dispatchedAt?: string;
  installedAt?: string;
  closedAt?: string;
  scheduledDate?: string;
  crewIds: string[];
  installationId?: string;
  invoiceId?: string;
  subsidyId?: string;
  wantsSubsidy: boolean;
  notes?: string;
  channel?: 'staff' | 'customer';
  requestedBy?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'card' | 'cheque';
export type PaymentKind = 'advance' | 'balance' | 'service' | 'subsidy';

export interface Payment {
  id: string;
  ref: string;
  orderId?: string;
  ticketId?: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  reference?: string;
  receivedAt: string;
  receivedBy?: string;
}

export type InstallationStatus = 'scheduled' | 'in_progress' | 'completed';

export interface CrewHour {
  technicianId: string;
  hours: number;
}

export interface Installation {
  id: string;
  ref: string;
  orderId: string;
  customerId: string;
  customerName: string;
  scheduledDate: string;
  crewIds: string[];
  startedAt?: string;
  finishedAt?: string;
  systemSizeKw: CapacityKw;
  panelsInstalled?: number;
  generationTestKw?: number;
  inverterSerial?: string;
  notes?: string;
  photos: string[];
  signatureDataUrl?: string;
  signedByName?: string;
  signedAt?: string;
  status: InstallationStatus;
  crewHours: CrewHour[];
  address: string;
}

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'confirmed' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type WarrantyStatus = 'in_warranty' | 'out_of_warranty' | 'unknown';

export interface TicketPart {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface Ticket {
  id: string;
  ref: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  orderId?: string;
  serialId?: string;
  serialNo?: string;
  productId?: string;
  faultCode?: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  reportedAt: string;
  assignedTo?: string;
  warrantyStatus: WarrantyStatus;
  warrantyEnd?: string;
  chargeable: boolean;
  diagnosis?: string;
  resolution?: string;
  parts: TicketPart[];
  labourHours: number;
  labourRate: number;
  visitCharge: number;
  partsTotal: number;
  labourTotal: number;
  totalCharge: number;
  warrantyCost: number;
  resolvedAt?: string;
  confirmedAt?: string;
  invoiceId?: string;
  slaDueAt: string;
  photos: string[];
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type InvoiceType = 'installation' | 'service';

export interface Invoice {
  id: string;
  number: string;
  type: InvoiceType;
  orderId?: string;
  ticketId?: string;
  customerId: string;
  customerName: string;
  description: string;
  amount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt?: string;
  dueAt?: string;
  paidAt?: string;
  createdAt: string;
}

export type SubsidyStatus =
  | 'documents_pending'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'received'
  | 'rejected';

export interface SubsidyDoc {
  name: string;
  received: boolean;
}

export interface Subsidy {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  scheme: string;
  applicationNo?: string;
  capacityKw: CapacityKw;
  amount: number;
  status: SubsidyStatus;
  docs: SubsidyDoc[];
  submittedAt?: string;
  approvedAt?: string;
  receivedAt?: string;
  notes?: string;
}

export type ExpenseCategory = 'stock' | 'salaries' | 'transport' | 'office' | 'marketing' | 'other';

export interface Expense {
  id: string;
  ref: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vendor?: string;
  orderId?: string;
}

export type TechRole = 'lead' | 'technician' | 'helper';

export interface Technician {
  id: string;
  name: string;
  phone: string;
  role: TechRole;
  hourlyRate: number;
  active: boolean;
  skills: string[];
}

export type TimesheetSource = 'installation' | 'service';

export interface Timesheet {
  id: string;
  technicianId: string;
  date: string;
  hours: number;
  rate: number;
  source: TimesheetSource;
  refId: string;
  paid: boolean;
  expenseId?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: Role;
  phone: string;
  email: string;
}

export interface Settings {
  companyName: string;
  taxRate: number;
  currency: string;
}

export type AccountRole = 'admin' | 'customer';

export interface Account {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  customerId?: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  token: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DB {
  accounts: Account[];
  sessions: Session[];
  products: Product[];
  serials: SerialUnit[];
  customers: Customer[];
  enquiries: Enquiry[];
  surveys: Survey[];
  quotes: Quote[];
  orders: Order[];
  payments: Payment[];
  installations: Installation[];
  tickets: Ticket[];
  invoices: Invoice[];
  subsidies: Subsidy[];
  expenses: Expense[];
  technicians: Technician[];
  timesheets: Timesheet[];
  staff: Staff[];
  counters: Record<string, number>;
  settings: Settings;
}
