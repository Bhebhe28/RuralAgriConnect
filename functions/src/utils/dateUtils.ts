/**
 * Date utility functions used across route handlers and services.
 * Centralizes all date formatting so output is consistent application-wide.
 */

/**
 * Format a date string or Date object to DD MMM YYYY (e.g. 15 Apr 2026).
 * Used for advisory published dates and report headers.
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Return a relative time string (e.g. "2 hours ago", "3 days ago").
 * Used in community posts and notification timestamps.
 */
export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Check whether a date is in the past (expired).
 * Used for weather alert expiry checks.
 */
export function isExpired(date: string | Date): boolean {
  return new Date(date).getTime() < Date.now();
}

/** Return current UTC datetime string for SQLite DEFAULT values */
export function nowUtc(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}
