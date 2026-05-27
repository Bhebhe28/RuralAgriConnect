/**
 * Shared validation utilities used by both route handlers and middleware.
 * Single source of truth for all input validation rules — frontend mirrors these.
 */

/** Valid South African phone number formats: +27XXXXXXXXX or 0XXXXXXXXX */
export function isValidPhoneZA(phone: string): boolean {
  return /^(\+27|0)[6-8][0-9]{8}$/.test(phone.replace(/\s/g, ''));
}

/** Standard email format check */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password must be at least 8 chars, contain one uppercase,
 * one lowercase, and one digit.
 * Matches the rule shown on the registration form.
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);
}

/** Allowed image MIME types for uploads */
export function isValidImageType(mimetype: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimetype);
}

/** Max upload size: 5 MB */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// A10: SSRF protection — only these hostnames may be used in server-side HTTP requests.
// Any code that fetches a user-supplied or dynamically built URL must call isAllowedUrl() first.
const SSRF_ALLOWED_HOSTS = new Set([
  'api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'generativelanguage.googleapis.com',
  'fcm.googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
]);

export function isAllowedUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === 'https:' && SSRF_ALLOWED_HOSTS.has(hostname);
  } catch { return false; }
}
