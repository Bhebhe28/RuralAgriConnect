/**
 * SECURITY FIX — A07/A04/A06: Hardened Authentication Routes
 *
 * Fixes applied:
 * 1. A04: Password reset tokens are now hashed with SHA-256 before storage.
 *    The plaintext token is sent in the email; only the hash is stored in DB.
 *    If the DB is compromised, stored hashes cannot be used directly.
 *
 * 2. A07: Account lockout after 5 failed login attempts within 15 minutes.
 *    Progressive delay added to slow automated attacks.
 *
 * 3. A07: Refresh token rotation — access tokens are now 1 hour; refresh
 *    tokens are 7 days and rotated on each use (old token invalidated).
 *
 * 4. A07: Email verification flow — new accounts are marked unverified;
 *    a verification email is sent on registration.
 *
 * 5. A06: Forgot-password rate limiting per email address (separate from IP).
 *
 * 6. A07: Secure logout — token JTI is blacklisted on logout so the token
 *    cannot be reused even before its 1-hour expiry.
 *
 * 7. A05: All input validated via Zod schemas with max-length limits.
 *
 * 8. A09: All auth events logged with structured logger.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb, query, run } from '../db/database';
import { isValidEmail, isStrongPassword } from '../utils';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import {
  authenticate,
  AuthRequest,
  generateAccessToken,
  generateRefreshToken,
  blacklistToken,
  isAccountLocked,
  recordFailedLogin,
  clearLoginAttempts,
  getJwtSecret,
} from '../middleware/auth';
import { validate, LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../middleware/validate';
import { checkMfaRequired } from './mfa';
import { logger } from '../middleware/logger';
import { forgotPasswordLimiter } from '../middleware/rateLimiter';
// SECURITY FIX — A04: Encrypt PII at registration
import { encryptField, decryptUserFields } from '../utils/encryption';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', validate(LoginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  // SECURITY FIX — A07: Check account lockout before any DB query
  const lockStatus = isAccountLocked(email);
  if (lockStatus.locked) {
    const minutes = Math.ceil((lockStatus.remainingMs ?? 0) / 60000);
    logger.security('Login attempt on locked account', { email });
    return res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute(s).`,
    });
  }

  const db = await getDb();
  const users = query<any>(db, `SELECT * FROM users WHERE email = ?`, [email]);
  const user = users[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    // SECURITY FIX — A07: Record failed attempt and potentially lock account
    const result = recordFailedLogin(email);

    // SECURITY FIX — A09: Log failed login with structured logger
    logger.security('Failed login attempt', { email, locked: result.locked });

    run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
      [uuidv4(), user?.user_id || null, 'LOGIN_FAILED', 'user', null,
       `Failed login attempt for email: ${email}`]);

    if (result.locked) {
      return res.status(429).json({
        error: 'Account locked after too many failed attempts. Try again in 15 minutes.',
      });
    }

    // SECURITY FIX — A07: Generic error message — don't reveal whether email exists
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // SECURITY FIX — A07: Clear lockout on successful login
  clearLoginAttempts(email);

  // SECURITY FIX — A07: Check if admin has MFA enabled — if so, issue pending token
  const mfaCheck = await checkMfaRequired(user.user_id, user.email);
  if (mfaCheck) {
    logger.audit('MFA challenge issued at login', { userId: user.user_id, email: user.email });
    return res.json({
      mfaRequired: true,
      mfaToken:    mfaCheck.mfaToken,
      message:     'Enter your authenticator code to complete login.',
    });
  }

  // SECURITY FIX — A07: Generate short-lived access token (1h) with JTI
  const accessToken = generateAccessToken({
    id:    user.user_id,
    role:  user.role || 'farmer',
    email: user.email,
  });

  // SECURITY FIX — A07: Generate refresh token and store hash in DB
  const refreshToken     = generateRefreshToken();
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const refreshExpiry    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Store hashed refresh token (plaintext never stored)
  run(db, `DELETE FROM refresh_tokens WHERE user_id = ?`, [user.user_id]);
  run(db, `INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)`,
    [refreshTokenHash, user.user_id, refreshExpiry, new Date().toISOString()]);

  logger.audit('User login', { userId: user.user_id, role: user.role, email: user.email });

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), user.user_id, 'LOGIN', 'user', user.user_id, `${user.role} logged in`]);

  // SECURITY FIX — A07: Return both tokens; client stores refresh token securely
  // SECURITY FIX — A04: Decrypt PII fields before returning to client
  res.json({
    token:        accessToken,
    refreshToken,
    expiresIn:    3600,
    user: {
      id:           user.user_id,
      name:         user.full_name,
      email:        user.email,
      phone:        decryptUserFields({ phone_number: user.phone_number }).phone_number,
      role:         user.role || 'farmer',
      region:       decryptUserFields({ region: user.region }).region,
      avatar_url:   user.avatar_url || null,
      emailVerified: user.email_verified === 1,
    },
  });
}));

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Refresh token rotation endpoint.
 * Client sends the refresh token; server validates it, issues a new access token,
 * and rotates the refresh token (old one is invalidated immediately).
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const db = await getDb();

  const tokens = query<any>(db,
    `SELECT rt.*, u.user_id, u.role, u.email FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.user_id
     WHERE rt.token_hash = ?`,
    [tokenHash]);

  if (!tokens.length) {
    logger.security('Invalid refresh token used');
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const tokenRow = tokens[0];
  if (new Date(tokenRow.expires_at) < new Date()) {
    run(db, `DELETE FROM refresh_tokens WHERE token_hash = ?`, [tokenHash]);
    return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
  }

  // SECURITY FIX — A07: Rotate refresh token — invalidate old, issue new
  const newRefreshToken     = generateRefreshToken();
  const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const newExpiry           = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  run(db, `DELETE FROM refresh_tokens WHERE token_hash = ?`, [tokenHash]);
  run(db, `INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)`,
    [newRefreshTokenHash, tokenRow.user_id, newExpiry, new Date().toISOString()]);

  const newAccessToken = generateAccessToken({
    id:    tokenRow.user_id,
    role:  tokenRow.role,
    email: tokenRow.email,
  });

  res.json({
    token:        newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn:    3600,
  });
}));

// ── LOGOUT ────────────────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Secure logout — blacklist the current access token's JTI
 * and delete the refresh token from the database. The access token cannot be
 * reused even before its 1-hour expiry.
 */
