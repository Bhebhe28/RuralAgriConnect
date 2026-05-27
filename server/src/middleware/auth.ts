/**
 * SECURITY FIX — A07: Authentication Middleware with Token Blacklist
 *
 * Vulnerabilities fixed:
 * 1. No token invalidation on logout — JWT remained valid for 7 days after logout.
 * 2. No account lockout — brute-force was only slowed by rate limiter, not blocked.
 * 3. JWT lifetime was 7 days — too long for a high-risk agricultural app.
 *
 * Attack scenario 1: User logs out. Attacker who intercepted the JWT can still
 * use it for up to 7 days to access the API.
 *
 * Attack scenario 2: Attacker uses 100 IPs to bypass the IP-based rate limiter
 * and brute-force a farmer's password over several hours.
 *
 * Risk severity: HIGH
 *
 * Remediation:
 * 1. In-memory token blacklist: on logout, the token's JTI (JWT ID) is added
 *    to a blacklist. The authenticate middleware rejects blacklisted tokens.
 * 2. Account lockout: after 5 failed login attempts within 15 minutes, the
 *    account is locked for 15 minutes. This is tracked in-memory (production
 *    should use Redis for distributed deployments).
 * 3. JWT lifetime reduced to 1 hour with refresh token rotation.
 * 4. Every JWT now includes a unique JTI (JWT ID) for blacklisting.
 *
 * Why secure: Token blacklisting ensures logout is immediate and permanent.
 * Account lockout prevents brute-force even with IP rotation. Short JWT
 * lifetime limits the window of exposure for stolen tokens.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import * as admin from 'firebase-admin';

// ── Firebase Admin init (lazy, once) ─────────────────────────────────────────
let firebaseAdminInitialized = false;
function getFirebaseAdmin() {
  if (!firebaseAdminInitialized) {
    if (!admin.apps.length) {
      // Use project ID only — sufficient for verifyIdToken without a service account key
      const projectId = process.env.FIREBASE_PROJECT_ID || 'ruralagriconnect-15c7c';
      admin.initializeApp({ projectId });
    }
    firebaseAdminInitialized = true;
  }
  return admin;
}

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string; jti?: string };
}

// ── JWT Secret validation ─────────────────────────────────────────────────────
/**
 * SECURITY FIX — A02: Fail hard if JWT_SECRET is not set or is the placeholder.
 * The server will not start with a weak or missing secret.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change_this_to_a_long_random_secret') {
    throw new Error(
      'JWT_SECRET environment variable is not set or is using the default placeholder. ' +
      'Set a strong secret (32+ random characters) in server/.env'
    );
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security.');
  }
  return secret;
}

// ── Token blacklist ───────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: In-memory token blacklist for immediate logout invalidation.
 *
 * When a user logs out, their token's JTI is added here. The authenticate
 * middleware rejects any token whose JTI is in this set.
 *
 * Production note: For multi-instance deployments, replace this with a Redis
 * SET with TTL equal to the token's remaining lifetime. The current in-memory
 * implementation is correct for single-instance Railway deployments.
 *
 * Memory management: Entries are automatically pruned when their TTL expires
 * to prevent unbounded memory growth.
 */
const tokenBlacklist = new Map<string, number>(); // jti → expiry timestamp (ms)

export function blacklistToken(jti: string, expiresAt: number): void {
  tokenBlacklist.set(jti, expiresAt);
}

export function isTokenBlacklisted(jti: string): boolean {
  const expiry = tokenBlacklist.get(jti);
  if (expiry === undefined) return false;
  // Auto-prune expired entries
  if (Date.now() > expiry) {
    tokenBlacklist.delete(jti);
    return false;
  }
  return true;
}

// Prune expired blacklist entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [jti, expiry] of tokenBlacklist.entries()) {
    if (now > expiry) tokenBlacklist.delete(jti);
  }
}, 10 * 60 * 1000);

