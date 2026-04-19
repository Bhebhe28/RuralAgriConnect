"use strict";
/**
 * Date utility functions used across route handlers and services.
 * Centralizes all date formatting so output is consistent application-wide.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.timeAgo = timeAgo;
exports.isExpired = isExpired;
exports.nowUtc = nowUtc;
/**
 * Format a date string or Date object to DD MMM YYYY (e.g. 15 Apr 2026).
 * Used for advisory published dates and report headers.
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-ZA', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}
/**
 * Return a relative time string (e.g. "2 hours ago", "3 days ago").
 * Used in community posts and notification timestamps.
 */
function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60)
        return 'just now';
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}
/**
 * Check whether a date is in the past (expired).
 * Used for weather alert expiry checks.
 */
function isExpired(date) {
    return new Date(date).getTime() < Date.now();
}
/** Return current UTC datetime string for SQLite DEFAULT values */
function nowUtc() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}
//# sourceMappingURL=dateUtils.js.map