import { Router, Response } from 'express';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get notifications for current user — join advisory title for context
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const rows = query<any>(db, `
    SELECT
      n.id,
      n.user_id,
      COALESCE(a.title, 'System Notification') as title,
      CASE
        WHEN a.title IS NOT NULL THEN 'New advisory: ' || a.title || ' (' || a.crop_type || ')'
        ELSE 'You have a new notification'
      END as message,
      CASE WHEN n.status = 'read' THEN 1 ELSE 0 END as read,
      n.created_at,
      n.channel,
      n.advisory_id
    FROM notification_log n
    LEFT JOIN advisories a ON a.advisory_id = n.advisory_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `, [req.user!.id]);
  res.json(rows);
});

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `UPDATE notification_log SET status='read' WHERE user_id = ?`, [req.user!.id]);
  res.json({ message: 'All marked as read' });
});

router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db,
    `UPDATE notification_log SET status='read', delivered_at=datetime('now') WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user!.id]
  );
  res.json({ message: 'Marked as read' });
});

export default router;
