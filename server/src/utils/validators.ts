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
