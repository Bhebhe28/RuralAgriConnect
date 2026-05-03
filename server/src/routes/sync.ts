import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/pull', authenticate, async (req: AuthRequest, res: Response) => {
  const since = (req.query.since as string) || '1970-01-01T00:00:00.000Z';
  const db = await getDb();

  const advisories     = query<any>(db, `SELECT * FROM advisories WHERE updated_at > ?`, [since]);
  const weatherAlerts  = query<any>(db, `SELECT * FROM alerts WHERE alert_type = 'weather' AND created_at > ?`, [since]);
  const outbreaks      = query<any>(db, `SELECT * FROM pest_outbreaks WHERE reported_date > ?`, [since]);
  const notifications  = query<any>(db, `SELECT * FROM notifications WHERE user_id = ? AND created_at > ?`, [req.user!.id, since]);

  const now = new Date().toISOString();
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'SYNC_PULL', 'sync', uuidv4(), `Sync pull since ${since}`]);

  res.json({ advisories, weatherAlerts, outbreaks, notifications, syncedAt: now });
});

router.post('/push', authenticate, async (req: AuthRequest, res: Response) => {
  const { actions = [] } = req.body;
  const db = await getDb();
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'SYNC_PUSH', 'sync', uuidv4(),
     `Push sync: ${actions.length} queued action(s)`]);
  res.json({ message: 'Sync acknowledged', processed: actions.length });
});

export default router;
