import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { fetchAndSaveWeather } from '../services/weatherService';

const router = Router();

// Get latest weather for all regions (or filter by region)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { region } = req.query;

  // Return live weather data
  let sql = `
    SELECT w.*, 
      (SELECT COUNT(*) FROM alerts a 
       WHERE a.alert_type='weather' AND a.message LIKE '%' || w.region || '%') as alert_count
    FROM weather_data w
    WHERE w.forecast_date = (SELECT MAX(forecast_date) FROM weather_data w2 WHERE w2.region = w.region)
  `;
  const params: unknown[] = [];
  if (region) { sql += ' AND w.region = ?'; params.push(region); }
  sql += ' ORDER BY w.region';

  const rows = query(db, sql, params);

  // If no data yet, fetch fresh
  if (rows.length === 0) {
    const fresh = await fetchAndSaveWeather();
    return res.json(fresh);
  }

  res.json(rows);
});

// Get weather for a specific region
router.get('/region/:region', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const regionName = decodeURIComponent(req.params.region);
  const rows = query(db,
    `SELECT * FROM weather_data WHERE region = ? ORDER BY forecast_date DESC LIMIT 7`,
    [regionName]
  );
  res.json(rows);
});

// Get all active weather alerts
router.get('/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT * FROM alerts WHERE alert_type = 'weather' ORDER BY created_at DESC`;
  const params: unknown[] = [];
  if (req.query.region) {
    sql = `SELECT * FROM alerts WHERE alert_type = 'weather' AND message LIKE ? ORDER BY created_at DESC`;
    params.push(`%${req.query.region}%`);
  }
  res.json(query(db, sql, params));
});

// Manually trigger a weather refresh (admin only)
router.post('/refresh', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const results = await fetchAndSaveWeather();
    res.json({ message: `Weather refreshed for ${results.length} regions`, data: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Weather refresh failed', detail: err.message });
  }
});

// Create a manual weather alert (admin/officer)
router.post('/alerts', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { alert_type, message, region, severity } = req.body;
  if (!message || !region) return res.status(400).json({ error: 'message and region are required' });
  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO alerts (alert_id, alert_type, message, issued_by) VALUES (?,?,?,?)`,
    [id, alert_type || 'weather', `${message} — ${region}`, req.user!.id]
  );

  // Log activity
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
     VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'CREATE_ALERT', 'alert', id, `${alert_type || 'weather'} alert for ${region}`]
  );

  // Write SMS notification records for all farmers in the region
  if (severity === 'critical') {
    const farmers = query<any>(db,
      `SELECT f.farmer_id FROM farmers f WHERE f.region LIKE ?`,
      [`%${region.split('—')[1]?.trim() || region}%`]
    );
    farmers.forEach((f: any) => {
      run(db,
        `INSERT INTO sms_notifications (sms_id, farmer_id, alert_id, status) VALUES (?,?,?,?)`,
        [uuidv4(), f.farmer_id, id, 'pending']
      );
    });
  }

  res.status(201).json({ id, message: 'Alert created' });
});

// Delete an alert (admin only)
router.delete('/alerts/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, 'DELETE FROM alerts WHERE alert_id = ?', [req.params.id]);
  res.json({ message: 'Alert deleted' });
});

export default router;
