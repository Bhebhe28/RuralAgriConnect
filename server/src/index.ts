import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb, getDb, query } from './db/database';
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

// Init DB
initDb().then(async () => {
  console.log('✅ Database ready');

  // Auto-seed if DB is empty (first deploy)
  const db = await getDb();
  const users = query(db, 'SELECT user_id FROM users LIMIT 1');
  if (users.length === 0) {
    console.log('🌱 Empty database detected — running seed...');
    const { default: seed } = await import('./db/seed');
    await seed();
    console.log('✅ Seed complete');
  }

  // Delay startup weather fetch by 3s to avoid double-fetch on hot reload
  setTimeout(async () => {
    console.log('🌤  Fetching weather data...');
    await fetchAndSaveWeather().catch(console.error);
  }, 3000);

  // Auto-refresh weather every 30 minutes
  setInterval(() => {
    fetchAndSaveWeather().catch(console.error);
  }, 30 * 60 * 1000);

}).catch(console.error);

// Middleware
app.use(helmet({
  // Allow inline styles/scripts needed by the React PWA
  contentSecurityPolicy: false,
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
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.includes('192.168.') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Rate limiting on auth endpoints — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Static file serving
app.use('/avatars', express.static('public/avatars'));
app.use('/community', express.static('public/community'));

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// One-time seed endpoint — open temporarily for initial setup
app.post('/api/seed', async (req, res) => {
  try {
    const { default: seed } = await import('./db/seed');
    await seed();
    res.json({ message: '✅ Database seeded successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

import os from 'os';

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`🌿 RuralAgriConnect API running on http://localhost:${PORT}`);
  console.log(`📱 Network access: http://${ip}:${PORT}`);
});
