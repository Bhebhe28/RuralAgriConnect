import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { fetchAndSaveWeather } from '../services/weatherService';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT * FROM weather_data WHERE 1=1`;
  const params: any[] = [];
  if (req.query.region) { sql += ` AND region = ?`; params.push(req.query.region); }
  sql += ` ORDER BY forecast_date DESC`;
  let rows = query<any>(db, sql, params);

  // Deduplicate — keep latest per region
  const seen = new Set<string>();
  rows = rows.filter((r: any) => {
    if (seen.has(r.region)) return false;
    seen.add(r.region);
    return true;
  });

  if (rows.length === 0) {
    const fresh = await fetchAndSaveWeather();
    return res.json(fresh);
  }
  res.json(rows.map(r => ({ ...r, id: r.weather_id })));
});

router.get('/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let alerts = query<any>(db, `SELECT * FROM alerts WHERE alert_type = 'weather' ORDER BY created_at DESC`);
  if (req.query.region) {
    alerts = alerts.filter((a: any) => a.message?.includes(req.query.region as string));
  }
  res.json(alerts.map(a => ({ ...a, id: a.alert_id })));
});

router.post('/refresh', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const results = await fetchAndSaveWeather();
    res.json({ message: `Weather refreshed for ${results.length} regions`, data: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Weather refresh failed', detail: err.message });
  }
});

router.post('/alerts', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { alert_type, message, region, severity } = req.body;
  if (!message || !region) return res.status(400).json({ error: 'message and region are required' });

  const db = await getDb();
  const id = uuidv4();
  run(db, `INSERT INTO alerts (alert_id, alert_type, message, issued_by, severity, created_at) VALUES (?,?,?,?,?,?)`,
    [id, alert_type || 'weather', `${message} — ${region}`, req.user!.id,
     severity || 'info', new Date().toISOString()]);
  res.status(201).json({ id, message: 'Alert created' });
});

router.delete('/alerts/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM alerts WHERE alert_id = ?`, [req.params.id]);
  res.json({ message: 'Alert deleted' });
});

export default router;