// ── Account lockout ───────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Account lockout after repeated failed login attempts.
 *
 * After MAX_ATTEMPTS failed logins within WINDOW_MS, the account is locked
 * for LOCKOUT_MS. This prevents brute-force even with IP rotation.
 *
 * Keyed by email (lowercase) so it works regardless of which IP is used.
 */
const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes lockout

interface LockoutEntry {
  attempts:  number;
  firstAt:   number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LockoutEntry>();

export function recordFailedLogin(email: string): { locked: boolean; remainingMs?: number } {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = loginAttempts.get(key) ?? { attempts: 0, firstAt: now };

  // Reset window if it has expired
  if (now - entry.firstAt > WINDOW_MS) {
    entry.attempts = 0;
    entry.firstAt  = now;
    delete entry.lockedUntil;
  }

  entry.attempts++;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    loginAttempts.set(key, entry);
    logger.security('Account locked after repeated failed logins', { email: key, attempts: entry.attempts });
    return { locked: true, remainingMs: LOCKOUT_MS };
  }

  loginAttempts.set(key, entry);
  return { locked: false };
}

export function isAccountLocked(email: string): { locked: boolean; remainingMs?: number } {
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);
  if (!entry?.lockedUntil) return { locked: false };

  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    loginAttempts.delete(key);
    return { locked: false };
  }
  return { locked: true, remainingMs: remaining };
}

export function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}

// Prune expired lockout entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.lockedUntil && now > entry.lockedUntil) loginAttempts.delete(key);
    else if (now - entry.firstAt > WINDOW_MS && !entry.lockedUntil) loginAttempts.delete(key);
  }
}, 30 * 60 * 1000);

// ── JWT token generation ──────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';

/**
 * SECURITY FIX — A07: Generate a short-lived access token (1 hour) with a
 * unique JTI for blacklisting support. The 7-day lifetime was reduced to
 * limit the exposure window for stolen tokens.
 */
export function generateAccessToken(payload: { id: string; role: string; email: string }): string {
  const jti = uuidv4();
  return jwt.sign(
    { ...payload, jti },
    getJwtSecret(),
    { expiresIn: '1h' } // SECURITY FIX: reduced from 7d to 1h
  );
}

/**
 * SECURITY FIX — A07: Generate a refresh token with a longer lifetime (7 days).
 * Refresh tokens are stored server-side (in the DB) and rotated on each use.
 * This allows "remember me" functionality without long-lived access tokens.
 */
export function generateRefreshToken(): string {
  // Use crypto.randomBytes for a cryptographically secure refresh token
  const crypto = require('crypto');
  return crypto.randomBytes(48).toString('hex');
}

// ── Authentication middleware ─────────────────────────────────────────────────
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // ── Try Firebase ID token first (client uses Firebase Auth) ──
  try {
    const fa = getFirebaseAdmin();
    const decoded = await fa.auth().verifyIdToken(token);

    // Look up role from DB (Firebase token doesn't carry role)
    const { getDb, query } = await import('../db/database');
    const db = await getDb();
    const users = query<any>(db, `SELECT role FROM users WHERE user_id = ?`, [decoded.uid]);
    const role = users[0]?.role || 'farmer';

    req.user = { id: decoded.uid, role, email: decoded.email || '' };
    return next();
  } catch (firebaseErr: any) {
    // Not a Firebase token — fall through to custom JWT check
    if (!firebaseErr.code?.startsWith('auth/')) {
      // Unexpected error (network, etc.) — log but still try JWT
      logger.warn('Firebase token verification error', { error: firebaseErr.message });
    }
  }

  // ── Fall back to custom JWT (server-issued tokens) ────────────
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string; role: string; email: string; jti?: string;
    };

    if ((decoded as any).mfa_pending) {
      return res.status(401).json({ error: 'MFA verification required. Call POST /auth/mfa/verify.' });
    }

    if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }

    req.user = decoded;
    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Admin authorization middleware ────────────────────────────────────────────
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    // SECURITY FIX — A09: Log unauthorized admin access attempts
    logger.security('Unauthorized admin access attempt', {
      userId: req.user?.id ?? null,
      path:   req.path,
      method: req.method,
    });
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
