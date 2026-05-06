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

router.get('/suggest', authenticate, async (req: AuthRequest, res: Response) => {
  const { q } = req.query as { q?: string };
  if (!q || q.trim().length < 2) return res.json([]);

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    return res.json([
      { displayName: 'Durban, KwaZulu-Natal, ZA', name: 'Durban', state: 'KwaZulu-Natal', country: 'ZA', lat: -29.8587, lon: 31.0218 },
      { displayName: 'Durbanville, Western Cape, ZA', name: 'Durbanville', state: 'Western Cape', country: 'ZA', lat: -33.8351, lon: 18.6501 },
    ].filter(s => s.name.toLowerCase().startsWith(q.trim().toLowerCase())));
  }

  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q.trim())}&limit=6&appid=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) return res.json([]);
    const data = await r.json() as any[];
    res.json(data.map(item => ({
      name:        item.name,
      state:       item.state || '',
      country:     item.country || '',
      lat:         item.lat,
      lon:         item.lon,
      displayName: [item.name, item.state, item.country].filter(Boolean).join(', '),
    })));
  } catch {
    res.json([]);
  }
});

router.get('/city', authenticate, async (req: AuthRequest, res: Response) => {
  const { q } = req.query as { q?: string };
  if (!q?.trim()) return res.status(400).json({ error: 'City name required' });

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    return res.json({
      city: q, country: '', region: q,
      temperature: 22, feels_like: 23, humidity: 65,
      rainfall: 0, wind_speed: 12,
      description: 'Partly cloudy', icon: '02d',
      forecast_date: new Date().toISOString().split('T')[0],
    });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q.trim())}&appid=${apiKey}&units=metric`;
    const owRes = await fetch(url);
    if (owRes.status === 404) return res.status(404).json({ error: `City "${q}" not found. Try a different name.` });
    if (!owRes.ok) throw new Error(`OpenWeather HTTP ${owRes.status}`);
    const d = await owRes.json() as any;
    res.json({
      city:        d.name,
      country:     d.sys?.country || '',
      region:      `${d.name}${d.sys?.country ? ', ' + d.sys.country : ''}`,
      temperature:   Math.round(d.main.temp),
      feels_like:    Math.round(d.main.feels_like),
      humidity:      d.main.humidity,
      rainfall:      d.rain?.['1h'] ?? d.rain?.['3h'] ?? 0,
      wind_speed:    Math.round(d.wind.speed * 3.6),
      description:   d.weather[0].description,
      icon:          d.weather[0].icon,
      forecast_date: new Date().toISOString().split('T')[0],
    });
  } catch (err: any) {
    res.status(502).json({ error: 'Weather lookup failed', detail: err.message });
  }
});

router.get('/location', authenticate, async (req: AuthRequest, res: Response) => {
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    return res.json({
      city: 'Your Location', region: 'Current Location',
      temperature: 24, feels_like: 26, humidity: 70,
      rainfall: 5, wind_speed: 15,
      description: 'Partly cloudy', icon: '02d',
      forecast_date: new Date().toISOString().split('T')[0],
    });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const owRes = await fetch(url);
    if (!owRes.ok) throw new Error(`OpenWeather HTTP ${owRes.status}`);
    const d = await owRes.json() as any;

    const city    = d.name || 'Your Location';
    const country = d.sys?.country || '';
    res.json({
      city,
      country,
      region: `${city}${country ? ', ' + country : ''}`,
      temperature:   Math.round(d.main.temp),
      feels_like:    Math.round(d.main.feels_like),
      humidity:      d.main.humidity,
      rainfall:      d.rain?.['1h'] ?? d.rain?.['3h'] ?? 0,
      wind_speed:    Math.round(d.wind.speed * 3.6),
      description:   d.weather[0].description,
      icon:          d.weather[0].icon,
      forecast_date: new Date().toISOString().split('T')[0],
    });
  } catch (err: any) {
    res.status(502).json({ error: 'Could not fetch weather for your location', detail: err.message });
  }
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
