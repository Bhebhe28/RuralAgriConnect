import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const fields = query<any>(db,
    `SELECT * FROM farm_fields WHERE farmer_id = ? ORDER BY created_at DESC`,
    [req.user!.id]);
  res.json(fields.map(f => ({ ...f, id: f.field_id })));
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT * FROM farm_fields WHERE 1=1`;
  const params: any[] = [];
  if (req.query.region) {
    sql += ` AND farmer_id IN (SELECT user_id FROM users WHERE region = ?)`;
    params.push(req.query.region);
  }
  sql += ` ORDER BY created_at DESC`;
  const fields = query<any>(db, sql, params);
  res.json(fields.map(f => ({ ...f, id: f.field_id })));
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
  if (!field_name || !crop_type || !area_hectares)
    return res.status(400).json({ error: 'field_name, crop_type and area_hectares are required' });

  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  run(db, `INSERT INTO farm_fields (field_id, farmer_id, field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, field_name, crop_type, parseFloat(area_hectares),
     gps_lat || null, gps_lng || null, soil_type || null, irrigation || 'none', notes || null, now, now]);

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'REGISTER_FIELD', 'farm_field', id,
     `Registered field: ${field_name} (${area_hectares}ha, ${crop_type})`]);

  res.status(201).json({ id, message: 'Field registered' });
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
  const db = await getDb();
  run(db, `UPDATE farm_fields SET field_name=?, crop_type=?, area_hectares=?, gps_lat=?, gps_lng=?, soil_type=?, irrigation=?, notes=?, updated_at=? WHERE field_id=? AND farmer_id=?`,
    [field_name, crop_type, parseFloat(area_hectares), gps_lat || null, gps_lng || null,
     soil_type || null, irrigation || 'none', notes || null, new Date().toISOString(),
     req.params.id, req.user!.id]);
  res.json({ message: 'Field updated' });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM farm_fields WHERE field_id = ? AND farmer_id = ?`, [req.params.id, req.user!.id]);
  res.json({ message: 'Field deleted' });
});

export default router;
