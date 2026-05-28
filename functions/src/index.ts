import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables from .env file (for local development)
dotenv.config();

// For deployed Cloud Functions, Firebase config is loaded automatically
// and merged with process.env by the Firebase runtime
// The .env file won't be deployed, so we rely on firebase functions:config:set

// Helper to safely get IP address for rate limiting (handles IPv6)
function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

// Init Firebase Admin — use projectId only, matching the local server pattern.
// This uses public-key verification for ID tokens without requiring service account credentials.
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ruralagriconnect-15c7c' });
}

import { authenticate, authenticateOptional, AuthRequest } from './middleware/auth';
import authRoutes         from './routes/auth';
import advisoryRoutes     from './routes/advisories';
import weatherRoutes      from './routes/weather';
import userRoutes         from './routes/users';
import notificationRoutes from './routes/notifications';
import syncRoutes         from './routes/sync';
import chatRoutes         from './routes/chat';
import outbreakRoutes     from './routes/outbreaks';
import communityRoutes    from './routes/community';
import yieldRoutes        from './routes/yields';
import subsidyRoutes      from './routes/subsidies';
import calendarRoutes     from './routes/calendar';
import fieldRoutes        from './routes/fields';
import analyticsRoutes    from './routes/analytics';
import securityLogRoutes  from './routes/securityLog';

const app = express();

// A04: Enable CSP via helmet instead of using defaults
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],
      imgSrc:         ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc:     ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com', 'https://api.open-meteo.com'],
      fontSrc:        ["'self'", 'https:', 'data:'],
      objectSrc:      ["'none'"],
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

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  next();
});

// A07: Auth rate limiter — 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => false,
});

// A07: Stricter limit for password reset — prevents email bombing
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { error: 'Too many reset requests, please try again in 1 hour.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => false,
});

// A04: Rate limit AI endpoints — prevents quota exhaustion per user
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => false,
});

// A04: Rate limit community writes — prevents spam
const communityWriteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: 'Too many posts. Please slow down.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => false,
});

app.use('/auth/forgot-password', resetLimiter);
app.use('/auth/reset-password',  resetLimiter);
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/advisories',    advisoryRoutes);
app.use('/api/weather',       weatherRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sync',          syncRoutes);
app.use('/api/chat',          chatLimiter, chatRoutes);
app.use('/api/outbreaks',     outbreakRoutes);
app.use('/api/community',     communityWriteLimiter, communityRoutes);
app.use('/api/yields',        yieldRoutes);
app.use('/api/subsidies',     subsidyRoutes);
app.use('/api/calendar',      calendarRoutes);
app.use('/api/fields',        fieldRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/security-log',  securityLogRoutes);

// A05: Health endpoint — no internal implementation details exposed
// Updated: routes now under /api prefix
app.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Test endpoint — should always return 200
app.get('/test', (_, res) =>
  res.json({ test: 'ok' })
);

export const api = functions
  .region('us-central1')
  .runWith({ memory: '512MB', timeoutSeconds: 60 })
  .https.onRequest(app);

