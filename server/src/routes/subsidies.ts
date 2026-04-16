import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const RESOURCE_TYPES = ['Seeds', 'Fertilizer', 'Pesticide', 'Irrigation Equipment', 'Tools & Equipment', 'Animal Feed', 'Other'];

// ── Farmer submits a resource request ──────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { resource_type, quantity, reason } = req.body;
  if (!resource_type || !quantity || !reason)
    return res.status(400).json({ error: 'resource_type, quantity and reason are required' });

  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO subsidy_requests (request_id, farmer_id, resource_type, quantity, reason)
     VALUES (?,?,?,?,?)`,
    [id, req.user!.id, resource_type, quantity, reason]
  );
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'SUBSIDY_REQUEST', 'subsidy', id,
     `Requested ${quantity} of ${resource_type}`]
  );
  res.status(201).json({ id, message: 'Request submitted successfully' });
});

// ── Farmer views their own requests ────────────────────────
router.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  res.json(query(db,
    `SELECT s.*, u.full_name as reviewed_by_name
     FROM subsidy_requests s
     LEFT JOIN users u ON u.user_id = s.reviewed_by
     WHERE s.farmer_id = ?
     ORDER BY s.created_at DESC`,
    [req.user!.id]
  ));
});

// ── Admin views all requests ────────────────────────────────
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { status } = req.query;
  let sql = `
    SELECT s.*, u.full_name as farmer_name, u.phone_number as farmer_phone,
           f.region as farmer_region, f.crop_type as farmer_crops,
           r.full_name as reviewed_by_name
    FROM subsidy_requests s
    JOIN users u ON u.user_id = s.farmer_id
    LEFT JOIN farmers f ON f.farmer_id = s.farmer_id
    LEFT JOIN users r ON r.user_id = s.reviewed_by
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.created_at DESC';
  res.json(query(db, sql, params));
});

// ── Admin approves or rejects ───────────────────────────────
router.put('/:id/review', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, review_notes } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status))
    return res.status(400).json({ error: 'status must be approved, rejected or pending' });

  const db = await getDb();
  run(db,
    `UPDATE subsidy_requests
     SET status=?, reviewed_by=?, review_notes=?, updated_at=datetime('now')
     WHERE request_id=?`,
    [status, req.user!.id, review_notes || null, req.params.id]
  );
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, `SUBSIDY_${status.toUpperCase()}`, 'subsidy', req.params.id,
     `Request ${status}: ${review_notes || ''}`]
  );

  // Notify the farmer
  const [req_] = query<any>(db, `SELECT farmer_id FROM subsidy_requests WHERE request_id = ?`, [req.params.id]);
  if (req_) {
    run(db,
      `INSERT INTO notification_log (id, user_id, channel, status, created_at) VALUES (?,?,?,?,datetime('now'))`,
      [uuidv4(), req_.farmer_id, 'app', 'pending']
    );
  }

  res.json({ message: `Request ${status}` });
});

// ── Resource types list ─────────────────────────────────────
router.get('/resource-types', authenticate, (_req, res) => {
  res.json(RESOURCE_TYPES);
});

export default router;
