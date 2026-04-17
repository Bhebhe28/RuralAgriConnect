import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, setDoc, deleteDoc, now } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const filters: any[] = [];
  if (req.query.region)    filters.push(['region', '==', req.query.region]);
  if (req.query.crop_type) filters.push(['crop_type', '==', req.query.crop_type]);
  const rows = await getDocs<any>('pest_outbreaks', filters, { field: 'reported_date', dir: 'desc' });
  res.json(rows);
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { region, crop_type, description, severity } = req.body;
  if (!region || !crop_type || !description)
    return res.status(400).json({ error: 'region, crop_type and description are required' });

  const id = uuidv4();
  await setDoc('pest_outbreaks', id, {
    region, crop_type, description,
    severity:      severity || 'warning',
    reported_by:   req.user!.id,
    reported_date: now(),
  });
  await setDoc('activity_logs', uuidv4(), {
    user_id: req.user!.id, action: 'REPORT_OUTBREAK',
    entity_type: 'pest_outbreak', entity_id: id,
    details: `${crop_type} outbreak in ${region}`, created_at: now(),
  });
  res.status(201).json({ id, message: 'Outbreak reported' });
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await deleteDoc('pest_outbreaks', req.params.id);
  res.json({ message: 'Outbreak deleted' });
});

export default router;