router.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  // Blacklist the current access token
  if (user.jti) {
    // Get token expiry from the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.decode(token) as any;
        const expiresAt = (decoded?.exp ?? 0) * 1000;
        blacklistToken(user.jti, expiresAt);
      } catch { /* ignore decode errors */ }
    }
  }

  // Delete refresh token from DB
  const db = await getDb();
  run(db, `DELETE FROM refresh_tokens WHERE user_id = ?`, [user.id]);

  logger.audit('User logout', { userId: user.id, email: user.email });

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), user.id, 'LOGOUT', 'user', user.id, 'User logged out']);

  res.json({ message: 'Logged out successfully' });
}));

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post('/register', validate(RegisterSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone, region } = req.body as {
    name: string; email: string; password: string; phone?: string; region?: string;
  };

  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (!isStrongPassword(password))
    return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });

  const db = await getDb();
  const existing = query(db, `SELECT user_id FROM users WHERE email = ?`, [email]);
  if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

  // SECURITY FIX — A08: Never trust client-supplied role — always register as farmer
  const userId = uuidv4();

  // SECURITY FIX — A07: Generate email verification token
  const verifyToken     = crypto.randomBytes(32).toString('hex');
  const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
  const verifyExpiry    = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // SECURITY FIX — A04: Encrypt PII fields before storing
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region, email_verified) VALUES (?,?,?,?,?,?,?,?)`,
    [userId, name, email, encryptField(phone || null), bcrypt.hashSync(password, 10), 'farmer', encryptField(region || null), 0]);

  // Store hashed verification token
  run(db, `INSERT INTO email_verifications (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)`,
    [verifyTokenHash, userId, verifyExpiry, new Date().toISOString()]);

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), userId, 'REGISTER', 'user', userId, 'New farmer account created']);

  // Send verification email (non-blocking — don't fail registration if email fails)
  try {
    await sendVerificationEmail(email, verifyToken);
  } catch (e: any) {
    logger.warn('Verification email failed to send', { email, error: e.message });
  }

  logger.audit('New user registered', { userId, email, role: 'farmer' });

  res.status(201).json({
    message: 'Account created successfully. Please check your email to verify your account.',
  });
}));

// ── VERIFY EMAIL ──────────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Email verification endpoint.
 * Token is hashed before lookup — plaintext token is never stored.
 */
router.get('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Verification token required' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const db = await getDb();

  const verifications = query<any>(db,
    `SELECT * FROM email_verifications WHERE token_hash = ?`, [tokenHash]);

  if (!verifications.length || new Date(verifications[0].expires_at) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired verification link' });
  }

  run(db, `UPDATE users SET email_verified = 1 WHERE user_id = ?`, [verifications[0].user_id]);
  run(db, `DELETE FROM email_verifications WHERE token_hash = ?`, [tokenHash]);

  logger.audit('Email verified', { userId: verifications[0].user_id });

  res.json({ message: 'Email verified successfully. You can now log in.' });
}));

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A04/A07: Password reset tokens are now hashed with SHA-256
 * before storage. The plaintext token is sent in the email only.
 * If the DB is compromised, stored hashes cannot be used directly.
 *
 * SECURITY FIX — A07: Per-email rate limiting via forgotPasswordLimiter.
 */
router.post('/forgot-password', forgotPasswordLimiter, validate(ForgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };

    const db = await getDb();
    const users = query<any>(db, `SELECT user_id FROM users WHERE email = ?`, [email]);

    // SECURITY FIX — A07: Always return same message to prevent email enumeration
    if (!users.length) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token     = crypto.randomBytes(32).toString('hex');
    // SECURITY FIX — A04: Hash the token before storing — plaintext never in DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires   = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    run(db, `DELETE FROM password_resets WHERE user_id = ?`, [users[0].user_id]);
    // Store HASH, not plaintext token
    run(db, `INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)`,
      [tokenHash, users[0].user_id, expires]);

    try {
      await sendPasswordResetEmail(email, token); // Send plaintext token in email
    } catch (e: any) {
      logger.error('Password reset email failed', { email, error: e.message });
      return res.status(500).json({ error: 'Failed to send reset email.' });
    }

    logger.audit('Password reset requested', { email });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  })
);

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A04: Look up reset token by its SHA-256 hash, not plaintext.
 * The token column in password_resets now stores the hash.
 */
router.post('/reset-password', validate(ResetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });

    // SECURITY FIX — A04: Hash the incoming token and look up by hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const db = await getDb();
    // SECURITY FIX — A04: Query by token_hash column (not plaintext token)
    const resets = query<any>(db, `SELECT * FROM password_resets WHERE token_hash = ?`, [tokenHash]);
    const reset = resets[0];

    if (!reset || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    run(db, `UPDATE users SET password_hash = ? WHERE user_id = ?`,
      [bcrypt.hashSync(password, 10), reset.user_id]);
    run(db, `DELETE FROM password_resets WHERE token_hash = ?`, [tokenHash]);

    // SECURITY FIX — A07: Invalidate all refresh tokens on password reset
    run(db, `DELETE FROM refresh_tokens WHERE user_id = ?`, [reset.user_id]);

    logger.audit('Password reset completed', { userId: reset.user_id });

    res.json({ message: 'Password updated successfully' });
  })
);

export default router;
