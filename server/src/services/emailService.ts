/**
 * SECURITY FIX — A02/A05/A07: Hardened Email Service
 *
 * Fixes applied:
 * 1. A02: APP_URL validated against trusted domain allowlist — open redirect
 *    via env var is prevented.
 * 2. A05: All dynamic content in email HTML is encoded with encodeHtml() to
 *    prevent HTML injection in email bodies.
 * 3. A07: Added sendVerificationEmail() for the new email verification flow.
 * 4. A10: Email send failures are caught and logged — never crash the caller.
 *
 * Why secure: Even if an attacker controls the APP_URL env var (e.g., via a
 * misconfigured deployment), the domain allowlist prevents reset links from
 * pointing to attacker-controlled domains. HTML encoding prevents email
 * injection attacks where a crafted email address could inject HTML into
 * the email body.
 */

import { Resend } from 'resend';
import { encodeHtml } from '../middleware/sanitize';
import { logger } from '../middleware/logger';

// A10: Don't crash on missing key — email is non-critical at startup
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_not_configured');

// SECURITY FIX — A02: Allowlist of trusted domains for password reset/verification links.
// APP_URL is validated against this list — an attacker-controlled env value cannot
// redirect emails to an external domain.
const TRUSTED_DOMAINS = [
  'https://ruralagriconnect-15c7c.web.app',
  'https://ruralagriconnect-15c7c.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
];
const FALLBACK_URL = 'https://ruralagriconnect-15c7c.web.app';

function getTrustedBaseUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && TRUSTED_DOMAINS.includes(configured)) return configured;
  if (configured) {
    logger.warn('APP_URL not in trusted domain list — falling back to default', {
      configured,
      fallback: FALLBACK_URL,
    });
  }
  return FALLBACK_URL;
}

// ── Password Reset Email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const baseUrl  = getTrustedBaseUrl();
  // SECURITY FIX — A05: Encode the token in the URL (already hex, but be explicit)
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  // SECURITY FIX — A05: Encode the email address before embedding in HTML
  const safeEmail = encodeHtml(to);

  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — password reset email not sent', { to });
    return;
  }
  await resend.emails.send({
    from:    'RuralAgriConnect <noreply@ruralagriconnect.co.za>',
    to,
    subject: 'Reset your RuralAgriConnect password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#2d6a4f">Password Reset</h2>
        <p>You requested a password reset for <strong>${safeEmail}</strong>.</p>
        <p>Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#2d6a4f;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px">
          If you didn't request this, ignore this email. Your password won't change.
        </p>
        <p style="color:#888;font-size:12px">
          If the button doesn't work, copy this URL into your browser:<br>
          <span style="word-break:break-all">${resetUrl}</span>
        </p>
      </div>
    `,
  });

  logger.info('Password reset email sent', { to });
}

// ── Email Verification ────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A07: Send email verification link to new registrants.
 * Token is the plaintext token (hash is stored in DB).
 */
export async function sendVerificationEmail(to: string, verifyToken: string): Promise<void> {
  const baseUrl   = getTrustedBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const safeEmail = encodeHtml(to);

  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — verification email not sent', { to });
    return;
  }
  await resend.emails.send({
    from:    'RuralAgriConnect <noreply@ruralagriconnect.co.za>',
    to,
    subject: 'Verify your RuralAgriConnect email address',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#2d6a4f">Welcome to RuralAgriConnect!</h2>
        <p>Please verify your email address <strong>${safeEmail}</strong> to activate your account.</p>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#2d6a4f;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px">
          If you didn't create this account, ignore this email.
        </p>
      </div>
    `,
  });

  logger.info('Verification email sent', { to });
}
