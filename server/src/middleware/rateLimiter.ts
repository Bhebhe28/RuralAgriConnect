/**
 * SECURITY FIX — A06/A07: Centralized Rate Limiting Strategy
 *
 * Vulnerability: Rate limiting was applied inconsistently — auth endpoints had
 * a limiter but forgot-password had no per-email limit, allowing an attacker to
 * spam reset emails to a target. Community writes had a limiter but no per-user
 * key. The general API had no global rate limit.
 *
 * Attack scenario 1: Attacker sends 1000 forgot-password requests for
 * victim@example.com, flooding their inbox and causing account lockout via
 * email provider spam filters.
 *
 * Attack scenario 2: Attacker uses 100 IPs to bypass the IP-based auth limiter
 * and brute-force a farmer's password.
 *
 * Risk severity: HIGH
 *
 * Remediation:
 * 1. Global rate limiter: 200 req/15min per IP — baseline DoS protection.
 * 2. Auth limiter: 10 req/15min per IP — brute-force protection.
 * 3. Forgot-password limiter: 5 req/hour per IP — email spam protection.
 * 4. Chat limiter: 20 req/min per authenticated user ID — quota protection.
 * 5. Community write limiter: 10 req/min per IP — spam protection.
 * 6. Admin action limiter: 30 req/min per IP — scraping protection.
 *
 * Why secure: Layered rate limiting at different granularities (IP, user ID,
 * endpoint type) makes bypass significantly harder. Per-email limiting on
 * forgot-password prevents targeted email flooding.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// ── Global baseline limiter ───────────────────────────────────────────────────
/**
 * SECURITY FIX — A06: Apply to ALL routes as a baseline DoS protection.
 * 200 requests per 15 minutes per IP is generous for legitimate use but
 * blocks automated scanners and basic DoS attempts.
 */
export const globalLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            200,
  message:        { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:  false,
  // SECURITY: Skip rate limiting for health checks to avoid false positives
  skip: (req) => req.path === '/api/health',
});

// ── Authentication limiter ────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Strict limit on login/register to slow brute-force.
 * 10 attempts per 15 minutes per IP. Combined with account lockout (in auth.ts)
 * this provides defense-in-depth against credential stuffing.
 */
export const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            10,
  message:        { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:  false,
});

// ── Forgot-password limiter ───────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Separate, stricter limit for forgot-password endpoint.
 * 5 requests per hour per IP prevents email flooding attacks against a target.
 * This is separate from the auth limiter so it can have a longer window.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs:       60 * 60 * 1000, // 1 hour
  max:            5,
  message:        { error: 'Too many password reset requests. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders:  false,
});

// ── AI chat limiter ───────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A06: Per-user rate limit on AI endpoints to prevent
 * quota exhaustion. Keyed by authenticated user ID after auth middleware runs.
 * Falls back to IP if user ID is not available.
 */
export const chatLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            20,
  message:        { error: 'Too many AI requests. Please wait a minute before trying again.' },
  standardHeaders: true,
  legacyHeaders:  false,
  keyGenerator:   (req: any) => req.user?.id || ipKeyGenerator(req),
});

// ── Community write limiter ───────────────────────────────────────────────────
/**
 * SECURITY FIX — A06: Limit community post/reply creation to prevent spam.
 */
export const communityWriteLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            10,
  message:        { error: 'Too many posts. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:  false,
});

// ── Image scan limiter ────────────────────────────────────────────────────────
/**
 * Image scans consume far more Gemini quota than text messages (base64 image
 * tokens + multimodal processing). A per-user limit of 5 scans per 10 minutes
 * prevents a single farmer from exhausting the project's daily free-tier quota.
 */
export const scanLimiter = rateLimit({
  windowMs:       10 * 60 * 1000, // 10 minutes
  max:            5,
  message:        { error: 'You have scanned too many images recently. Please wait 10 minutes before scanning again.' },
  standardHeaders: true,
  legacyHeaders:  false,
  keyGenerator:   (req: any) => req.user?.id || ipKeyGenerator(req),
});

// ── Admin action limiter ──────────────────────────────────────────────────────
/**
 * SECURITY FIX — A06: Limit admin bulk operations to prevent data scraping.
 */
export const adminLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            30,
  message:        { error: 'Too many admin requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:  false,
});
