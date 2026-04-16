import { Router, Response } from 'express';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Pull all data updated since a timestamp
router.get('/pull', authenticate, async (req: AuthRequest, res: Response) => {
  const since = (req.query.since as string) || '1970-01-01';
  const db = await getDb();

  // Log sync activity
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
     VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'SYNC_PULL', 'sync', uuidv4(), `Sync pull since ${since}`]
  );

  res.json({
    advisories:    query(db, `SELECT * FROM advisories    WHERE updated_at  > ?`, [since]),
    weatherAlerts: query(db, `SELECT * FROM alerts        WHERE alert_type='weather' AND created_at > ?`, [since]),
    outbreaks:     query(db, `SELECT * FROM pest_outbreaks WHERE reported_date > ?`, [since]),
    notifications: query(db,
      `SELECT * FROM notification_log WHERE user_id = ? AND created_at > ?`,
      [req.user!.id, since]
    ),
    syncedAt: new Date().toISOString(),
  });
});

// Push — acknowledge offline actions from client
router.post('/push', authenticate, async (req: AuthRequest, res: Response) => {
  const { actions = [] } = req.body as { actions?: Array<{ type: string; payload: any }> };
  const db = await getDb();

  // Log the push sync
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
     VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'SYNC_PUSH', 'sync', uuidv4(),
     `Push sync: ${actions.length} queued action(s)`]
  );

  res.json({ message: 'Sync acknowledged', processed: actions.length });
});

export default router;
