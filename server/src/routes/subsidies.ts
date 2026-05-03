import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const RESOURCE_TYPES = ['Seeds', 'Fertilizer', 'Pesticide', 'Irrigation Equipment', 'Tools & Equipment', 'Animal Feed', 'Other'];

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { resource_type, quantity, reason } = req.body;
  if (!resource_type || !quantity || !reason)
    return res.status(400).json({ error: 'resource_type, quantity and reason are required' });

  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO subsidy_requests (request_id, farmer_id, resource_type, quantity, reason, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, resource_type, quantity, reason, 'pending', now, now]);
  res.status(201).json({ id, message: 'Request submitted successfully' });
});

router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const requests = query<any>(db,
    `SELECT * FROM subsidy_requests WHERE farmer_id = ? ORDER BY created_at DESC`,
    [req.user!.id]);
  res.json(requests.map(r => ({ ...r, id: r.request_id })));
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT sr.*, u.full_name as farmer_name, u.email as farmer_email FROM subsidy_requests sr LEFT JOIN users u ON sr.farmer_id = u.user_id WHERE 1=1`;
  const params: any[] = [];
  if (req.query.status) { sql += ` AND sr.status = ?`; params.push(req.query.status); }
  sql += ` ORDER BY sr.created_at DESC`;
  const requests = query<any>(db, sql, params);
  res.json(requests.map(r => ({ ...r, id: r.request_id })));
});

router.put('/:id/review', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, review_notes } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status))
    return res.status(400).json({ error: 'status must be approved, rejected or pending' });

  const db = await getDb();
  const now = new Date().toISOString();
  run(db, `UPDATE subsidy_requests SET status=?, reviewed_by=?, review_notes=?, updated_at=? WHERE request_id=?`,
    [status, req.user!.id, review_notes || null, now, req.params.id]);

  // Notify farmer
  const requests = query<any>(db, `SELECT farmer_id FROM subsidy_requests WHERE request_id = ?`, [req.params.id]);
  if (requests.length) {
    run(db, `INSERT INTO notifications (notif_id, user_id, title, message, channel, status, read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), requests[0].farmer_id,
       `Subsidy Request ${status}`,
       `Your resource request has been ${status}`,
       'app', 'pending', 0, now]);
  }

  res.json({ message: `Request ${status}` });
});

router.get('/resource-types', authenticate, (_req, res) => res.json(RESOURCE_TYPES));

export default router;
