import type {
  BomItem,
  CapacityKw,
  Inquiry,
  InstallationReport,
  SerialUnit,
  ServiceTicket,
  SolarProject,
  SystemType,
} from '../types/solar';

const STORAGE_KEY = 'sunpower_sims_state_v1';

export interface AppDatabase {
  inquiries: Inquiry[];
  projects: SolarProject[];
  serialUnits: SerialUnit[];
  installationReports: InstallationReport[];
  tickets: ServiceTicket[];
}

export function generateAutoBom(capacityKw: CapacityKw, systemType: SystemType): BomItem[] {
  const panelCount = capacityKw * 2;
  const items: BomItem[] = [
    {
      id: `bom-panel-${capacityKw}`,
      name: `Mono PERC Solar Panel 500W (Set of ${panelCount})`,
      category: 'PANEL',
      quantity: panelCount,
      unitCostInr: 12500,
      unitPriceInr: 16000,
      requiresSerial: true,
      warrantyYears: 20,
    },
    {
      id: `bom-inv-${capacityKw}`,
      name: `${capacityKw} kW ${systemType === 'ON_GRID' ? 'On-Grid' : 'Hybrid Off-Grid'} Solar Inverter`,
      category: 'INVERTER',
      quantity: 1,
      unitCostInr: 22000 + capacityKw * 6000,
      unitPriceInr: 28000 + capacityKw * 8500,
      requiresSerial: true,
      warrantyYears: 2,
    },
    {
      id: `bom-ctrl-${capacityKw}`,
      name: 'MPPT Battery Charge Controller',
      category: 'CHARGE_CONTROLLER',
      quantity: 1,
      unitCostInr: 5500,
      unitPriceInr: 8000,
      requiresSerial: true,
      warrantyYears: 2,
    },
    {
      id: `bom-stand-${capacityKw}`,
      name: 'Galvanized Metal Mounting Stands & Clamps',
      category: 'MOUNTING_STAND',
      quantity: capacityKw,
      unitCostInr: 4000,
      unitPriceInr: 6000,
      requiresSerial: false,
      warrantyYears: 5,
    },
    {
      id: `bom-wire-${capacityKw}`,
      name: 'ACDB/DCDB Wiring Boxes, Switches, DC Cables & Safety Earthing Kit',
      category: 'WIRING_SAFETY',
      quantity: 1,
      unitCostInr: 9500 + capacityKw * 1500,
      unitPriceInr: 14000 + capacityKw * 2000,
      requiresSerial: false,
      warrantyYears: 2,
    },
    {
      id: `bom-install-${capacityKw}`,
      name: 'Site Installation, Commissioning & Testing Service',
      category: 'SERVICE',
      quantity: 1,
      unitCostInr: 7000 + capacityKw * 1500,
      unitPriceInr: 12000 + capacityKw * 2500,
      requiresSerial: false,
      warrantyYears: 1,
    },
  ];

  if (systemType === 'OFF_GRID') {
    items.splice(2, 0, {
      id: `bom-bat-${capacityKw}`,
      name: `Lithium-Ion Solar Storage Battery (${capacityKw * 2} kWh Bank)`,
      category: 'BATTERY',
      quantity: Math.max(1, Math.ceil(capacityKw / 2)),
      unitCostInr: 36000,
      unitPriceInr: 48000,
      requiresSerial: true,
      warrantyYears: 2,
    });
  }

  return items;
}

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

