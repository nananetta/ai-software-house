const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats an ISO date string as "DD MMM YYYY"
 * e.g. "2026-12-31T00:00:00.000Z" → "31 Dec 2026"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = MONTHS[date.getUTCMonth()] ?? '';
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats date as YYYY-MM-DD for input[type="date"]
 */
export function toInputDate(dateString: string): string {
  return dateString.split('T')[0] ?? dateString;
}
