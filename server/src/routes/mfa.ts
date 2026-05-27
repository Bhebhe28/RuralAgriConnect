/**
 * SECURITY FIX — A07: TOTP Multi-Factor Authentication for Admin Accounts
 *
 * Vulnerability: Admin accounts had no second factor. A compromised admin
 * password gives full system access — all farmer data, subsidy approvals,
 * and advisory content.
 *
 * Attack scenario: Attacker phishes or brute-forces an admin password.
 * Without MFA, they immediately have full admin access. With MFA, they also
 * need the time-based one-time password from the admin's authenticator app —
 * a physical second factor the attacker does not have.
 *
 * Risk severity: CRITICAL (admin account compromise = full system compromise)
 *
 * Remediation: RFC 6238 TOTP (Time-based One-Time Password) using otplib.
 * Compatible with Google Authenticator, Authy, and any RFC 6238 app.
 *
 * Flow:
 *   1. Admin calls POST /auth/mfa/setup → gets TOTP secret + QR code URI
 *   2. Admin scans QR code in authenticator app
 *   3. Admin calls POST /auth/mfa/activate with a valid 6-digit code → MFA activated
 *   4. Next login: server returns { mfaRequired: true, mfaToken } instead of full JWT
 *   5. Admin calls POST /auth/mfa/verify with mfaToken + 6-digit code → gets full JWT
 *   6. Admin calls POST /auth/mfa/disable with current TOTP code → disables MFA
 *
 * Why secure:
 * - TOTP secrets are AES-256-GCM encrypted before storage
 * - DB compromise alone cannot recover TOTP secrets (requires FIELD_ENCRYPTION_KEY)
 * - MFA pending tokens are short-lived (5 minutes) and single-purpose
 * - TOTP window allows ±1 step (30s tolerance) to handle clock skew
 * - Admin role check enforced on setup/disable — farmers cannot enable MFA
 */

import { Router, Request, Response } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest, getJwtSecret, generateAccessToken, generateRefreshToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import { encryptField, decryptField } from '../utils/encryption';

const router = Router();

// TOTP issuer name shown in authenticator apps
const TOTP_ISSUER = 'RuralAgriConnect';

// SECURITY: Allow ±1 time step (30s) to handle minor clock skew between
// server and authenticator app. Window > 1 weakens security.
authenticator.options = { window: 1 };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Issue a short-lived MFA-pending token.
 * This token can ONLY be used to call POST /auth/mfa/verify — the authenticate
 * middleware rejects it for all other routes because of the mfa_pending claim.
 */
function issueMfaPendingToken(userId: string, email: string): string {
  return jwt.sign(
    { id: userId, email, mfa_pending: true },
    getJwtSecret(),
    { expiresIn: '5m', jwtid: uuidv4() } // 5-minute window to complete MFA
  );
}

// ── POST /auth/mfa/setup ──────────────────────────────────────────────────────
/**
 * Generate a TOTP secret for the requesting admin.
 * Returns the TOTP secret and an otpauth:// URI for QR code rendering.
 * The secret is stored unactivated until POST /auth/mfa/activate confirms it works.
 */
router.post('/setup', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  // SECURITY FIX — A01: Only admins can enable MFA
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'MFA setup is only available for admin accounts' });
  }

  const db      = await getDb();
  const userId  = req.user!.id;
  const email   = req.user!.email;

  // Check if MFA is already activated
  const existing = query<any>(db, `SELECT activated FROM totp_secrets WHERE user_id = ?`, [userId]);
  if (existing.length && existing[0].activated === 1) {
    return res.status(409).json({ error: 'MFA is already activated. Disable it first to reset.' });
  }

  // Generate a cryptographically secure TOTP secret (20-byte base32 = 160 bits)
  const secret    = authenticator.generateSecret(20);
  const otpauthUrl = authenticator.keyuri(email, TOTP_ISSUER, secret);

  // SECURITY FIX — A04: Encrypt the TOTP secret before storing
  const encryptedSecret = encryptField(secret);

  // Upsert — replace any unactivated secret
  run(db, `INSERT OR REPLACE INTO totp_secrets (user_id, secret_encrypted, activated, created_at)
           VALUES (?, ?, 0, ?)`,
    [userId, encryptedSecret, new Date().toISOString()]);

  // Generate QR code as a data URL for the frontend to render
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  logger.audit('MFA setup initiated', { userId, email });

  res.json({
    secret,       // Show once — admin must save this as backup
    otpauthUrl,   // For apps that accept URI directly
    qrCode: qrCodeDataUrl, // Data URL: data:image/png;base64,...
    message: 'Scan the QR code in your authenticator app, then call POST /auth/mfa/activate with a valid code.',
  });
}));

// ── POST /auth/mfa/activate ───────────────────────────────────────────────────
/**
 * Confirm the TOTP secret works by verifying a code from the authenticator app.
 * Sets activated = 1. From this point, every admin login requires a TOTP code.
 */
router.post('/activate', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'MFA is only available for admin accounts' });
  }

  const { code } = req.body;
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'A 6-digit TOTP code is required' });
  }

  const db     = await getDb();
  const userId = req.user!.id;

  const rows = query<any>(db, `SELECT secret_encrypted, activated FROM totp_secrets WHERE user_id = ?`, [userId]);
  if (!rows.length) {
    return res.status(400).json({ error: 'No MFA setup in progress. Call POST /auth/mfa/setup first.' });
  }
  if (rows[0].activated === 1) {
    return res.status(409).json({ error: 'MFA is already activated.' });
  }

  const secret = decryptField(rows[0].secret_encrypted);
  if (!secret) {
    logger.security('TOTP secret decryption failed during activation', { userId });
    return res.status(500).json({ error: 'MFA setup error. Please restart setup.' });
  }

  // SECURITY: Verify the code — if it doesn't match, the admin has the wrong secret
  if (!authenticator.verify({ token: code, secret })) {
    logger.security('MFA activation failed — wrong code', { userId });
    return res.status(400).json({ error: 'Invalid TOTP code. Make sure your authenticator app is synced.' });
  }

  run(db, `UPDATE totp_secrets SET activated = 1 WHERE user_id = ?`, [userId]);

  logger.audit('MFA activated for admin account', { userId, email: req.user!.email });

  res.json({ message: 'MFA activated successfully. Future logins will require a TOTP code.' });
}));

