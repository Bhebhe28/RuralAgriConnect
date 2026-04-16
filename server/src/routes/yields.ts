import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Farmer submits a yield report ──────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { season, crop_type, region, area_hectares, yield_kg, quality, notes } = req.body;
  if (!season || !crop_type || !region || !area_hectares || !yield_kg)
    return res.status(400).json({ error: 'season, crop_type, region, area_hectares and yield_kg are required' });

  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO yield_reports (report_id, farmer_id, season, crop_type, region, area_hectares, yield_kg, quality, notes)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, season, crop_type, region, area_hectares, yield_kg, quality || 'good', notes || null]
  );
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'SUBMIT_YIELD', 'yield_report', id,
     `${crop_type} yield: ${yield_kg}kg from ${area_hectares}ha in ${region}`]
  );
  res.status(201).json({ id, message: 'Yield report submitted' });
});

// ── Farmer views their own reports ─────────────────────────
router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  res.json(query(db,
    `SELECT * FROM yield_reports WHERE farmer_id = ? ORDER BY reported_at DESC`,
    [req.user!.id]
  ));
});

// ── Admin views all reports with farmer info ────────────────
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { region, crop_type, season } = req.query;
  let sql = `
    SELECT y.*, u.full_name as farmer_name, u.phone_number as farmer_phone
    FROM yield_reports y
    JOIN users u ON u.user_id = y.farmer_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (region)    { sql += ' AND y.region = ?';    params.push(region); }
  if (crop_type) { sql += ' AND y.crop_type = ?'; params.push(crop_type); }
  if (season)    { sql += ' AND y.season = ?';    params.push(season); }
  sql += ' ORDER BY y.reported_at DESC';
  res.json(query(db, sql, params));
});

// ── Municipality summary stats ──────────────────────────────
router.get('/summary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const summary = query(db, `
    SELECT
      crop_type,
      region,
      season,
      COUNT(*) as farm_count,
      ROUND(SUM(area_hectares), 2) as total_hectares,
      ROUND(SUM(yield_kg), 2) as total_yield_kg,
      ROUND(AVG(yield_kg / area_hectares), 2) as avg_yield_per_ha
    FROM yield_reports
    GROUP BY crop_type, region, season
    ORDER BY season DESC, total_yield_kg DESC
  `);
  res.json(summary);
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, 'DELETE FROM yield_reports WHERE report_id = ?', [req.params.id]);
  res.json({ message: 'Report deleted' });
});

export default router;
