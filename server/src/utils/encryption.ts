/**
 * SECURITY FIX — A04: Field-Level AES-256-GCM Encryption for Sensitive SQLite Fields
 *
 * Vulnerability: Phone numbers and regions were stored in SQLite as plaintext.
 * If the database file is exfiltrated (stolen disk, backup leak, path traversal),
 * all PII is immediately readable.
 *
 * Attack scenario: An attacker exploits a directory traversal vulnerability or
 * gains read access to the server's filesystem. They download
 * data/ruragriconnect.db and open it with any SQLite browser — all phone numbers
 * and region names are visible in cleartext.
 *
 * Risk severity: HIGH (PII breach — POPIA/GDPR exposure for South African users)
 *
 * Remediation: AES-256-GCM application-level encryption for the phone_number and
 * region columns. The encryption key is stored ONLY in the environment (never in
 * code or DB). GCM mode provides both confidentiality AND integrity — a tampered
 * ciphertext fails authentication and is rejected.
 *
 * Migration safety: Values without the 'enc:' prefix are treated as legacy
 * plaintext and returned as-is. They are re-encrypted on the next write.
 * This allows zero-downtime migration of existing data.
 *
 * Why secure:
 * - AES-256 with a 96-bit random IV per encryption (no IV reuse)
 * - GCM auth tag detects any tampering with stored ciphertext
 * - Key never stored in DB — database theft alone is not sufficient for decryption
 * - Each field encrypted independently with a unique IV
 */

import crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_LEN     = 12;  // 96-bit IV — GCM recommended length
const TAG_LEN    = 16;  // 128-bit authentication tag
const ENC_PREFIX = 'enc:'; // Prefix distinguishes encrypted from legacy plaintext

/**
 * Load and validate the 256-bit (32-byte / 64-hex-char) encryption key.
 * Throws at startup if the key is missing or weak so the server never runs
 * with unprotected PII.
 *
 * Generate a key with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getEncryptionKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY environment variable is required for field-level encryption. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${hex.length} characters.`
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext field value.
 * Returns null for null/empty inputs (not encrypted — null is stored as null).
 * Returns 'enc:<base64>' for encrypted values.
 *
 * Format of encrypted payload: IV (12 bytes) || AuthTag (16 bytes) || Ciphertext
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;

  // If already encrypted, return as-is (idempotent)
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext;

  const key  = getEncryptionKey();
  const iv   = crypto.randomBytes(IV_LEN); // Unique IV per encryption — never reused
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag       = cipher.getAuthTag(); // 128-bit GCM authentication tag

  // Pack: IV || AuthTag || Ciphertext → base64
  const packed = Buffer.concat([iv, tag, encrypted]);
  return ENC_PREFIX + packed.toString('base64');
}

/**
 * Decrypt a field value.
 * - Returns null for null/empty inputs.
 * - Returns plaintext as-is for legacy unencrypted values (no 'enc:' prefix).
 *   This ensures safe migration of existing rows.
 * - Returns null if authentication fails (tampered ciphertext).
 */
export function decryptField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return null;

  // SECURITY: Migration-safe — legacy plaintext returned as-is
  // On the next UPDATE this field will be re-encrypted
  if (!stored.startsWith(ENC_PREFIX)) return stored;

  try {
    const key  = getEncryptionKey();
    const buf  = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');

    if (buf.length < IV_LEN + TAG_LEN + 1) return null; // Sanity check

    const iv        = buf.subarray(0, IV_LEN);
    const tag       = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const encrypted = buf.subarray(IV_LEN + TAG_LEN);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // GCM authentication failure throws here if ciphertext was tampered
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    // Authentication tag mismatch — data was tampered. Return null rather than
    // corrupted data. Log this event — it is a security indicator.
    return null;
  }
}

/**
 * Decrypt an object's sensitive fields in-place.
 * Call this after every SELECT before returning user data to the client.
 */
export function decryptUserFields(user: Record<string, any>): Record<string, any> {
  if (user.phone_number !== undefined) {
    user.phone_number = decryptField(user.phone_number);
  }
  if (user.region !== undefined) {
    user.region = decryptField(user.region);
  }
  return user;
}
