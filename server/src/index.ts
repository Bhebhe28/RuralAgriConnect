/**
 * SECURITY FIX — A02/A06/A09/A10: Hardened Express Application Entry Point
 *
 * Fixes applied:
 * 1. A02: Added X-Permitted-Cross-Domain-Policies header via Helmet.
 * 2. A02: Documented crossOriginEmbedderPolicy: false exception.
 * 3. A02: CSP nonce strategy comment — unsafe-inline removed from scriptSrc.
 *    styleSrc still requires unsafe-inline for Tailwind (documented exception).
 * 4. A06: Global rate limiter applied to ALL routes as baseline DoS protection.
 * 5. A06: API versioning added — all routes now under /api/v1/.
 * 6. A09: Structured request logger middleware added.
 * 7. A09: Real-time alerting hook for suspicious activity patterns.
 * 8. A10: Global error handler registered as last middleware.
 * 9. A10: 404 handler for unknown routes.
 * 10. A10: saveDb() wrapped in try/catch to handle filesystem-full errors.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { initDb, getDb, query, run } from './db/database';
import { fetchAndSaveWeather } from './services/weatherService';
import { logger, requestLogger } from './middleware/logger';
import { globalErrorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler';
import { globalLimiter, authLimiter, chatLimiter, communityWriteLimiter, adminLimiter } from './middleware/rateLimiter';
import { authenticate, authenticateOptional, AuthRequest } from './middleware/auth';
import { validate, SecurityLogSchema } from './middleware/validate';

import authRoutes         from './routes/auth';
import mfaRoutes          from './routes/mfa';
import advisoryRoutes     from './routes/advisories';
import weatherRoutes      from './routes/weather';
import userRoutes         from './routes/users';
import notificationRoutes from './routes/notifications';
import syncRoutes         from './routes/sync';
import chatRoutes         from './routes/chat';
import outbreakRoutes, { syncOutbreaksAndNotify } from './routes/outbreaks';
import communityRoutes    from './routes/community';
import yieldRoutes        from './routes/yields';
import subsidyRoutes      from './routes/subsidies';
import calendarRoutes     from './routes/calendar';
import fieldRoutes        from './routes/fields';
import analyticsRoutes    from './routes/analytics';

const app  = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

async function bootstrap() {
  await initDb();
  logger.info('SQLite database ready');

  await seedIfEmpty();

  // Start weather refresh
  setTimeout(() => fetchAndSaveWeather().catch((e: any) => logger.error('Weather refresh failed', { error: e.message })), 5000);
  setInterval(() => fetchAndSaveWeather().catch((e: any) => logger.error('Weather refresh failed', { error: e.message })), 30 * 60 * 1000);

  // Live outbreak feed
  setTimeout(() => syncOutbreaksAndNotify().catch((e: any) => logger.error('Outbreak sync failed', { error: e.message })), 15_000);
  setInterval(() => syncOutbreaksAndNotify().catch((e: any) => logger.error('Outbreak sync failed', { error: e.message })), 24 * 60 * 60 * 1000);

  // ── Security Middleware ────────────────────────────────────────────────────

  /**
   * SECURITY FIX — A02: Helmet with hardened CSP.
   *
   * Key decisions:
   * - scriptSrc: 'self' only — no unsafe-inline. Tailwind is compiled to CSS,
   *   not inline scripts. Any inline scripts should be moved to external files.
   * - styleSrc: unsafe-inline retained for Tailwind utility classes that are
   *   applied via className (not style attributes). This is a documented
   *   exception — a nonce-based approach would require SSR.
   * - crossOriginEmbedderPolicy: false — required for Firebase Auth popup flows.
   *   Firebase Auth uses cross-origin iframes that require COEP to be disabled.
   *   This is a documented, intentional exception.
   * - X-Permitted-Cross-Domain-Policies: none — prevents Flash/PDF cross-domain
   *   policy file attacks (defense-in-depth even though Flash is deprecated).
   */
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        // SECURITY FIX — A02: Removed 'unsafe-inline' from scriptSrc
        scriptSrc:      ["'self'", 'https://www.gstatic.com', 'https://apis.google.com'],
        // Tailwind requires unsafe-inline for utility class styles — documented exception
        styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc:         ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc:     [
          "'self'",
          'https://api.openweathermap.org',
          'https://generativelanguage.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.googleapis.com',
          'https://*.firebaseapp.com',
          'wss://*.firebaseio.com',
        ],
        fontSrc:        ["'self'", 'https:', 'data:'],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // SECURITY FIX — A02: crossOriginEmbedderPolicy disabled for Firebase Auth popups.
    // Firebase Auth uses cross-origin iframes; COEP would break the auth flow.
    // This is an intentional, documented exception — not a misconfiguration.
    crossOriginEmbedderPolicy: false,
    // SECURITY FIX — A02: Add X-Permitted-Cross-Domain-Policies header
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    // Ensure other Helmet defaults are active
    hsts:                  { maxAge: 31536000, includeSubDomains: true },
    noSniff:               true,
    frameguard:            { action: 'deny' },
    xssFilter:             true,
    referrerPolicy:        { policy: 'strict-origin-when-cross-origin' },
  }));

  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ruralagriconnect-15c7c.web.app',
    'https://ruralagriconnect-15c7c.firebaseapp.com',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server / curl
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Allow localhost only in development
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      logger.security('CORS blocked', { origin });
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));

  // SECURITY FIX — A06: Global rate limiter — baseline DoS protection for all routes
  app.use(globalLimiter);

  // SECURITY FIX — A09: Structured HTTP request logger
  app.use(requestLogger);

  app.use(express.json({ limit: '1mb' })); // SECURITY FIX — A05: Limit request body size
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Serve uploaded files (avatars, community images)
  app.use('/avatars',   express.static(path.join(__dirname, '../public/avatars')));
  app.use('/community', express.static(path.join(__dirname, '../public/community')));

  // ── API Routes — versioned under /api/v1 ──────────────────────────────────
  /**
   * SECURITY FIX — A06: API versioning added.
   * All routes are now under /api/v1/. The old /api/ paths are aliased for
   * backward compatibility during the transition period.
   */
  const v1 = express.Router();

  v1.use('/auth',          authLimiter, authRoutes);
  // SECURITY FIX — A07: MFA routes. authenticate is applied per-route inside mfa.ts
  // because /auth/mfa/verify uses mfaToken (not a full JWT) and must not be gated
  v1.use('/auth/mfa',      authLimiter, mfaRoutes);
  v1.use('/advisories',    advisoryRoutes);
  v1.use('/weather',       weatherRoutes);
  v1.use('/users',         userRoutes);
  v1.use('/notifications', notificationRoutes);
  v1.use('/sync',          syncRoutes);
  v1.use('/chat',          chatLimiter, chatRoutes);
  v1.use('/outbreaks',     outbreakRoutes);
  v1.use('/community',     communityWriteLimiter, communityRoutes);
  v1.use('/yields',        yieldRoutes);
  v1.use('/subsidies',     subsidyRoutes);
  v1.use('/calendar',      calendarRoutes);
  v1.use('/fields',        fieldRoutes);
  v1.use('/analytics',     adminLimiter, analyticsRoutes);

  // Mount under both /api/v1 (new) and /api (legacy compatibility)
  app.use('/api/v1', v1);
  app.use('/api',    v1); // Legacy — remove after client migration

  // ── Health endpoint ────────────────────────────────────────────────────────
  // SECURITY FIX — A02: Returns only status and timestamp — no internals
  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  );
  app.get('/api/v1/health', (_req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  );

  // ── Security event sink ────────────────────────────────────────────────────
  /**
   * SECURITY FIX — A09: Client-side security event sink.
   * Receives auth events from the frontend logger and writes them to the
   * server audit log. Validated with Zod schema to prevent log injection.
   * Authentication is optional — allows logging during login/register.
   */
  app.post('/api/security-log', authenticateOptional, validate(SecurityLogSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const { action, detail, timestamp, userAgent } = req.body;
      const db = await getDb();
      const { v4: uuidv4 } = await import('uuid');
      run(db,
        `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
        [uuidv4(), req.user?.id || null,
         `CLIENT_${action.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 50)}`,
         'client', null,
         JSON.stringify({
           detail:    detail    ? String(detail).slice(0, 500)    : null,
           userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
           ts:        timestamp ? String(timestamp).slice(0, 50)  : null,
         })]);
      res.json({ ok: true });
    })
  );
  app.post('/api/v1/security-log', authenticateOptional, validate(SecurityLogSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const { action, detail, timestamp, userAgent } = req.body;
      const db = await getDb();
      const { v4: uuidv4 } = await import('uuid');
      run(db,
        `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
        [uuidv4(), req.user?.id || null,
         `CLIENT_${action.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 50)}`,
         'client', null,
         JSON.stringify({
           detail:    detail    ? String(detail).slice(0, 500)    : null,
           userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
           ts:        timestamp ? String(timestamp).slice(0, 50)  : null,
         })]);
      res.json({ ok: true });
    })
  );

  // ── SECURITY FIX — A09: Suspicious activity alerting ─────────────────────
  // Check for brute-force patterns every 5 minutes and log security alerts
  setInterval(async () => {
    try {
      const db = await getDb();
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const failedLogins = query<any>(db,
        `SELECT details, COUNT(*) as cnt FROM activity_logs
         WHERE action = 'LOGIN_FAILED' AND created_at > ?
         GROUP BY details HAVING cnt >= 3`,
        [fiveMinAgo]);
      if (failedLogins.length > 0) {
        logger.security('Suspicious login pattern detected', {
          affectedAccounts: failedLogins.length,
          totalFailures:    failedLogins.reduce((s: number, r: any) => s + r.cnt, 0),
        });
      }
    } catch { /* non-critical monitoring */ }
  }, 5 * 60 * 1000);

  // ── SECURITY FIX — A09: Log retention — prune logs older than 90 days ────
  setInterval(async () => {
    try {
      const db = await getDb();
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      run(db, `DELETE FROM activity_logs WHERE created_at < ? AND action NOT LIKE 'AUDIT_%'`, [cutoff]);
      logger.info('Log retention: pruned old activity logs');
    } catch (e: any) {
      logger.error('Log retention failed', { error: e.message });
    }
  }, 24 * 60 * 60 * 1000); // Daily

  // ── SECURITY FIX — A10: 404 handler for unknown routes ───────────────────
  app.use(notFoundHandler);

  // ── SECURITY FIX — A10: Global error handler — MUST be last middleware ───
  app.use(globalErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`RuralAgriConnect API running`, { port: PORT, env: process.env.NODE_ENV });
  });
}

