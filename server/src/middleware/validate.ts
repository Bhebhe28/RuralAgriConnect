/**
 * SECURITY FIX — A05: Request Schema Validation Middleware
 *
 * Vulnerability: Route handlers manually check individual fields but have no
 * centralized schema enforcement. Fields like `reason` in subsidies, `body` in
 * community posts, and `message` in chat have no max-length limits. A malformed
 * or oversized payload can cause log bloat, performance degradation, or
 * unexpected behavior in downstream services (e.g., Gemini API).
 *
 * Attack scenario: An attacker sends a 10MB `message` field to the chat endpoint.
 * The server passes it to Gemini, exhausting quota and causing a 429 cascade.
 * Or sends a 1MB `reason` field that bloats the SQLite database.
 *
 * Risk severity: MEDIUM-HIGH
 *
 * Remediation: Zod-based schema validation middleware. Each route defines its
 * schema; the middleware validates and returns 400 with field-level errors on
 * failure. Max-length limits are enforced on every free-text field.
 *
 * Why secure: Zod provides type-safe, declarative validation with precise error
 * messages. Centralized validation ensures no field is accidentally left
 * unvalidated when routes are added or modified.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

// ── Validation middleware factory ─────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against the given
 * Zod schema. On failure, returns 400 with structured field errors.
 * On success, replaces req.body with the parsed (type-safe) value.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }
    // Replace body with the parsed, coerced, and stripped value
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters against a schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid query parameters', fields: formatZodErrors(result.error) });
    }
    req.query = result.data as any;
    next();
  };
}

function formatZodErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || 'body';
    out[path] = issue.message;
  }
  return out;
}

// ── Reusable field schemas ────────────────────────────────────────────────────
// SECURITY FIX — A05: Max-length limits on every user-controlled field.
// These limits prevent log bloat, DB bloat, and quota exhaustion attacks.

export const S = {
  // Identity fields
  email:    z.string().email('Invalid email').max(254, 'Email too long').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  name:     z.string().min(1, 'Name required').max(100, 'Name too long').trim(),
  phone:    z.string().max(20, 'Phone too long').optional(),
  region:   z.string().max(100, 'Region too long').optional(),

  // Content fields
  title:    z.string().min(1, 'Title required').max(200, 'Title too long (max 200 chars)').trim(),
  body:     z.string().min(1, 'Body required').max(5000, 'Body too long (max 5000 chars)').trim(),
  content:  z.string().min(1, 'Content required').max(10000, 'Content too long (max 10000 chars)').trim(),
  reason:   z.string().min(1, 'Reason required').max(1000, 'Reason too long (max 1000 chars)').trim(),
  notes:    z.string().max(2000, 'Notes too long').optional(),
  message:  z.string().min(1, 'Message required').max(2000, 'Message too long (max 2000 chars)').trim(),

  // Enum-like fields
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  category: z.enum(['general', 'disease', 'weather', 'market', 'equipment', 'soil']).default('general'),
  role:     z.enum(['farmer', 'admin']),

  // Numeric fields
  hectares: z.number().positive('Must be positive').max(100000, 'Area too large'),
  quantity: z.string().min(1, 'Quantity required').max(100, 'Quantity too long').trim(),

  // Optional URL
  url:      z.string().url('Invalid URL').max(500, 'URL too long').optional(),
};

// ── Route-specific schemas ────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    S.email,
  password: z.string().min(1, 'Password required').max(128, 'Password too long'),
});

export const RegisterSchema = z.object({
  name:     S.name,
  email:    S.email,
  password: S.password,
  phone:    S.phone,
  region:   S.region,
  // SECURITY: role field is accepted but ignored server-side (always set to 'farmer')
  role:     z.string().max(20).optional(),
});

export const ForgotPasswordSchema = z.object({
  email: S.email,
});

export const ResetPasswordSchema = z.object({
  token:    z.string().min(1, 'Token required').max(200, 'Token too long'),
  password: S.password,
});

export const CommunityPostSchema = z.object({
  title:    S.title,
  body:     S.body,
  category: S.category,
});

export const CommunityReplySchema = z.object({
  body: S.body,
});

export const SubsidySchema = z.object({
  resource_type: z.string().min(1, 'Resource type required').max(100, 'Resource type too long'),
  quantity:      S.quantity,
  reason:        S.reason,
});

export const SubsidyReviewSchema = z.object({
  status:       z.enum(['approved', 'rejected', 'pending']),
  review_notes: z.string().max(1000, 'Notes too long').optional(),
});

export const AdvisorySchema = z.object({
  title:    S.title,
  content:  S.content,
  crop:     z.string().min(1, 'Crop required').max(100, 'Crop name too long').trim(),
  region:   z.string().min(1, 'Region required').max(100, 'Region too long').trim(),
  severity: S.severity,
});

export const ChatSchema = z.object({
  message:  S.message,
  language: z.enum(['en', 'zu', 'af', 'st']).default('en'),
  // SECURITY FIX — A05: Validate history structure before passing to Gemini.
  // A malformed history array could cause unexpected SDK behavior or prompt injection.
  history: z.array(
    z.object({
      role:  z.enum(['user', 'model']),
      parts: z.array(z.object({ text: z.string().max(2000) })).max(10),
    })
  ).max(50, 'History too long').optional().default([]),
});

export const FieldSchema = z.object({
  field_name:    z.string().min(1, 'Field name required').max(100, 'Field name too long').trim(),
  crop_type:     z.string().min(1, 'Crop type required').max(100, 'Crop type too long').trim(),
  area_hectares: z.number().positive('Must be positive').max(100000, 'Area too large'),
  gps_lat:       z.number().min(-90).max(90).optional().nullable(),
  gps_lng:       z.number().min(-180).max(180).optional().nullable(),
  soil_type:     z.string().max(100).optional().nullable(),
  irrigation:    z.enum(['none', 'drip', 'sprinkler', 'flood', 'other']).default('none'),
  notes:         S.notes,
});

export const ProfileUpdateSchema = z.object({
  name:   S.name,
  phone:  S.phone,
  region: S.region,
});

export const AlertSchema = z.object({
  alert_type: z.string().max(50).optional(),
  message:    z.string().min(1).max(500).trim(),
  region:     z.string().min(1).max(100).trim(),
  severity:   S.severity,
});

export const SecurityLogSchema = z.object({
  action:    z.string().min(1).max(100).trim(),
  detail:    z.string().max(500).optional(),
  timestamp: z.string().max(50).optional(),
  userAgent: z.string().max(300).optional(),
});
