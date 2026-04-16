import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Default KZN crop calendar — seeded if empty
const DEFAULT_CALENDAR = [
  // MAIZE
  { crop: 'Maize', region: 'All', activity: 'Land Preparation',  start: 10, end: 11, desc: 'Plough and disc fields. Apply lime if pH < 5.5.' },
  { crop: 'Maize', region: 'All', activity: 'Planting',          start: 11, end: 12, desc: 'Plant at 75cm row spacing. Apply 2:3:2 basal fertilizer.' },
  { crop: 'Maize', region: 'All', activity: 'Weed Control',      start: 12, end:  1, desc: 'Apply pre-emergent herbicide. Hand weed at 3 weeks.' },
  { crop: 'Maize', region: 'All', activity: 'Top Dressing',      start:  1, end:  2, desc: 'Apply LAN at 6 weeks after planting.' },
  { crop: 'Maize', region: 'All', activity: 'Pest Scouting',     start: 12, end:  3, desc: 'Scout weekly for fall armyworm. Treat when >8 moths/trap/week.' },
  { crop: 'Maize', region: 'All', activity: 'Harvesting',        start:  4, end:  5, desc: 'Harvest when grain moisture < 14%. Dry before storage.' },
  // VEGETABLES
  { crop: 'Vegetables', region: 'All', activity: 'Seedbed Prep', start:  8, end:  9, desc: 'Prepare raised beds. Add compost at 5 tons/ha.' },
  { crop: 'Vegetables', region: 'All', activity: 'Transplanting',start:  9, end: 10, desc: 'Transplant seedlings in the evening. Water immediately.' },
  { crop: 'Vegetables', region: 'All', activity: 'Irrigation',   start:  9, end:  3, desc: 'Drip irrigate every 2 days. Avoid overhead watering.' },
  { crop: 'Vegetables', region: 'All', activity: 'Fertilizing',  start: 10, end:  2, desc: 'Apply balanced NPK monthly. Foliar feed every 2 weeks.' },
  { crop: 'Vegetables', region: 'All', activity: 'Harvesting',   start: 11, end:  4, desc: 'Harvest in the morning. Grade and pack immediately.' },
  // LEGUMES
  { crop: 'Legumes', region: 'All', activity: 'Planting',        start: 10, end: 11, desc: 'Inoculate seed with Rhizobium. Plant at 45cm spacing.' },
  { crop: 'Legumes', region: 'All', activity: 'Weed Control',    start: 11, end: 12, desc: 'Hand weed at 3 and 6 weeks. Avoid herbicides near flowering.' },
  { crop: 'Legumes', region: 'All', activity: 'Harvesting',      start:  2, end:  4, desc: 'Harvest when pods are dry. Thresh and clean before storage.' },
  // POULTRY
  { crop: 'Poultry', region: 'All', activity: 'Brooding',        start:  1, end: 12, desc: 'Maintain 32°C for day-old chicks. Reduce by 3°C per week.' },
  { crop: 'Poultry', region: 'All', activity: 'Vaccination',     start:  1, end: 12, desc: 'Newcastle at day 7 & 21. Marek\'s at hatchery. IBD at day 14.' },
  { crop: 'Poultry', region: 'All', activity: 'Slaughter',       start:  1, end: 12, desc: 'Broilers ready at 6 weeks (1.8–2.2kg). Withhold feed 8hrs before.' },
];

// ── Get calendar (filtered by crop/region/month) ───────────
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();

  // Seed defaults if empty
  const existing = query(db, `SELECT COUNT(*) as cnt FROM crop_calendar`);
  if ((existing[0] as any).cnt === 0) {
    for (const item of DEFAULT_CALENDAR) {
      run(db,
        `INSERT INTO crop_calendar (calendar_id, crop_type, region, activity, month_start, month_end, description)
         VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(), item.crop, item.region, item.activity, item.start, item.end, item.desc]
      );
    }
  }

  const { crop_type, region, month } = req.query;
  let sql = `SELECT * FROM crop_calendar WHERE 1=1`;
  const params: unknown[] = [];
  if (crop_type) { sql += ' AND crop_type = ?'; params.push(crop_type); }
  if (region)    { sql += ' AND (region = ? OR region = "All")'; params.push(region); }
  if (month) {
    const m = parseInt(month as string);
    sql += ` AND (
      (month_start <= month_end AND month_start <= ? AND month_end >= ?) OR
      (month_start > month_end AND (month_start <= ? OR month_end >= ?))
    )`;
    params.push(m, m, m, m);
  }
  sql += ' ORDER BY crop_type, month_start';
  res.json(query(db, sql, params));
});

// ── Admin adds a custom calendar entry ─────────────────────
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { crop_type, region, activity, month_start, month_end, description } = req.body;
  if (!crop_type || !activity || !month_start || !month_end)
    return res.status(400).json({ error: 'crop_type, activity, month_start and month_end are required' });
  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO crop_calendar (calendar_id, crop_type, region, activity, month_start, month_end, description, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, crop_type, region || 'All', activity, month_start, month_end, description || null, req.user!.id]
  );
  res.status(201).json({ id, message: 'Calendar entry added' });
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, 'DELETE FROM crop_calendar WHERE calendar_id = ?', [req.params.id]);
  res.json({ message: 'Entry deleted' });
});

export default router;
