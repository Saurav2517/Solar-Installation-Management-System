/**
 * Phone-number validation for the app.
 *
 * A valid number is exactly 10 digits. A leading +91 / 91 / 0 is tolerated
 * (common when numbers are copied from contacts) and stripped before the
 * 10-digit check, but negatives, letters and any other length are rejected.
 */

export function normalizePhone(phone: string | number | undefined | null): string {
  let digits = String(phone ?? '')
    .trim()
    .replace(/[\s\-().]/g, '');

  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);

  return digits;
}

/**
 * Returns `null` when the phone number is valid, otherwise a human-readable
 * error message. Pass `required = false` to allow an empty value.
 */
export function phoneError(
  phone: string | number | undefined | null,
  { label = 'Phone number', required = true }: { label?: string; required?: boolean } = {},
): string | null {
  const raw = String(phone ?? '').trim();
  if (!raw) return required ? `${label} is required` : null;

  // Must start with an optional + then a digit; allows spaces and common
  // separators, but rejects a leading minus (negative numbers).
  if (!/^\+?\d[\d\s\-().]*$/.test(raw)) return `${label} must contain digits only`;

  const digits = normalizePhone(raw);
  if (!/^\d{10}$/.test(digits)) return `${label} must be exactly 10 digits`;

  return null;
}
