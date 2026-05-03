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
import outbreakRoutes     from './routes/outbreaks';
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

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));

  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ruralagriconnect-15c7c.web.app',
    'https://ruralagriconnect-15c7c.firebaseapp.com',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
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

  // Routes
  app.use('/api/auth',          authLimiter, authRoutes);
  app.use('/api/advisories',    advisoryRoutes);
  app.use('/api/weather',       weatherRoutes);
  app.use('/api/users',         userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/sync',          syncRoutes);
  app.use('/api/chat',          chatRoutes);
  app.use('/api/outbreaks',     outbreakRoutes);
  app.use('/api/community',     communityRoutes);
  app.use('/api/yields',        yieldRoutes);
  app.use('/api/subsidies',     subsidyRoutes);
  app.use('/api/calendar',      calendarRoutes);
  app.use('/api/fields',        fieldRoutes);
  app.use('/api/analytics',     analyticsRoutes);

  app.get('/api/health', (_, res) =>
    res.json({ status: 'ok', db: 'sqlite', timestamp: new Date().toISOString() })
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

  console.log('✅ Seed complete — admin@farm.co.za / Admin@123');
}

bootstrap().catch((e) => {
  console.error('❌ Failed to start server:', e);
  process.exit(1);
});
