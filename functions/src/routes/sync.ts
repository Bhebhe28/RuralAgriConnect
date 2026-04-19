import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, setDoc, now } from '../db/firestore';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/pull', authenticate, async (req: AuthRequest, res: Response) => {
  const since = (req.query.since as string) || '1970-01-01T00:00:00.000Z';

  const [advisories, weatherAlerts, outbreaks, notifications] = await Promise.all([
    getDocs<any>('advisories', [['updated_at', '>', since]]),
    getDocs<any>('alerts', [['alert_type', '==', 'weather'], ['created_at', '>', since]]),
    getDocs<any>('pest_outbreaks', [['reported_date', '>', since]]),
    getDocs<any>('notifications', [['user_id', '==', req.user!.id], ['created_at', '>', since]]),
  ]);

  await setDoc('activity_logs', uuidv4(), {
    user_id: req.user!.id, action: 'SYNC_PULL',
    entity_type: 'sync', entity_id: uuidv4(),
    details: `Sync pull since ${since}`, created_at: now(),
  });

  res.json({ advisories, weatherAlerts, outbreaks, notifications, syncedAt: now() });
});

router.post('/push', authenticate, async (req: AuthRequest, res: Response) => {
  const { actions = [] } = req.body;
  await setDoc('activity_logs', uuidv4(), {
    user_id: req.user!.id, action: 'SYNC_PUSH',
    entity_type: 'sync', entity_id: uuidv4(),
    details: `Push sync: ${actions.length} queued action(s)`, created_at: now(),
  });
  res.json({ message: 'Sync acknowledged', processed: actions.length });
});

export default router;
