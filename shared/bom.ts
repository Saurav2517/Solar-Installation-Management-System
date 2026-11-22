import type { BomLine, CapacityKw, ProductCategory, SystemType } from './types';

export interface CatalogItem {
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  costPrice: number;
  sellPrice: number;
  serialized: boolean;
  warrantyMonths: number;
  reorderLevel: number;
  openingStock: number;
  notes?: string;
}

const inverter = (kw: number, type: 'on' | 'off'): CatalogItem => {
  const onGrid = type === 'on';
  const cost = onGrid ? [7500, 13000, 18500, 23000, 28000][kw - 1] : [12000, 20000, 28000, 35000, 42000][kw - 1];
  const sell = onGrid ? [10500, 17500, 24500, 30500, 36500][kw - 1] : [16500, 26500, 36500, 45000, 54000][kw - 1];
  return {
    sku: `INV-${onGrid ? 'OG' : 'HY'}-${kw}`,
    name: `${onGrid ? 'Growatt' : 'Deye'} ${kw} kW ${onGrid ? 'On-Grid' : 'Hybrid Off-Grid'} Inverter`,
    category: 'inverter',
    unit: 'unit',
    costPrice: cost,
    sellPrice: sell,
    serialized: true,
    warrantyMonths: 24,
    reorderLevel: 3,
    openingStock: 14,
  };
};

export const CATALOG: CatalogItem[] = [
  {
    sku: 'PNL-550',
    name: 'Waaree 550W Mono PERC Bifacial Solar Panel',
    category: 'panel',
    unit: 'panel',
    costPrice: 11500,
    sellPrice: 14500,
    serialized: true,
    warrantyMonths: 240,
    reorderLevel: 24,
    openingStock: 140,
    notes: '20-year performance warranty, 12-year product warranty',
  },
  ...[1, 2, 3, 4, 5].map((kw) => inverter(kw, 'on')),
  ...[1, 2, 3, 4, 5].map((kw) => inverter(kw, 'off')),
  {
    sku: 'BAT-LI-512',
    name: '5.12 kWh LiFePO4 Solar Battery',
    category: 'battery',
    unit: 'unit',
    costPrice: 92000,
    sellPrice: 112000,
    serialized: true,
    warrantyMonths: 24,
    reorderLevel: 2,
    openingStock: 10,
  },
  {
    sku: 'CC-MPPT-60',
    name: '60A MPPT Battery Charge Controller',
    category: 'controller',
    unit: 'unit',
    costPrice: 7800,
    sellPrice: 10400,
    serialized: true,
    warrantyMonths: 24,
    reorderLevel: 4,
    openingStock: 18,
  },
  {
    sku: 'STR-AL',
    name: 'Aluminium Panel Mounting Stand (per panel)',
    category: 'structure',
    unit: 'set',
    costPrice: 2900,
    sellPrice: 3900,
    serialized: false,
    warrantyMonths: 60,
    reorderLevel: 30,
    openingStock: 220,
  },
  {
    sku: 'BOX-DCDB',
    name: 'DCDB + ACDB Wiring Box with SPD',
    category: 'wiring',
    unit: 'box',
    costPrice: 2600,
    sellPrice: 3600,
    serialized: false,
    warrantyMonths: 24,
    reorderLevel: 6,
    openingStock: 30,
  },
  {
    sku: 'CBL-DC',
    name: 'Solar DC Cable 4mm² (per metre)',
    category: 'wiring',
    unit: 'metre',
    costPrice: 78,
    sellPrice: 110,
    serialized: false,
    warrantyMonths: 12,
    reorderLevel: 200,
    openingStock: 1200,
  },
  {
    sku: 'CBL-AC',
    name: 'AC Cable 4mm² (per metre)',
    category: 'wiring',
    unit: 'metre',
    costPrice: 95,
    sellPrice: 135,
    serialized: false,
    warrantyMonths: 12,
    reorderLevel: 150,
    openingStock: 900,
  },
  {
    sku: 'CON-MC4',
    name: 'MC4 Connector Pair',
    category: 'wiring',
    unit: 'pair',
    costPrice: 110,
    sellPrice: 165,
    serialized: false,
    warrantyMonths: 12,
    reorderLevel: 40,
    openingStock: 300,
  },
  {
    sku: 'EAR-KIT',
    name: 'Safety Earthing Kit (rod, strip, backfill)',
    category: 'bos',
    unit: 'kit',
    costPrice: 3900,
    sellPrice: 5200,
    serialized: false,
    warrantyMonths: 60,
    reorderLevel: 5,
    openingStock: 40,
  },
  {
    sku: 'LA-1',
    name: 'Lightning Arrester with Down Conductor',
    category: 'bos',
    unit: 'unit',
    costPrice: 1700,
    sellPrice: 2400,
    serialized: false,
    warrantyMonths: 24,
    reorderLevel: 5,
    openingStock: 36,
  },
  {
    sku: 'SVC-INST',
    name: 'Installation, Testing & Commissioning (per kW)',
    category: 'service',
    unit: 'kW',
    costPrice: 0,
    sellPrice: 4800,
    serialized: false,
    warrantyMonths: 0,
    reorderLevel: 0,
    openingStock: 0,
    notes: 'Crew labour is costed from signed timesheets',
  },
];

