import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Farmer gets their own fields
router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  res.json(query(db, `SELECT * FROM farm_fields WHERE farmer_id = ? ORDER BY created_at DESC`, [req.user!.id]));
});

// Admin gets all fields with farmer info
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { region } = req.query;
  let sql = `
    SELECT f.*, u.full_name as farmer_name, u.phone_number as farmer_phone, fa.region as farmer_region
    FROM farm_fields f
    JOIN users u ON u.user_id = f.farmer_id
    LEFT JOIN farmers fa ON fa.farmer_id = f.farmer_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (region) { sql += ' AND fa.region LIKE ?'; params.push(`%${region}%`); }
  sql += ' ORDER BY f.created_at DESC';
  res.json(query(db, sql, params));
});

// Summary for municipality
router.get('/summary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  res.json(query(db, `
    SELECT
      fa.region,
      f.crop_type,
      COUNT(*) as field_count,
      ROUND(SUM(f.area_hectares), 2) as total_hectares,
      ROUND(AVG(f.area_hectares), 2) as avg_field_size
    FROM farm_fields f
    LEFT JOIN farmers fa ON fa.farmer_id = f.farmer_id
    GROUP BY fa.region, f.crop_type
    ORDER BY total_hectares DESC
  `));
});

// Create field
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
  if (!field_name || !crop_type || !area_hectares)
    return res.status(400).json({ error: 'field_name, crop_type and area_hectares are required' });
  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO farm_fields (field_id, farmer_id, field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, field_name, crop_type, area_hectares, gps_lat || null, gps_lng || null, soil_type || null, irrigation || 'none', notes || null]
  );
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'REGISTER_FIELD', 'farm_field', id, `Registered field: ${field_name} (${area_hectares}ha, ${crop_type})`]);
  res.status(201).json({ id, message: 'Field registered' });
});

// Update field
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
  const db = await getDb();
  run(db,
    `UPDATE farm_fields SET field_name=?, crop_type=?, area_hectares=?, gps_lat=?, gps_lng=?, soil_type=?, irrigation=?, notes=?, updated_at=datetime('now')
     WHERE field_id=? AND farmer_id=?`,
    [field_name, crop_type, area_hectares, gps_lat || null, gps_lng || null, soil_type || null, irrigation || 'none', notes || null, req.params.id, req.user!.id]
  );
  res.json({ message: 'Field updated' });
});

// Delete field
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM farm_fields WHERE field_id=? AND (farmer_id=? OR ? IN ('admin','officer'))`,
    [req.params.id, req.user!.id, req.user!.role]);
  res.json({ message: 'Field deleted' });
});

export default router;
