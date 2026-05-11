import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { initDb, getDb, query, run } from './db/database';
import { fetchAndSaveWeather } from './services/weatherService';

import authRoutes         from './routes/auth';
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
  // Init SQLite
  await initDb();
  console.log('✅ SQLite database ready');

  // Seed initial data if empty
  await seedIfEmpty();

  // Start weather refresh
  setTimeout(() => fetchAndSaveWeather().catch(console.error), 5000);
  setInterval(() => fetchAndSaveWeather().catch(console.error), 30 * 60 * 1000);

  // Live outbreak feed — sync on startup (after 15s) then every 24 hours
  setTimeout(() => syncOutbreaksAndNotify().catch(console.error), 15_000);
  setInterval(() => syncOutbreaksAndNotify().catch(console.error), 24 * 60 * 60 * 1000);

  // Middleware
  // A05: Enable helmet with a proper Content Security Policy instead of disabling it
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Tailwind inline styles
        imgSrc:         ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc:     ["'self'", 'https://api.openweathermap.org', 'https://generativelanguage.googleapis.com', 'https://*.firebaseio.com', 'https://*.googleapis.com'],
        fontSrc:        ["'self'", 'https:', 'data:'],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Firebase Auth popup flows
  }));

  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ruralagriconnect-15c7c.web.app',
    'https://ruralagriconnect-15c7c.firebaseapp.com',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // A05: In production, only allow explicitly listed origins — no wildcard localhost
      if (!origin) return callback(null, true); // allow server-to-server / curl
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Allow localhost only in development
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));

  app.use(express.json());

  // Serve uploaded files (avatars, community images)
  app.use('/avatars',   express.static(path.join(__dirname, '../public/avatars')));
  app.use('/community', express.static(path.join(__dirname, '../public/community')));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    message: { error: 'Too many attempts, please try again in 15 minutes.' },
    standardHeaders: true, legacyHeaders: false,
  });

  // A04: Rate limit AI endpoints — prevents quota exhaustion by a single user
  const chatLimiter = rateLimit({
    windowMs: 60 * 1000, max: 20,
    message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
    standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.id || req.ip, // per-user limit after auth
  });

  // A04: Rate limit community writes — prevents spam
  const communityWriteLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10,
    message: { error: 'Too many posts. Please slow down.' },
    standardHeaders: true, legacyHeaders: false,
  });

  // Routes
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

  // A05: Health endpoint — no internal implementation details exposed
  app.get('/api/health', (_, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  );

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 RuralAgriConnect API running on http://localhost:${PORT}`);
  });
}

async function seedIfEmpty() {
  const bcrypt = await import('bcryptjs');
  const { v4: uuidv4 } = await import('uuid');
  const db = await getDb();

  const existing = query(db, `SELECT user_id FROM users LIMIT 1`);
  if (existing.length > 0) return;

  console.log('🌱 Seeding initial data...');
  const now = new Date().toISOString();

  const adminId   = uuidv4();
  const farmer1Id = uuidv4();
  const farmer2Id = uuidv4();

  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [adminId, 'Admin User', 'admin@farm.co.za', '+27831000001', bcrypt.hashSync('Admin@123', 10), 'admin', null]);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [farmer1Id, 'Sipho Dlamini', 'sipho@farm.co.za', '+27721000001', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — uMgungundlovu']);
  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [farmer2Id, 'Nomvula Zulu', 'nomvula@farm.co.za', '+27721000002', bcrypt.hashSync('Farmer@123', 10), 'farmer', 'KwaZulu-Natal — iLembe']);

  const adv1 = uuidv4();
  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [adv1, 'Maize Fall Armyworm Alert',
     'Fall armyworm detected in several maize fields. Apply Coragen or Ampligo early morning.',
     'Maize', 'KwaZulu-Natal — eThekwini', 'critical', adminId, now, now]);
  run(db, `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), 'Optimal Planting Window — Vegetables',
     'Ideal conditions for planting tomatoes, spinach, and cabbage.',
     'Vegetables', 'KwaZulu-Natal — uMgungundlovu', 'info', adminId, now, now]);

  console.log('✅ Seed complete — default accounts created (see server/.env.example for credentials)');
}

bootstrap().catch((e) => {
  console.error('❌ Failed to start server:', e);
  process.exit(1);
});