export const productBySku = (sku: string): CatalogItem | undefined => CATALOG.find((c) => c.sku === sku);

export function buildBom(kw: number, type: SystemType): BomLine[] {
  const panelCount = Math.ceil((kw * 1000) / 550);
  const qty: Record<string, number> = {
    'PNL-550': panelCount,
    'STR-AL': panelCount,
    'CON-MC4': panelCount * 2,
    'EAR-KIT': 1,
  };

  if (type === 'hardware') {
    qty['CBL-DC'] = 20 + kw * 2;
    return toLines(qty);
  }

  qty[`INV-${type === 'off-grid' ? 'HY' : 'OG'}-${kw}`] = 1;
  qty['CC-MPPT-60'] = 1;
  qty['BOX-DCDB'] = 1;
  qty['LA-1'] = 1;
  qty['CBL-DC'] = 30 + kw * 4;
  qty['CBL-AC'] = 15 + kw * 2;
  qty['SVC-INST'] = kw;

  if (type === 'off-grid') {
    qty['BAT-LI-512'] = Math.ceil(kw / 2.5);
  }

  return toLines(qty);
}

function toLines(qty: Record<string, number>): BomLine[] {
  return Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([sku, q]) => {
      const item = productBySku(sku);
      if (!item) throw new Error(`Unknown SKU ${sku}`);
      return {
        sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        qty: q,
        unitPrice: item.sellPrice,
        unitCost: item.costPrice,
        total: item.sellPrice * q,
        totalCost: item.costPrice * q,
        serialized: item.serialized,
        warrantyMonths: item.warrantyMonths,
      };
    });
}

export function quoteTotals(lines: BomLine[], discount = 0, taxRate = 0.138) {
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const costTotal = lines.reduce((s, l) => s + l.totalCost, 0);
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = Math.round(taxable * taxRate);
  const total = taxable + taxAmount;
  return { subtotal, costTotal, taxAmount, total, taxable };
}

/** PM Surya Ghar style residential subsidy: 30k for first kW, 30k for second, 18k for the rest. */
export function subsidyFor(kw: number): number {
  if (kw <= 0) return 0;
  if (kw === 1) return 30000;
  if (kw === 2) return 60000;
  return 78000;
}

export function estimatedLabourCost(kw: number): number {
  return kw * 2800;
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function capacityLabel(kw: number, type: SystemType): string {
  const t = type === 'on-grid' ? 'On-Grid' : type === 'off-grid' ? 'Off-Grid' : 'Panel Set';
  return `${kw} kW ${t}`;
}

export const SYSTEM_TYPES: SystemType[] = ['on-grid', 'off-grid', 'hardware'];
export const CAPACITIES: CapacityKw[] = [1, 2, 3, 4, 5];
