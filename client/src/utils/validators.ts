/**
 * Client-side validation utilities — mirrors server/src/utils/validators.ts.
 * Used in form components so validation rules are never duplicated inline.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password strength: min 8 chars, one uppercase, one lowercase, one digit.
 * Same rule enforced on the server — single source of truth.
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);
}

export function isValidPhoneZA(phone: string): boolean {
  return /^(\+27|0)[6-8][0-9]{8}$/.test(phone.replace(/\s/g, ''));
}
