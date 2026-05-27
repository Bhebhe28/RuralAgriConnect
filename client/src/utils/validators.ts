/**
 * Client-side validation utilities — mirrors server/src/utils/validators.ts.
 * Used in form components so validation rules are never duplicated inline.
 */

// RFC 5322-simplified: requires local@domain.tld with no consecutive dots
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim()) &&
    !email.includes('..');
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

// SA phone: 10-digit starting with 0, or +27 prefix — digits 6, 7, 8 only after prefix
export function isValidPhoneZA(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+27|0)[6-8][0-9]{8}$/.test(cleaned);
}

// Full name: 2–100 chars, letters, spaces, hyphens, apostrophes only
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 &&
    /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]+$/.test(trimmed);
}

// Hectares: 0.1 to 50 000 (covers SA smallholder to large commercial)
export function isValidHectares(value: string | number): boolean {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(n) && n >= 0.1 && n <= 50000;
}

// Yield in kg: 1 to 10 000 000 kg
export function isValidYieldKg(value: string | number): boolean {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(n) && n >= 1 && n <= 10000000;
}

// GPS latitude: valid range for South Africa (-35 to -22)
export function isValidLatSA(value: string | number): boolean {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(n) && n >= -35 && n <= -22;
}

// GPS longitude: valid range for South Africa (16 to 33)
export function isValidLngSA(value: string | number): boolean {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(n) && n >= 16 && n <= 33;
}

// General text length check
export function isValidLength(text: string, min: number, max: number): boolean {
  const len = text.trim().length;
  return len >= min && len <= max;
}
