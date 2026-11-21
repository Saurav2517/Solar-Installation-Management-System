export type UserRole = 'SALES' | 'WAREHOUSE' | 'TECHNICIAN' | 'SUPPORT' | 'DIRECTOR';

export type SystemType = 'ON_GRID' | 'OFF_GRID';
export type CapacityKw = 1 | 2 | 3 | 4 | 5;

export type InquiryStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'SURVEY_SCHEDULED'
  | 'SURVEY_APPROVED'
  | 'REJECTED';

export interface SalesQualification {
  shadowFreeAreaSqFt: number;
  monthlyBillInr: number;
  gridSuitability: 'SUITABLE' | 'NEEDS_UPGRADE' | 'UNSUITABLE';
  notes?: string;
}

export interface SiteSurvey {
  technicianName: string;
  roofDirection: 'SOUTH' | 'SOUTH_EAST' | 'SOUTH_WEST' | 'EAST' | 'WEST';
  tiltAngleDeg: number;
  cableDistanceM: number;
  surveyDate: string;
  approved: boolean;
  notes?: string;
}

export interface Inquiry {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  capacityKw: CapacityKw;
  systemType: SystemType;
  subsidyRequested: boolean;
  status: InquiryStatus;
  createdAt: string;
  salesCheck?: SalesQualification;
  survey?: SiteSurvey;
}

export type BomCategory =
  | 'PANEL'
  | 'INVERTER'
  | 'BATTERY'
  | 'CHARGE_CONTROLLER'
  | 'MOUNTING_STAND'
  | 'WIRING_SAFETY'
  | 'SERVICE';

export interface BomItem {
  id: string;
  name: string;
  category: BomCategory;
  quantity: number;
  unitCostInr: number;
  unitPriceInr: number;
  requiresSerial: boolean;
  warrantyYears: number;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'DISPATCHED' | 'INSTALLED';
export type SubsidyStatus = 'NOT_APPLICABLE' | 'PENDING_DOCS' | 'SUBMITTED' | 'DISBURSED';

export interface SolarProject {
  id: string;
  inquiryId: string;
  customerName: string;
  phone: string;
  address: string;
  capacityKw: CapacityKw;
  systemType: SystemType;
  subsidyRequested: boolean;
  subsidyStatus: SubsidyStatus;
  bomItems: BomItem[];
  totalRevenueInr: number;
  hardwareCostInr: number;
  advancePaidInr: number;
  paymentStatus: 'UNPAID' | 'ADVANCE_PAID' | 'FULLY_PAID';
  invoiceNumber: string;
  status: QuoteStatus;
  assignedCrew?: string;
  scheduledDate?: string;
  technicianHours: number;
  technicianHourlyRateInr: number;
  createdAt: string;
}

export interface SerialUnit {
  id: string;
  projectId: string;
  customerName: string;
  serialNumber: string;
  itemName: string;
  category: BomCategory;
  dispatchedAt: string;
  deliveredAt?: string;
  warrantyYears: number;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
}

export interface InstallationReport {
  id: string;
  projectId: string;
  technicianName: string;
  startTime: string;
  finishTime: string;
  confirmedCapacityKw: CapacityKw;
  powerGeneratedKw: number;
  photoDataUrls: string[];
  customerSignatureUrl: string;
  completedAt: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED_CONFIRMED';

export interface ServiceTicket {
  id: string;
  projectId: string;
  customerName: string;
  phone: string;
  serialNumber: string;
  itemName: string;
  faultDescription: string;
  underWarranty: boolean;
  partsCostInr: number;
  labourCostInr: number;
  billedAmountInr: number;
  status: TicketStatus;
  createdAt: string;
}
