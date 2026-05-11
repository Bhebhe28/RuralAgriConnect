import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Init Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

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

// A07: Auth rate limiter — 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// A07: Stricter limit for password reset — prevents email bombing
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { error: 'Too many reset requests, please try again in 1 hour.' },
  standardHeaders: true, legacyHeaders: false,
});

// A04: Rate limit AI endpoints — prevents Gemini quota exhaustion per user
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.id || req.ip,
});

// A04: Rate limit community writes — prevents spam
const communityWriteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: 'Too many posts. Please slow down.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/auth/forgot-password', resetLimiter);
app.use('/auth/reset-password',  resetLimiter);
app.use('/auth',          authLimiter, authRoutes);
app.use('/advisories',    advisoryRoutes);
app.use('/weather',       weatherRoutes);
app.use('/users',         userRoutes);
app.use('/notifications', notificationRoutes);
app.use('/sync',          syncRoutes);
app.use('/chat',          chatLimiter, chatRoutes);
app.use('/outbreaks',     outbreakRoutes);
app.use('/community',     communityWriteLimiter, communityRoutes);
app.use('/yields',        yieldRoutes);
app.use('/subsidies',     subsidyRoutes);
app.use('/calendar',      calendarRoutes);
app.use('/fields',        fieldRoutes);
app.use('/analytics',     analyticsRoutes);
app.use('/security-log',  securityLogRoutes);

// A05: Health endpoint — no internal implementation details exposed
app.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

export const api = functions
  .region('us-central1')
  .runWith({ memory: '512MB', timeoutSeconds: 60 })
  .https.onRequest(app);

