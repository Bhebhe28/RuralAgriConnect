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

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ruralagriconnect-15c7c.web.app',
    'https://ruralagriconnect-15c7c.firebaseapp.com',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
});

app.use('/auth',          authLimiter, authRoutes);
app.use('/advisories',    advisoryRoutes);
app.use('/weather',       weatherRoutes);
app.use('/users',         userRoutes);
app.use('/notifications', notificationRoutes);
app.use('/sync',          syncRoutes);
app.use('/chat',          chatRoutes);
app.use('/outbreaks',     outbreakRoutes);
app.use('/community',     communityRoutes);
app.use('/yields',        yieldRoutes);
app.use('/subsidies',     subsidyRoutes);
app.use('/calendar',      calendarRoutes);
app.use('/fields',        fieldRoutes);
app.use('/analytics',     analyticsRoutes);

app.get('/health', (_, res) =>
  res.json({ status: 'ok', db: 'firestore', timestamp: new Date().toISOString() })
);

export const api = functions
  .region('us-central1')
  .runWith({ memory: '512MB', timeoutSeconds: 60 })
  .https.onRequest(app);
