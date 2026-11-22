// City → valid pincode prefixes (the first 3 digits identify India Post's
// sorting district, so a pincode can be checked against its city).
// Aliases let older spellings ("Bangalore") still resolve correctly.

export interface CityPincode {
  label: string;
  prefixes: string[];
}

export const CITY_PINCODES: Record<string, CityPincode> = {
  bengaluru: { label: 'Bengaluru', prefixes: ['560'] },
  mysuru: { label: 'Mysuru', prefixes: ['570'] },
  mangaluru: { label: 'Mangaluru', prefixes: ['575'] },
  hubballi: { label: 'Hubballi', prefixes: ['580'] },
  belagavi: { label: 'Belagavi', prefixes: ['590'] },
  kalaburagi: { label: 'Kalaburagi', prefixes: ['585'] },
  davanagere: { label: 'Davanagere', prefixes: ['577'] },
  shivamogga: { label: 'Shivamogga', prefixes: ['577'] },
  tumakuru: { label: 'Tumakuru', prefixes: ['572'] },
  udupi: { label: 'Udupi', prefixes: ['576'] },
  vijayapura: { label: 'Vijayapura', prefixes: ['586'] },
  ballari: { label: 'Ballari', prefixes: ['583'] },
  raichur: { label: 'Raichur', prefixes: ['584'] },
  bidar: { label: 'Bidar', prefixes: ['585'] },
  hassan: { label: 'Hassan', prefixes: ['573'] },
  mandya: { label: 'Mandya', prefixes: ['571'] },
  kolar: { label: 'Kolar', prefixes: ['563'] },
  chikkaballapur: { label: 'Chikkaballapur', prefixes: ['562'] },
  chitradurga: { label: 'Chitradurga', prefixes: ['577'] },
  mumbai: { label: 'Mumbai', prefixes: ['400'] },
  delhi: { label: 'Delhi', prefixes: ['110'] },
  chennai: { label: 'Chennai', prefixes: ['600'] },
  hyderabad: { label: 'Hyderabad', prefixes: ['500'] },
  kolkata: { label: 'Kolkata', prefixes: ['700'] },
  pune: { label: 'Pune', prefixes: ['411'] },
  ahmedabad: { label: 'Ahmedabad', prefixes: ['380'] },
  jaipur: { label: 'Jaipur', prefixes: ['302'] },
  lucknow: { label: 'Lucknow', prefixes: ['226'] },
  kochi: { label: 'Kochi', prefixes: ['682'] },
  coimbatore: { label: 'Coimbatore', prefixes: ['641'] },
  visakhapatnam: { label: 'Visakhapatnam', prefixes: ['530'] },
  bhopal: { label: 'Bhopal', prefixes: ['462'] },
  indore: { label: 'Indore', prefixes: ['452'] },
  patna: { label: 'Patna', prefixes: ['800'] },
  guwahati: { label: 'Guwahati', prefixes: ['781'] },
  bhubaneswar: { label: 'Bhubaneswar', prefixes: ['751'] },
};

const ALIASES: Record<string, string> = {
  bangalore: 'bengaluru',
  bengaluru: 'bengaluru',
  mysore: 'mysuru',
  mangalore: 'mangaluru',
  hubli: 'hubballi',
  belgaum: 'belagavi',
  gulbarga: 'kalaburagi',
  shimoga: 'shivamogga',
  tumkur: 'tumakuru',
  bijapur: 'vijayapura',
  bellary: 'ballari',
  bombay: 'mumbai',
  madras: 'chennai',
  calcutta: 'kolkata',
};

/** Normalise a city name: lowercase, trim and collapse separators. */
export function normalizeCity(city: string | undefined | null): string {
  return String(city ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Resolve a typed city (including aliases) to its pincode entry. */
export function cityPincodeEntry(city: string | undefined | null): CityPincode | null {
  const key = normalizeCity(city);
  if (!key) return null;
  return CITY_PINCODES[ALIASES[key] ?? key] ?? null;
}

/** Display names of every city the system can validate. */
export const SUPPORTED_CITIES: string[] = Object.values(CITY_PINCODES).map((c) => c.label);

/**
 * Validate a pincode against a city.
 * Returns `null` when valid (or when no pincode was supplied — it is optional),
 * otherwise a human-readable error message.
 */
export function pincodeErrorForCity(
  pincode: string | number | undefined | null,
  city: string | undefined | null,
): string | null {
  const pin = String(pincode ?? '').trim();
  if (!pin) return null;

  if (!/^\d{6}$/.test(pin)) return 'Pincode must be a 6-digit number';

  const entry = cityPincodeEntry(city);
  if (!entry) {
    return `We don't serve this city yet. Choose one of: ${SUPPORTED_CITIES.join(', ')}.`;
  }

  const prefix = pin.slice(0, 3);
  if (!entry.prefixes.includes(prefix)) {
    const example = `${entry.prefixes[0]}001`;
    return `${entry.label} pincodes start with ${entry.prefixes.join(' or ')} (e.g. ${example})`;
  }

  return null;
}
