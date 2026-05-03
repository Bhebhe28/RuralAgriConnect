import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const DEFAULT_CALENDAR = [
  { crop: 'Maize',     region: 'All', activity: 'Land Preparation', start: 10, end: 11, desc: 'Plough and disc fields. Apply lime if pH < 5.5.' },
  { crop: 'Maize',     region: 'All', activity: 'Planting',         start: 11, end: 12, desc: 'Plant at 75cm row spacing. Apply 2:3:2 basal fertilizer.' },
  { crop: 'Maize',     region: 'All', activity: 'Weed Control',     start: 12, end:  1, desc: 'Apply pre-emergent herbicide. Hand weed at 3 weeks.' },
  { crop: 'Maize',     region: 'All', activity: 'Top Dressing',     start:  1, end:  2, desc: 'Apply LAN at 6 weeks after planting.' },
  { crop: 'Maize',     region: 'All', activity: 'Pest Scouting',    start: 12, end:  3, desc: 'Scout weekly for fall armyworm.' },
  { crop: 'Maize',     region: 'All', activity: 'Harvesting',       start:  4, end:  5, desc: 'Harvest when grain moisture < 14%.' },
  { crop: 'Vegetables',region: 'All', activity: 'Seedbed Prep',     start:  8, end:  9, desc: 'Prepare raised beds. Add compost at 5 tons/ha.' },
  { crop: 'Vegetables',region: 'All', activity: 'Transplanting',    start:  9, end: 10, desc: 'Transplant seedlings in the evening.' },
  { crop: 'Vegetables',region: 'All', activity: 'Irrigation',       start:  9, end:  3, desc: 'Drip irrigate every 2 days.' },
  { crop: 'Vegetables',region: 'All', activity: 'Harvesting',       start: 11, end:  4, desc: 'Harvest in the morning.' },
  { crop: 'Legumes',   region: 'All', activity: 'Planting',         start: 10, end: 11, desc: 'Inoculate seed with Rhizobium.' },
  { crop: 'Legumes',   region: 'All', activity: 'Harvesting',       start:  2, end:  4, desc: 'Harvest when pods are dry.' },
  { crop: 'Poultry',   region: 'All', activity: 'Brooding',         start:  1, end: 12, desc: 'Maintain 32°C for day-old chicks.' },
  { crop: 'Poultry',   region: 'All', activity: 'Vaccination',      start:  1, end: 12, desc: 'Newcastle at day 7 & 21.' },
];

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let entries = query<any>(db, `SELECT * FROM crop_calendar ORDER BY crop_type ASC`);

  // Seed defaults if empty
  if (entries.length === 0) {
    const now = new Date().toISOString();
    for (const item of DEFAULT_CALENDAR) {
      run(db, `INSERT INTO crop_calendar (calendar_id, crop_type, region, activity, month_start, month_end, description, created_at) VALUES (?,?,?,?,?,?,?,?)`,
        [uuidv4(), item.crop, item.region, item.activity, item.start, item.end, item.desc, now]);
    }
    entries = query<any>(db, `SELECT * FROM crop_calendar ORDER BY crop_type ASC`);
  }

  let result = entries;
  if (req.query.crop_type) result = result.filter((e: any) => e.crop_type === req.query.crop_type);
  if (req.query.month) {
    const m = parseInt(req.query.month as string);
    result = result.filter((e: any) => {
      if (e.month_start <= e.month_end) return e.month_start <= m && e.month_end >= m;
      return e.month_start <= m || e.month_end >= m;
    });
  }
  res.json(result.map((e: any) => ({ ...e, id: e.calendar_id })));
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { crop_type, region, activity, month_start, month_end, description } = req.body;
  if (!crop_type || !activity || !month_start || !month_end)
    return res.status(400).json({ error: 'crop_type, activity, month_start and month_end are required' });

  const db = await getDb();
  const id = uuidv4();
  run(db, `INSERT INTO crop_calendar (calendar_id, crop_type, region, activity, month_start, month_end, description, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, crop_type, region || 'All', activity, month_start, month_end,
     description || null, req.user!.id, new Date().toISOString()]);
  res.status(201).json({ id, message: 'Calendar entry added' });
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM crop_calendar WHERE calendar_id = ?`, [req.params.id]);
  res.json({ message: 'Entry deleted' });
});

export default router;