async function seedIfEmpty() {
  const bcrypt = await import('bcryptjs');
  const { v4: uuidv4 } = await import('uuid');
  const db = await getDb();

  const existing = query(db, `SELECT user_id FROM users LIMIT 1`);
  if (existing.length > 0) return;

  logger.info('Seeding initial data...');
  const now = new Date().toISOString();

  const adminId   = uuidv4();
  const farmer1Id = uuidv4();
  const farmer2Id = uuidv4();

  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region, email_verified) VALUES (?,?,?,?,?,?,?,?)`,
    [adminId, 'Admin User', 'admin@farm.co.za', '+27831000001', bcrypt.hashSync('Admin@123', 10), 'admin', null, 1]);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region, email_verified) VALUES (?,?,?,?,?,?,?,?)`,
    [farmer1Id, 'Sipho Dlamini', 'sipho@farm.co.za', '+27721000001', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — uMgungundlovu', 1]);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region, email_verified) VALUES (?,?,?,?,?,?,?,?)`,
    [farmer2Id, 'Nomvula Zulu', 'nomvula@farm.co.za', '+27721000002', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — iLembe', 1]);

  const adv1 = uuidv4();
  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [adv1, 'Maize Fall Armyworm Alert',
     'Fall armyworm detected in several maize fields. Apply Coragen or Ampligo early morning.',
     'Maize', 'KwaZulu-Natal — eThekwini', 'critical', adminId, now, now]);
  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'Optimal Planting Window — Vegetables',
     'Ideal conditions for planting tomatoes, spinach, and cabbage.',
     'Vegetables', 'KwaZulu-Natal — uMgungundlovu', 'info', adminId, now, now]);

  logger.info('Seed complete — default accounts created');
}

bootstrap().catch((e) => {
  logger.error('Failed to start server', { error: e.message, stack: e.stack });
  process.exit(1);
});
