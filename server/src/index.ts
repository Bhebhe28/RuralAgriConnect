import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getFirestore } from './db/firestore';
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

// Init Firestore
try {
  getFirestore();
  console.log('✅ Firestore connected');
} catch (e: any) {
  console.error('❌ Firestore init failed:', e.message);
  process.exit(1);
}

// Seed admin user on first run
async function seedIfEmpty() {
  const { getDocs, setDoc, now } = await import('./db/firestore');
  const bcrypt = await import('bcryptjs');
  const { v4: uuidv4 } = await import('uuid');

  const users = await getDocs('users');
  if (users.length > 0) return;

  console.log('🌱 Seeding initial data...');

  const adminId   = uuidv4();
  const farmer1Id = uuidv4();
  const farmer2Id = uuidv4();

  await setDoc('users', adminId, {
    full_name: 'Admin User', email: 'admin@farm.co.za',
    phone_number: '+27831000001',
    password_hash: bcrypt.hashSync('Admin@123', 10),
    role: 'admin', region: null, avatar_url: null, created_at: now(),
  });
  await setDoc('users', farmer1Id, {
    full_name: 'Sipho Dlamini', email: 'sipho@farm.co.za',
    phone_number: '+27721000001',
    password_hash: bcrypt.hashSync('Farmer@123', 10),
    role: 'farmer', region: 'KwaZulu-Natal — uMgungundlovu',
    avatar_url: null, created_at: now(),
  });
  await setDoc('users', farmer2Id, {
    full_name: 'Nomvula Zulu', email: 'nomvula@farm.co.za',
    phone_number: '+27721000002',
    password_hash: bcrypt.hashSync('Farmer@123', 10),
    role: 'farmer', region: 'KwaZulu-Natal — iLembe',
    avatar_url: null, created_at: now(),
  });

  // Seed advisories
  const adv1 = uuidv4();
  await setDoc('advisories', adv1, {
    title: 'Maize Fall Armyworm Alert',
    content: 'Fall armyworm detected in several maize fields. Apply Coragen or Ampligo early morning.',
    crop_type: 'Maize', region: 'KwaZulu-Natal — eThekwini',
    severity: 'critical', created_by: adminId,
    created_at: now(), updated_at: now(),
  });
  await setDoc('advisories', uuidv4(), {
    title: 'Optimal Planting Window — Vegetables',
    content: 'Ideal conditions for planting tomatoes, spinach, and cabbage.',
    crop_type: 'Vegetables', region: 'KwaZulu-Natal — uMgungundlovu',
    severity: 'info', created_by: adminId,
    created_at: now(), updated_at: now(),
  });

  console.log('✅ Seed complete — admin@farm.co.za / Admin@123');
}

seedIfEmpty().catch(console.error);

// Weather refresh
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
  res.json({ status: 'ok', db: 'firestore', timestamp: new Date().toISOString() })
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 RuralAgriConnect API running on http://localhost:${PORT}`);
});
