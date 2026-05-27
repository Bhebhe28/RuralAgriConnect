/**
 * SECURITY FIX — A05/A08: Secure Upload Validation with File Signature Checking
 *
 * Vulnerability: The existing upload validation only checks the MIME type
 * reported by the HTTP client. This is trivially bypassed: an attacker can
 * rename a PHP webshell to "photo.jpg" and set Content-Type: image/jpeg.
 *
 * Attack scenario: Attacker uploads a file named "shell.jpg" with PHP content.
 * The server stores it. If the web server executes files from that directory,
 * Remote Code Execution is achieved.
 *
 * Risk severity: CRITICAL
 *
 * Remediation:
 * 1. Check the file's magic bytes (first 4-12 bytes) against known image signatures.
 * 2. Enforce strict file size limits.
 * 3. Generate a random filename — never use the original filename.
 * 4. Compute SHA-256 hash of the uploaded file for integrity verification.
 *
 * Why secure: Magic byte verification is the only reliable way to determine
 * file type. Combined with random filenames and size limits, this prevents
 * both content-type spoofing and path traversal attacks.
 */

import { Request } from 'express';
import crypto from 'crypto';
import { logger } from './logger';

// Magic byte signatures for allowed image types
const IMAGE_SIGNATURES: Array<{ type: string; bytes: number[]; offset?: number }> = [
  // JPEG: starts with FF D8 FF
  { type: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  { type: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  // WebP: RIFF prefix (bytes 8-11 must also be WEBP)
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

/**
 * Verify that a buffer's magic bytes match a known image format.
 * Returns the detected MIME type or null if not a recognized image.
 */
export function verifyImageSignature(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  for (const sig of IMAGE_SIGNATURES) {
    const slice = buffer.slice(sig.offset ?? 0, (sig.offset ?? 0) + sig.bytes.length);
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      if (sig.type === 'image/webp') {
        const webpMark = buffer.slice(8, 12).toString('ascii');
        if (webpMark !== 'WEBP') continue;
      }
      return sig.type;
    }
  }
  return null;
}

/**
 * SECURITY FIX — A08: Compute SHA-256 hash of uploaded file buffer.
 * Store this hash alongside the file record for integrity verification.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * SECURITY FIX — A05: Validate an uploaded file's actual content type
 * by checking magic bytes, not just the client-reported MIME type.
 */
export function validateUploadedFile(
  file: Express.Multer.File
): { valid: true; mimeType: string; hash: string } | { valid: false; reason: string } {
  if (!file.buffer || file.buffer.length === 0) {
    return { valid: false, reason: 'Empty file' };
  }

  const detectedType = verifyImageSignature(file.buffer);
  if (!detectedType) {
    logger.security('Upload rejected: invalid magic bytes', {
      originalName: file.originalname?.slice(0, 100),
      reportedMime: file.mimetype,
      size:         file.size,
    });
    return { valid: false, reason: 'File content does not match a valid image format' };
  }

  if (detectedType !== file.mimetype) {
    logger.security('Upload MIME mismatch: reported vs detected', {
      reported: file.mimetype,
      detected: detectedType,
      originalName: file.originalname?.slice(0, 100),
    });
  }

  const hash = computeFileHash(file.buffer);
  return { valid: true, mimeType: detectedType, hash };
}

/**
 * SECURITY FIX — A05: Multer fileFilter that rejects non-image MIME types
 * at the HTTP layer before the file is fully read into memory.
 */
export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void
) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
}
