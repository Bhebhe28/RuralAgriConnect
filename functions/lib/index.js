"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file (for local development)
dotenv_1.default.config();
// For deployed Cloud Functions, Firebase config is loaded automatically
// and merged with process.env by the Firebase runtime
// The .env file won't be deployed, so we rely on firebase functions:config:set
// Helper to safely get IP address for rate limiting (handles IPv6)
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
}
// Init Firebase Admin — use projectId only, matching the local server pattern.
// This uses public-key verification for ID tokens without requiring service account credentials.
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'ruralagriconnect-15c7c' });
}
const auth_1 = __importDefault(require("./routes/auth"));
const advisories_1 = __importDefault(require("./routes/advisories"));
const weather_1 = __importDefault(require("./routes/weather"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const sync_1 = __importDefault(require("./routes/sync"));
const chat_1 = __importDefault(require("./routes/chat"));
const outbreaks_1 = __importDefault(require("./routes/outbreaks"));
const community_1 = __importDefault(require("./routes/community"));
const yields_1 = __importDefault(require("./routes/yields"));
const subsidies_1 = __importDefault(require("./routes/subsidies"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const fields_1 = __importDefault(require("./routes/fields"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const securityLog_1 = __importDefault(require("./routes/securityLog"));
const app = (0, express_1.default)();
// A04: Enable CSP via helmet instead of using defaults
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com', 'https://api.open-meteo.com'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
const PROD_ORIGINS = [
    'https://ruralagriconnect-15c7c.web.app',
    'https://ruralagriconnect-15c7c.firebaseapp.com',
];
// A05: Localhost only allowed in development — never in production
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? PROD_ORIGINS
    : [...PROD_ORIGINS, 'http://localhost:5173', 'http://localhost:4173'];
app.use((0, cors_1.default)({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
// Debug middleware - log all requests
app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.path}`);
    next();
});
// A07: Auth rate limiter — 10 attempts per 15 min
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, max: 10,
    message: { error: 'Too many attempts, please try again in 15 minutes.' },
    standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    skip: (req) => false,
});
// A07: Stricter limit for password reset — prevents email bombing
const resetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, max: 5,
    message: { error: 'Too many reset requests, please try again in 1 hour.' },
    standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    skip: (req) => false,
});
// A04: Rate limit AI endpoints — prevents quota exhaustion per user
const chatLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, max: 20,
    message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
    standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    skip: (req) => false,
});
// A04: Rate limit community writes — prevents spam
const communityWriteLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, max: 10,
    message: { error: 'Too many posts. Please slow down.' },
    standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    skip: (req) => false,
});
app.use('/auth/forgot-password', resetLimiter);
app.use('/auth/reset-password', resetLimiter);
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/advisories', advisories_1.default);
app.use('/api/weather', weather_1.default);
app.use('/api/users', users_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/sync', sync_1.default);
app.use('/api/chat', chatLimiter, chat_1.default);
app.use('/api/outbreaks', outbreaks_1.default);
app.use('/api/community', communityWriteLimiter, community_1.default);
app.use('/api/yields', yields_1.default);
app.use('/api/subsidies', subsidies_1.default);
app.use('/api/calendar', calendar_1.default);
app.use('/api/fields', fields_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/security-log', securityLog_1.default);
// A05: Health endpoint — no internal implementation details exposed
// Updated: routes now under /api prefix
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
// Test endpoint — should always return 200
app.get('/test', (_, res) => res.json({ test: 'ok' }));
exports.api = functions
    .region('us-central1')
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onRequest(app);
//# sourceMappingURL=index.js.map