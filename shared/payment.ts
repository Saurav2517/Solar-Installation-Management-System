/** Configure these values and provide a QR image before accepting UPI payments. */
export const UPI_PAYMENT = {
  upiId: '',
  accountName: '',
  qrImage: '',
  appName: 'UPI',
} as const;

/** Deep link that opens a UPI app with the amount and order reference filled in. */
export function upiPayUri(amount: number, note: string) {
  if (!UPI_PAYMENT.upiId || !UPI_PAYMENT.accountName) {
    throw new Error('UPI payment details are not configured');
  }

  const params = [
    `pa=${encodeURIComponent(UPI_PAYMENT.upiId)}`,
    `pn=${encodeURIComponent(UPI_PAYMENT.accountName)}`,
    'cu=INR',
    `am=${Number(amount).toFixed(2)}`,
    `tn=${encodeURIComponent(note)}`,
  ];
  return `upi://pay?${params.join('&')}`;
}
