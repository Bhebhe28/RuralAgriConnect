import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { season, crop_type, region, area_hectares, yield_kg, quality, notes } = req.body;
  if (!season || !crop_type || !region || !area_hectares || !yield_kg)
    return res.status(400).json({ error: 'season, crop_type, region, area_hectares and yield_kg are required' });

  const db = await getDb();
  const id = uuidv4();
  run(db, `INSERT INTO yield_reports (report_id, farmer_id, season, crop_type, region, area_hectares, yield_kg, quality, notes, reported_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, season, crop_type, region, parseFloat(area_hectares),
     parseFloat(yield_kg), quality || 'good', notes || null, new Date().toISOString()]);
  res.status(201).json({ id, message: 'Yield report submitted' });
});

router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const reports = query<any>(db,
    `SELECT * FROM yield_reports WHERE farmer_id = ? ORDER BY reported_at DESC`,
    [req.user!.id]);
  res.json(reports.map(r => ({ ...r, id: r.report_id })));
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT * FROM yield_reports WHERE 1=1`;
  const params: any[] = [];
  if (req.query.region)    { sql += ` AND region = ?`;    params.push(req.query.region); }
  if (req.query.crop_type) { sql += ` AND crop_type = ?`; params.push(req.query.crop_type); }
  if (req.query.season)    { sql += ` AND season = ?`;    params.push(req.query.season); }
  sql += ` ORDER BY reported_at DESC`;
  const reports = query<any>(db, sql, params);
  res.json(reports.map(r => ({ ...r, id: r.report_id })));
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM yield_reports WHERE report_id = ?`, [req.params.id]);
  res.json({ message: 'Report deleted' });
});

export default router;
