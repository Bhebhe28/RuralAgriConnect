/**
 * SECURITY FIX — A10: Global Express Error Handler Middleware
 *
 * Vulnerability: Without a registered error handler, Express falls back to its
 * default HTML error page which includes the full stack trace in development
 * and can leak internal paths, library versions, and logic in production if
 * NODE_ENV is not set correctly.
 *
 * Attack scenario: An attacker triggers an unhandled exception (e.g., by sending
 * a malformed payload that crashes a route handler). Express returns a 500 with
 * the full stack trace, revealing file paths, library versions, and internal logic.
 *
 * Risk severity: HIGH
 *
 * Remediation:
 * 1. Register a 4-argument Express error handler as the LAST middleware.
 * 2. In production, return only a generic error message — never the stack.
 * 3. In development, include the stack for debugging convenience.
 * 4. Log the full error internally using the structured logger.
 * 5. Handle async route errors by wrapping handlers with asyncHandler().
 *
 * Why secure: The client never sees internal implementation details. The full
 * error is still logged server-side for debugging. Async errors are caught
 * before they can crash the process.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';

// ── Production-safe error response ───────────────────────────────────────────

/**
 * SECURITY FIX — A10: Never leak stack traces or internal error details to clients.
 * In production: generic message only.
 * In development: include message and stack for debugging.
 */
export function globalErrorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const status = err.status ?? err.statusCode ?? 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Always log the full error internally
  logger.error('Unhandled route error', {
    message:  err.message,
    code:     err.code ?? null,
    status,
    method:   req.method,
    path:     req.path,
    userId:   (req as any).user?.id ?? null,
    // Stack is logged server-side only — never sent to client
    stack:    err.stack ?? null,
  });

  // SECURITY FIX — A10: Production-safe response — no stack trace, no internal paths
  if (isProd) {
    return res.status(status).json({
      error: status < 500
        ? err.message   // 4xx errors are safe to surface (validation, auth, etc.)
        : 'An internal server error occurred. Please try again later.',
    });
  }

  // Development: include message and stack for debugging
  return res.status(status).json({
    error:   err.message,
    stack:   err.stack,
    code:    err.code ?? null,
  });
}

// ── 404 handler ───────────────────────────────────────────────────────────────
/**
 * SECURITY FIX — A02: Return a clean 404 JSON response for unknown routes
 * instead of Express's default HTML page which leaks the Express version.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

// ── Async route wrapper ───────────────────────────────────────────────────────
/**
 * SECURITY FIX — A10: Wrap async route handlers so any thrown promise rejection
 * is forwarded to the global error handler instead of crashing the process or
 * hanging the request.
 *
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ── Filesystem/DB safe wrapper ────────────────────────────────────────────────
/**
 * SECURITY FIX — A10: Wrap synchronous operations that can throw (filesystem
 * full, SQLite locked, etc.) and convert them to structured error responses
 * instead of crashing the process.
 */
export function safeSync<T>(fn: () => T, fallback: T, context?: string): T {
  try {
    return fn();
  } catch (err: any) {
    logger.error(`safeSync failure${context ? ` in ${context}` : ''}`, {
      message: err.message,
      stack:   err.stack,
    });
    return fallback;
  }
}
