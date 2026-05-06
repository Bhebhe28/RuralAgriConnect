import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { fetchLiveOutbreakAlerts } from '../services/outbreakFeedService';

const router = Router();

// ── Shared sync logic — used by auto-sync AND the manual admin button ─────────
export async function syncOutbreaksAndNotify(): Promise<number> {
  const alerts = await fetchLiveOutbreakAlerts();
  if (alerts.length === 0) return 0;

  const db = await getDb();

  // Track descriptions already in DB so we only notify for genuinely NEW ones
  const existing = query<any>(db, `SELECT description FROM pest_outbreaks WHERE reported_by IS NULL`, []);
  const existingDescs = new Set(existing.map((r: any) => r.description));

  const newAlerts = alerts.filter(a => !existingDescs.has(a.description));

  // Replace old feed outbreaks with fresh ones
  run(db, `DELETE FROM pest_outbreaks WHERE reported_by IS NULL`);
  const now = new Date().toISOString();
  for (const a of alerts) {
    run(db,
      `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_date) VALUES (?,?,?,?,?,?)`,
      [uuidv4(), a.region, a.crop_type, a.description, a.severity,
       a.observed_on ? new Date(a.observed_on).toISOString() : now]);
  }

  // Notify every farmer about each NEW outbreak
  if (newAlerts.length > 0) {
    const farmers = query<any>(db, `SELECT user_id FROM users WHERE role = 'farmer'`, []);
    for (const a of newAlerts) {
      const district = a.region.split('— ')[1] || a.region;
      const title    = `⚠️ ${a.severity === 'critical' ? '🚨' : ''} ${a.crop_type} Outbreak — ${district}`;
      const message  = a.description.slice(0, 200);
      for (const farmer of farmers) {
        run(db,
          `INSERT INTO notifications (notif_id, user_id, title, message, channel, status, read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
          [uuidv4(), farmer.user_id, title, message, 'app', 'pending', 0, now]);
      }
    }
    console.log(`[Outbreaks] Notified ${farmers.length} farmers about ${newAlerts.length} new outbreak(s)`);
  }

  return alerts.length;
}

// ── Seed realistic KZN outbreaks when table is empty ─────────────────────────
const SEED_OUTBREAKS = [
  {
    region: 'KwaZulu-Natal — uMgungundlovu', crop_type: 'Maize', severity: 'critical',
    description: '🐛 Fall Armyworm (Spodoptera frugiperda) detected across multiple maize fields. Look for ragged leaf damage and frass inside whorls. Apply Coragen or Ampligo insecticide early morning when larvae are active. Scout every 7 days and treat when infestation exceeds 8 larvae per 100 plants.',
  },
  {
    region: 'KwaZulu-Natal — eThekwini', crop_type: 'Vegetables', severity: 'warning',
    description: '🪲 Heavy whitefly infestation reported on tomato and pepper crops. Leaves show yellowing and sticky honeydew with sooty mould. Apply imidacloprid or use yellow sticky traps. Remove heavily infested leaves and avoid over-fertilising with nitrogen.',
  },
  {
    region: 'KwaZulu-Natal — iLembe', crop_type: 'Legumes', severity: 'warning',
    description: '🌿 Aphid colonies spreading on bean and soybean crops. Check undersides of leaves for dense colonies. Apply dimethoate or pyrethroid spray in the morning. Natural predators (ladybirds) are present — use selective pesticides to preserve them.',
  },
  {
    region: 'KwaZulu-Natal — Zululand', crop_type: 'Root Crops', severity: 'info',
    description: 'ℹ️ Late blight (Phytophthora infestans) risk elevated on potato crops following high humidity. Apply copper oxychloride or mancozeb fungicide preventatively every 7–10 days. Avoid overhead irrigation and remove infected foliage immediately to slow spread.',
  },
  {
    region: 'KwaZulu-Natal — uThukela', crop_type: 'Maize', severity: 'warning',
    description: '⚠️ Diplodia stem rot observed in maize following prolonged wet weather. Affected stalks show brown discolouration at lower nodes and may lodge. Harvest early where possible. Plant resistant varieties next season and rotate with legumes to break the disease cycle.',
  },
];

async function seedIfEmpty(db: any) {
  const rows = query<any>(db, `SELECT COUNT(*) as count FROM pest_outbreaks`, []);
  if (rows[0]?.count > 0) return;
  const now = new Date().toISOString();
  for (const s of SEED_OUTBREAKS) {
    run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_date) VALUES (?,?,?,?,?,?)`,
      [uuidv4(), s.region, s.crop_type, s.description, s.severity, now]);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  await seedIfEmpty(db);
  let sql = `SELECT * FROM pest_outbreaks WHERE 1=1`;
  const params: any[] = [];
  if (req.query.region)    { sql += ` AND region = ?`;    params.push(req.query.region); }
  if (req.query.crop_type) { sql += ` AND crop_type = ?`; params.push(req.query.crop_type); }
  sql += ` ORDER BY reported_date DESC`;
  const rows = query<any>(db, sql, params);
  res.json(rows.map(r => ({ ...r, id: r.outbreak_id })));
});

// Any farmer OR admin can report an outbreak
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { region, crop_type, description, severity } = req.body;
  if (!region || !crop_type || !description)
    return res.status(400).json({ error: 'region, crop_type and description are required' });

  const db  = await getDb();
  const id  = uuidv4();
  const now = new Date().toISOString();
  const source = req.user!.role === 'admin' ? 'admin' : 'farmer';

  run(db, `INSERT INTO pest_outbreaks (outbreak_id, region, crop_type, description, severity, reported_by, reported_date, source) VALUES (?,?,?,?,?,?,?,?)`,
    [id, region, crop_type, description, severity || 'warning', req.user!.id, now, source]);

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'REPORT_OUTBREAK', 'pest_outbreak', id, `${crop_type} outbreak in ${region}`]);

  // Notify all other farmers
  const farmers = query<any>(db, `SELECT user_id FROM users WHERE role = 'farmer' AND user_id != ?`, [req.user!.id]);
  const district = region.split('— ')[1] || region;
  const title    = `${severity === 'critical' ? '🚨' : '⚠️'} ${crop_type} Outbreak — ${district}`;
  for (const f of farmers) {
    run(db, `INSERT INTO notifications (notif_id, user_id, title, message, channel, status, read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), f.user_id, title, description.slice(0, 200), 'app', 'pending', 0, now]);
  }

  res.status(201).json({ id, message: `Outbreak reported and ${farmers.length} farmers notified` });
});

// Scan history — all authenticated users can view
router.get('/scans', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const rows = query<any>(db,
    `SELECT * FROM crop_scans ORDER BY created_at DESC LIMIT 50`, []);
  res.json(rows.map(r => ({ ...r, id: r.scan_id })));
});

// Admin manual live-feed refresh
router.post('/sync-feed', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const count = await syncOutbreaksAndNotify();
    const db = await getDb();
    const updated = query<any>(db, `SELECT * FROM pest_outbreaks ORDER BY reported_date DESC`, []);
    res.json({
      message: count > 0
        ? `Synced ${count} real observations from iNaturalist — farmers notified`
        : 'No new KZN observations found. Existing data unchanged.',
      count,
      data: updated.map(r => ({ ...r, id: r.outbreak_id })),
    });
  } catch (err: any) {
    console.error('Live feed sync error:', err.message);
    res.status(502).json({ error: 'Feed sync failed', detail: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM pest_outbreaks WHERE outbreak_id = ?`, [req.params.id]);
  res.json({ message: 'Outbreak deleted' });
});

export default router;
