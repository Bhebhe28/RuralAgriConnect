/**
 * Standardized API response helpers.
 * All route handlers use these to ensure a consistent response shape
 * across the entire API — no ad-hoc res.json() calls with custom shapes.
 */

import { Response } from 'express';

/** Send a 200 success response with data payload */
export function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** Send an error response with a consistent shape */
export function error(res: Response, message: string, status = 400, code?: string) {
  return res.status(status).json({ success: false, error: message, code });
}

/** Send a paginated list response */
export function paginated(
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number
) {
  return res.json({
    success: true,
    data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

/** Send a 201 created response */
export function created(res: Response, data: unknown) {
  return success(res, data, 201);
}