const seedDb = (): AppDatabase => {
  const bom3KwOnGrid = generateAutoBom(3, 'ON_GRID');
  const bom5KwOffGrid = generateAutoBom(5, 'OFF_GRID');

  const sumPrice = (items: BomItem[]) =>
    items.reduce((acc, item) => acc + item.quantity * item.unitPriceInr, 0);
  const sumCost = (items: BomItem[]) =>
    items.reduce((acc, item) => acc + item.quantity * item.unitCostInr, 0);

  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

  const thirtyMonthsAgo = new Date();
  thirtyMonthsAgo.setMonth(thirtyMonthsAgo.getMonth() - 30);

  return {
    inquiries: [
      {
        id: 'INQ-1001',
        customerName: 'Rajesh Sharma',
        phone: '9876543210',
        address: 'Model Town, Jalandhar, Punjab',
        capacityKw: 3,
        systemType: 'ON_GRID',
        subsidyRequested: true,
        status: 'NEW',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'INQ-1002',
        customerName: 'Gurpreet Kaur Gill',
        phone: '9814011223',
        address: 'Urban Estate Phase 2, Jalandhar',
        capacityKw: 5,
        systemType: 'OFF_GRID',
        subsidyRequested: false,
        status: 'SURVEY_SCHEDULED',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        salesCheck: {
          shadowFreeAreaSqFt: 520,
          monthlyBillInr: 8200,
          gridSuitability: 'SUITABLE',
          notes: 'Frequent power cuts; customer needs full battery backup.',
        },
      },
      {
        id: 'INQ-1003',
        customerName: 'Vikramjit Singh',
        phone: '9888099887',
        address: 'GT Road Industrial Area, Phagwara',
        capacityKw: 3,
        systemType: 'ON_GRID',
        subsidyRequested: true,
        status: 'SURVEY_APPROVED',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        salesCheck: {
          shadowFreeAreaSqFt: 350,
          monthlyBillInr: 4800,
          gridSuitability: 'SUITABLE',
        },
        survey: {
          technicianName: 'Harpreet Tech',
          roofDirection: 'SOUTH',
          tiltAngleDeg: 28,
          cableDistanceM: 18,
          surveyDate: new Date(Date.now() - 86400000).toISOString(),
          approved: true,
          notes: 'Clear RCC roof, zero shading.',
        },
      },
    ],
    projects: [
      {
        id: 'PRJ-2001',
        inquiryId: 'INQ-0991',
        customerName: 'Meera Kapoor',
        phone: '9872033445',
        address: 'Civil Lines, Ludhiana',
        capacityKw: 3,
        systemType: 'ON_GRID',
        subsidyRequested: true,
        subsidyStatus: 'SUBMITTED',
        bomItems: bom3KwOnGrid,
        totalRevenueInr: sumPrice(bom3KwOnGrid),
        hardwareCostInr: sumCost(bom3KwOnGrid),
        advancePaidInr: 100000,
        paymentStatus: 'ADVANCE_PAID',
        invoiceNumber: 'INV-2026-041',
        status: 'CONFIRMED',
        assignedCrew: 'Crew Alpha (Harpreet & Ravi)',
        scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        technicianHours: 14,
        technicianHourlyRateInr: 450,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'PRJ-2002',
        inquiryId: 'INQ-0985',
        customerName: 'Patel Auto Works',
        phone: '9815577889',
        address: 'Focal Point, Jalandhar',
        capacityKw: 5,
        systemType: 'OFF_GRID',
        subsidyRequested: false,
        subsidyStatus: 'NOT_APPLICABLE',
        bomItems: bom5KwOffGrid,
        totalRevenueInr: sumPrice(bom5KwOffGrid),
        hardwareCostInr: sumCost(bom5KwOffGrid) + 28000,
        advancePaidInr: sumPrice(bom5KwOffGrid),
        paymentStatus: 'FULLY_PAID',
        invoiceNumber: 'INV-2026-038',
        status: 'INSTALLED',
        assignedCrew: 'Crew Beta (Sandeep & Manish)',
        scheduledDate: eighteenMonthsAgo.toISOString().slice(0, 10),
        technicianHours: 38,
        technicianHourlyRateInr: 500,
        createdAt: eighteenMonthsAgo.toISOString(),
      },
    ],
    serialUnits: [
      {
        id: 'SER-01',
        projectId: 'PRJ-2002',
        customerName: 'Patel Auto Works',
        serialNumber: 'INV-SP-2025-8841',
        itemName: '5 kW Hybrid Off-Grid Solar Inverter',
        category: 'INVERTER',
        dispatchedAt: eighteenMonthsAgo.toISOString(),
        deliveredAt: eighteenMonthsAgo.toISOString(),
        warrantyYears: 2,
        warrantyStartDate: eighteenMonthsAgo.toISOString(),
        warrantyExpiryDate: addMonths(eighteenMonthsAgo.toISOString(), 24),
      },
      {
        id: 'SER-02',
        projectId: 'PRJ-2002',
        customerName: 'Patel Auto Works',
        serialNumber: 'BAT-SP-2025-4410',
        itemName: 'Lithium-Ion Solar Storage Battery',
        category: 'BATTERY',
        dispatchedAt: eighteenMonthsAgo.toISOString(),
        deliveredAt: eighteenMonthsAgo.toISOString(),
        warrantyYears: 2,
        warrantyStartDate: eighteenMonthsAgo.toISOString(),
        warrantyExpiryDate: addMonths(eighteenMonthsAgo.toISOString(), 24),
      },
      {
        id: 'SER-03',
        projectId: 'PRJ-1904',
        customerName: 'Sukhdev Singh',
        serialNumber: 'INV-SP-2024-1102',
        itemName: '3 kW On-Grid Solar Inverter',
        category: 'INVERTER',
        dispatchedAt: thirtyMonthsAgo.toISOString(),
        deliveredAt: thirtyMonthsAgo.toISOString(),
        warrantyYears: 2,
        warrantyStartDate: thirtyMonthsAgo.toISOString(),
        warrantyExpiryDate: addMonths(thirtyMonthsAgo.toISOString(), 24),
      },
    ],
    installationReports: [],
    tickets: [
      {
        id: 'TKT-501',
        projectId: 'PRJ-2002',
        customerName: 'Patel Auto Works',
        phone: '9815577889',
        serialNumber: 'INV-SP-2025-8841',
        itemName: '5 kW Hybrid Off-Grid Solar Inverter',
        faultDescription: 'Fault code E-04 during heavy rain; zero power output.',
        underWarranty: true,
        partsCostInr: 0,
        labourCostInr: 0,
        billedAmountInr: 0,
        status: 'OPEN',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
  };
};

export function loadDatabase(): AppDatabase {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seedDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as AppDatabase;
  } catch {
    const initial = seedDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export function saveDatabase(db: AppDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDatabase(): AppDatabase {
  const fresh = seedDb();
  saveDatabase(fresh);
  return fresh;
}