// ── POST /auth/mfa/verify ─────────────────────────────────────────────────────
/**
 * Second step of MFA login.
 * Client sends: { mfaToken, code }
 * Server verifies the TOTP code and issues full JWT + refresh token.
 */
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  const { mfaToken, code } = req.body;

  if (!mfaToken || typeof mfaToken !== 'string') {
    return res.status(400).json({ error: 'mfaToken required' });
  }
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'A 6-digit TOTP code is required' });
  }

  // Verify the MFA pending token
  let decoded: any;
  try {
    decoded = jwt.verify(mfaToken, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'MFA token expired or invalid. Please log in again.' });
  }

  if (!decoded.mfa_pending) {
    return res.status(400).json({ error: 'Not an MFA pending token' });
  }

  const db   = await getDb();
  const rows = query<any>(db, `SELECT secret_encrypted FROM totp_secrets WHERE user_id = ? AND activated = 1`, [decoded.id]);
  if (!rows.length) {
    return res.status(400).json({ error: 'MFA not configured for this account' });
  }

  const secret = decryptField(rows[0].secret_encrypted);
  if (!secret) {
    logger.security('TOTP secret decryption failed during verify', { userId: decoded.id });
    return res.status(500).json({ error: 'MFA verification error. Please contact support.' });
  }

  // SECURITY: Verify the TOTP code
  if (!authenticator.verify({ token: code, secret })) {
    logger.security('MFA verification failed — wrong code', { userId: decoded.id, email: decoded.email });
    return res.status(401).json({ error: 'Invalid TOTP code.' });
  }

  // MFA passed — issue full tokens
  const users = query<any>(db, `SELECT * FROM users WHERE user_id = ?`, [decoded.id]);
  if (!users.length) return res.status(404).json({ error: 'User not found' });

  const user = users[0];
  const { password_hash, ...safeUser } = user;

  const accessToken  = generateAccessToken({ id: user.user_id, role: user.role, email: user.email });
  const refreshToken = generateRefreshToken();

  const crypto = await import('crypto');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const refreshExpiry    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  run(db, `DELETE FROM refresh_tokens WHERE user_id = ?`, [user.user_id]);
  run(db, `INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)`,
    [refreshTokenHash, user.user_id, refreshExpiry, new Date().toISOString()]);

  logger.audit('Admin MFA login complete', { userId: user.user_id, email: user.email });

  res.json({
    token:        accessToken,
    refreshToken,
    expiresIn:    3600,
    user: { ...safeUser, id: safeUser.user_id },
  });
}));

// ── POST /auth/mfa/disable ────────────────────────────────────────────────────
/**
 * Disable MFA for the requesting admin.
 * Requires the current TOTP code as confirmation — prevents disabling MFA
 * if the admin's session token was stolen.
 */
router.post('/disable', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'MFA is only available for admin accounts' });
  }

  const { code } = req.body;
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Current TOTP code required to disable MFA' });
  }

  const db     = await getDb();
  const userId = req.user!.id;

  const rows = query<any>(db, `SELECT secret_encrypted FROM totp_secrets WHERE user_id = ? AND activated = 1`, [userId]);
  if (!rows.length) {
    return res.status(400).json({ error: 'MFA is not enabled for this account' });
  }

  const secret = decryptField(rows[0].secret_encrypted);
  if (!secret || !authenticator.verify({ token: code, secret })) {
    logger.security('MFA disable attempt failed — wrong code', { userId });
    return res.status(401).json({ error: 'Invalid TOTP code. MFA not disabled.' });
  }

  run(db, `DELETE FROM totp_secrets WHERE user_id = ?`, [userId]);
  logger.audit('MFA disabled for admin account', { userId, email: req.user!.email });

  res.json({ message: 'MFA disabled successfully.' });
}));

// ── GET /auth/mfa/status ──────────────────────────────────────────────────────
/**
 * Check whether MFA is enabled for the current user.
 * Used by the frontend to show the MFA settings UI.
 */
router.get('/status', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db   = await getDb();
  const rows = query<any>(db, `SELECT activated FROM totp_secrets WHERE user_id = ?`, [req.user!.id]);
  res.json({
    mfaEnabled:   rows.length > 0 && rows[0].activated === 1,
    mfaPending:   rows.length > 0 && rows[0].activated === 0,
  });
}));

export default router;

/**
 * MFA login helper — call this from the login route after password verification.
 * If the user has MFA enabled, issue a pending token instead of a full JWT.
 * Returns { mfaRequired: true, mfaToken } or null (no MFA required).
 */
export async function checkMfaRequired(
  userId: string,
  email: string
): Promise<{ mfaRequired: true; mfaToken: string } | null> {
  const db   = await getDb();
  const rows = query<any>(db, `SELECT activated FROM totp_secrets WHERE user_id = ? AND activated = 1`, [userId]);
  if (!rows.length) return null;
  return { mfaRequired: true, mfaToken: issueMfaPendingToken(userId, email) };
}
