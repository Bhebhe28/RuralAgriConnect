import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All users can view outbreaks
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT p.*, u.full_name as reported_by_name
             FROM pest_outbreaks p
             LEFT JOIN users u ON p.reported_by = u.user_id
             WHERE 1=1`;
  const params: unknown[] = [];
  if (req.query.region)    { sql += ' AND p.region = ?';    params.push(req.query.region); }
  if (req.query.crop_type) { sql += ' AND p.crop_type = ?'; params.push(req.query.crop_type); }
  sql += ' ORDER BY p.reported_date DESC';
  res.json(query(db, sql, params));
});

// Admin/officer can report outbreaks
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { region, crop_type, description, severity } = req.body;
  if (!region || !crop_type || !description)
    return res.status(400).json({ error: 'region, crop_type and description are required' });
  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, reported_by, severity)
     VALUES (?,?,?,?,?,?)`,
    [id, region, crop_type, description, req.user!.id, severity || 'warning']
  );
  // Log activity
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
     VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'REPORT_OUTBREAK', 'pest_outbreak', id, `${crop_type} outbreak in ${region}`]
  );
  res.status(201).json({ id, message: 'Outbreak reported' });
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, 'DELETE FROM pest_outbreaks WHERE outbreak_id = ?', [req.params.id]);
  res.json({ message: 'Outbreak deleted' });
});

export default router;
