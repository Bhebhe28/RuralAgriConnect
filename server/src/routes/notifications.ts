import { Router, Response } from 'express';
import { getDocs, updateDoc } from '../db/firestore';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await getDocs<any>('notifications',
    [['user_id', '==', req.user!.id]],
    { field: 'created_at', dir: 'desc' },
    50
  );
  res.json(rows);
});

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await getDocs<any>('notifications', [['user_id', '==', req.user!.id], ['read', '==', false]]);
  await Promise.all(rows.map(r => updateDoc('notifications', r.id, { read: true, status: 'read' })));
  res.json({ message: 'All marked as read' });
});

router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  await updateDoc('notifications', req.params.id, { read: true, status: 'read' });
  res.json({ message: 'Marked as read' });
});

export default router;
