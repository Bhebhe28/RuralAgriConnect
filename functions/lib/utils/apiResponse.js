"use strict";
/**
 * Standardized API response helpers.
 * All route handlers use these to ensure a consistent response shape
 * across the entire API — no ad-hoc res.json() calls with custom shapes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.paginated = paginated;
exports.created = created;
/** Send a 200 success response with data payload */
function success(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
/** Send an error response with a consistent shape */
function error(res, message, status = 400, code) {
    return res.status(status).json({ success: false, error: message, code });
}
/** Send a paginated list response */
function paginated(res, data, total, page, limit) {
    return res.json({
        success: true,
        data,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
}
/** Send a 201 created response */
function created(res, data) {
    return success(res, data, 201);
}
//# sourceMappingURL=apiResponse.js.map