import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, setDoc, deleteDoc, now } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { fetchAndSaveWeather } from '../services/weatherService';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const filters: any[] = [];
  if (req.query.region) filters.push(['region', '==', req.query.region]);

  let rows = await getDocs<any>('weather_data', filters, { field: 'forecast_date', dir: 'desc' });

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
  res.json(rows);
});

router.get('/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  const filters: any[] = [['alert_type', '==', 'weather']];
  const alerts = await getDocs<any>('alerts', filters, { field: 'created_at', dir: 'desc' });
  if (req.query.region) {
    return res.json(alerts.filter((a: any) => a.message?.includes(req.query.region as string)));
  }
  res.json(alerts);
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

  const id = uuidv4();
  await setDoc('alerts', id, {
    alert_type: alert_type || 'weather',
    message: `${message} — ${region}`,
    issued_by: req.user!.id,
    severity: severity || 'info',
    created_at: now(),
  });
  res.status(201).json({ id, message: 'Alert created' });
});

router.delete('/alerts/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await deleteDoc('alerts', req.params.id);
  res.json({ message: 'Alert deleted' });
});

export default router;
