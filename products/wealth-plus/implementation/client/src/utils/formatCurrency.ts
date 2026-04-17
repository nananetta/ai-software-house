const formatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number as Thai Baht: ฿1,500,000.00
 */
export function formatTHB(amount: number): string {
  return `฿${formatter.format(amount)}`;
}

/**
 * Formats a number with comma separators (no currency symbol)
 */
export function formatNumber(amount: number): string {
  return formatter.format(amount);
}
