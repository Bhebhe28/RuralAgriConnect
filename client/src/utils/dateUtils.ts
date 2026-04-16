/**
 * Date formatting utilities — single source of truth for all date display.
 * Mirrors the server-side dateUtils so frontend and backend output matches.
 */

/** Format to DD MMM YYYY — used on advisory cards and report headers */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Relative time string (e.g. "2 hours ago").
 * Used in community posts and notification lists.
 */
export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)    return 'just now';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/** Check if a date string is in the past */
export function isExpired(date: string | Date): boolean {
  return new Date(date).getTime() < Date.now();
}
