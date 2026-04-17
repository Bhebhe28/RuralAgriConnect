import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, setDoc, updateDoc, deleteDoc, now } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const fields = await getDocs<any>('farm_fields',
    [['farmer_id', '==', req.user!.id]], { field: 'created_at', dir: 'desc' });
  res.json(fields);
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const filters: any[] = [];
  if (req.query.region) filters.push(['farmer_region', '==', req.query.region]);
  const fields = await getDocs<any>('farm_fields', filters, { field: 'created_at', dir: 'desc' });
  res.json(fields);
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
  if (!field_name || !crop_type || !area_hectares)
    return res.status(400).json({ error: 'field_name, crop_type and area_hectares are required' });

  const id = uuidv4();
  await setDoc('farm_fields', id, {
    farmer_id: req.user!.id, field_name, crop_type,
    area_hectares: parseFloat(area_hectares),
    gps_lat: gps_lat || null, gps_lng: gps_lng || null,
    soil_type: soil_type || null, irrigation: irrigation || 'none',
    notes: notes || null, created_at: now(), updated_at: now(),
  });
  await setDoc('activity_logs', uuidv4(), {
    user_id: req.user!.id, action: 'REGISTER_FIELD',
    entity_type: 'farm_field', entity_id: id,
    details: `Registered field: ${field_name} (${area_hectares}ha, ${crop_type})`,
    created_at: now(),
  });
  res.status(201).json({ id, message: 'Field registered' });
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
  await updateDoc('farm_fields', req.params.id, {
    field_name, crop_type, area_hectares: parseFloat(area_hectares),
    gps_lat: gps_lat || null, gps_lng: gps_lng || null,
    soil_type: soil_type || null, irrigation: irrigation || 'none',
    notes: notes || null, updated_at: now(),
  });
  res.json({ message: 'Field updated' });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  await deleteDoc('farm_fields', req.params.id);
  res.json({ message: 'Field deleted' });
});

export default router;
