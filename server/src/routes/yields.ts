import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, setDoc, deleteDoc, now } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { season, crop_type, region, area_hectares, yield_kg, quality, notes } = req.body;
  if (!season || !crop_type || !region || !area_hectares || !yield_kg)
    return res.status(400).json({ error: 'season, crop_type, region, area_hectares and yield_kg are required' });

  const id = uuidv4();
  await setDoc('yield_reports', id, {
    farmer_id: req.user!.id, season, crop_type, region,
    area_hectares: parseFloat(area_hectares),
    yield_kg: parseFloat(yield_kg),
    quality: quality || 'good', notes: notes || null,
    reported_at: now(),
  });
  res.status(201).json({ id, message: 'Yield report submitted' });
});

router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const reports = await getDocs<any>('yield_reports',
    [['farmer_id', '==', req.user!.id]], { field: 'reported_at', dir: 'desc' });
  res.json(reports);
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const filters: any[] = [];
  if (req.query.region)    filters.push(['region', '==', req.query.region]);
  if (req.query.crop_type) filters.push(['crop_type', '==', req.query.crop_type]);
  if (req.query.season)    filters.push(['season', '==', req.query.season]);
  const reports = await getDocs<any>('yield_reports', filters, { field: 'reported_at', dir: 'desc' });
  res.json(reports);
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await deleteDoc('yield_reports', req.params.id);
  res.json({ message: 'Report deleted' });
});

export default router;
