import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, getDoc, setDoc, updateDoc, now } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const RESOURCE_TYPES = ['Seeds', 'Fertilizer', 'Pesticide', 'Irrigation Equipment', 'Tools & Equipment', 'Animal Feed', 'Other'];

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { resource_type, quantity, reason } = req.body;
  if (!resource_type || !quantity || !reason)
    return res.status(400).json({ error: 'resource_type, quantity and reason are required' });

  const id = uuidv4();
  await setDoc('subsidy_requests', id, {
    farmer_id: req.user!.id, resource_type, quantity, reason,
    status: 'pending', reviewed_by: null, review_notes: null,
    created_at: now(), updated_at: now(),
  });
  res.status(201).json({ id, message: 'Request submitted successfully' });
});

router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const requests = await getDocs<any>('subsidy_requests',
    [['farmer_id', '==', req.user!.id]], { field: 'created_at', dir: 'desc' });
  res.json(requests);
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const filters: any[] = [];
  if (req.query.status) filters.push(['status', '==', req.query.status]);
  const requests = await getDocs<any>('subsidy_requests', filters, { field: 'created_at', dir: 'desc' });
  res.json(requests);
});

router.put('/:id/review', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, review_notes } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status))
    return res.status(400).json({ error: 'status must be approved, rejected or pending' });

  await updateDoc('subsidy_requests', req.params.id, {
    status, reviewed_by: req.user!.id,
    review_notes: review_notes || null, updated_at: now(),
  });

  const request = await getDoc<any>('subsidy_requests', req.params.id);
  if (request) {
    await setDoc('notifications', uuidv4(), {
      user_id: request.farmer_id,
      title: `Subsidy Request ${status}`,
      message: `Your resource request has been ${status}`,
      channel: 'app', status: 'pending', read: false,
      created_at: now(),
    });
  }

  res.json({ message: `Request ${status}` });
});

router.get('/resource-types', authenticate, (_req, res) => res.json(RESOURCE_TYPES));

export default router;
