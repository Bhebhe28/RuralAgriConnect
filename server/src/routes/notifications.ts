import { Router, Response } from 'express';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const rows = query<any>(db,
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user!.id]);
  res.json(rows.map(r => ({ ...r, id: r.notif_id, read: r.read === 1 })));
});

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `UPDATE notifications SET read = 1, status = 'read' WHERE user_id = ? AND read = 0`,
    [req.user!.id]);
  res.json({ message: 'All marked as read' });
});

router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `UPDATE notifications SET read = 1, status = 'read' WHERE notif_id = ? AND user_id = ?`,
    [req.params.id, req.user!.id]);
  res.json({ message: 'Marked as read' });
});

export default router;
