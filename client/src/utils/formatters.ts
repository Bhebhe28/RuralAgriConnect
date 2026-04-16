/**
 * Display formatters for currency, file sizes, and text truncation.
 * Imported wherever formatted output is needed — never inline.
 */

/** Format a number as South African Rand (e.g. R 1 250.00) */
export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

/** Human-readable file size (e.g. 2.4 MB) */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Truncate a string to n characters with ellipsis */
export function truncate(str: string, n: number): string {
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

/** Capitalize first letter of each word */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
