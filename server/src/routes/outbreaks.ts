import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT * FROM pest_outbreaks WHERE 1=1`;
  const params: any[] = [];
  if (req.query.region)    { sql += ` AND region = ?`;    params.push(req.query.region); }
  if (req.query.crop_type) { sql += ` AND crop_type = ?`; params.push(req.query.crop_type); }
  sql += ` ORDER BY reported_date DESC`;
  const rows = query<any>(db, sql, params);
  res.json(rows.map(r => ({ ...r, id: r.outbreak_id })));
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { region, crop_type, description, severity } = req.body;
  if (!region || !crop_type || !description)
    return res.status(400).json({ error: 'region, crop_type and description are required' });

  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_by, reported_date) VALUES (?,?,?,?,?,?,?)`,
    [id, region, crop_type, description, severity || 'warning', req.user!.id, now]);

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'REPORT_OUTBREAK', 'pest_outbreak', id,
     `${crop_type} outbreak in ${region}`]);

  res.status(201).json({ id, message: 'Outbreak reported' });
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM pest_outbreaks WHERE outbreak_id = ?`, [req.params.id]);
  res.json({ message: 'Outbreak deleted' });
});

export default router;
