import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

// ── Prevention tips by crop / keyword ──────────────────────
const PREVENTION_TIPS: Record<string, string[]> = {
  Maize: [
    'Rotate maize with legumes (soybeans, beans) every season to break pest and disease cycles.',
    'Use certified disease-resistant maize seed varieties (e.g., PAN 6Q-508, DKC 80-30).',
    'Scout fields weekly for fall armyworm egg masses and apply Coragen or Ampligo at first sign.',
    'Maintain proper plant spacing (75 cm rows) to improve air circulation and reduce fungal risk.',
    'Apply balanced fertilizer (2:3:2 basal) — avoid excess nitrogen which promotes fungal growth.',
    'Remove and destroy infected plant debris after harvest to reduce inoculum in the soil.',
  ],
  Vegetables: [
    'Use drip irrigation instead of overhead watering to keep foliage dry and reduce fungal diseases.',
    'Apply copper-based fungicides (e.g., Copper Oxychloride) preventatively during wet seasons.',
    'Rotate vegetable families — avoid planting the same family in the same bed for 2–3 seasons.',
    'Inspect transplants carefully before planting; reject any showing spots, wilting, or lesions.',
    'Mulch around plants to prevent soil splash, which spreads soil-borne pathogens.',
    'Remove and bag diseased leaves immediately — do not compost infected material.',
  ],
  Poultry: [
    'Maintain strict biosecurity — limit farm visitors and disinfect footwear at entry points.',
    'Vaccinate flocks against Newcastle disease, Marek\'s disease, and Infectious Bronchitis.',
    'Ensure proper ventilation in poultry houses to reduce ammonia and respiratory disease risk.',
    'Clean and disinfect housing between flocks using approved disinfectants (e.g., Virkon S).',
    'Source day-old chicks only from accredited hatcheries with health certificates.',
    'Isolate and monitor new birds for 14 days before introducing them to the main flock.',
  ],
  Pest: [
    'Implement Integrated Pest Management (IPM) — combine biological, cultural, and chemical controls.',
    'Introduce natural predators such as parasitic wasps (Trichogramma) for caterpillar control.',
    'Use pheromone traps to monitor pest populations and determine spray thresholds.',
    'Apply pesticides only when pest counts exceed economic thresholds to prevent resistance.',
    'Rotate pesticide classes (e.g., Group 5 → Group 28) to delay resistance development.',
    'Keep field borders mowed to reduce pest harborage areas near crops.',
  ],
  General: [
    'Keep detailed farm records of disease outbreaks, treatments, and outcomes each season.',
    'Test soil pH and nutrient levels annually — healthy soil supports disease-resistant plants.',
    'Ensure adequate drainage; waterlogged soils promote root rot and fungal diseases.',
    'Use clean, certified seed from reputable suppliers to avoid seed-borne pathogens.',
    'Wash hands and sanitize tools between handling different plants or fields.',
    'Consult your local agricultural extension officer for region-specific disease alerts.',
  ],
};

function getPreventionTips(crop: string, content: string): string[] {
  // Try exact crop match first
  if (PREVENTION_TIPS[crop]) return PREVENTION_TIPS[crop];
  // Fallback: scan content for keywords
  const lower = content.toLowerCase();
  if (lower.includes('maize') || lower.includes('corn')) return PREVENTION_TIPS['Maize'];
  if (lower.includes('vegetable') || lower.includes('tomato') || lower.includes('cabbage')) return PREVENTION_TIPS['Vegetables'];
  if (lower.includes('poultry') || lower.includes('chicken')) return PREVENTION_TIPS['Poultry'];
  if (lower.includes('pest') || lower.includes('armyworm') || lower.includes('aphid')) return PREVENTION_TIPS['Pest'];
  return PREVENTION_TIPS['General'];
}

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let sql = `SELECT a.*, u.full_name as author_name FROM advisories a
             LEFT JOIN users u ON a.created_by = u.user_id WHERE 1=1`;
  const params: unknown[] = [];
  if (req.query.crop)     { sql += ' AND a.crop_type = ?'; params.push(req.query.crop); }
  if (req.query.region)   { sql += ' AND a.region = ?';    params.push(req.query.region); }
  if (req.query.severity) { sql += ' AND a.severity = ?';  params.push(req.query.severity); }
  sql += ' ORDER BY a.created_at DESC';
  const rows = query<any>(db, sql, params);
  // Attach prevention tips to each advisory
  const enriched = rows.map(a => ({
    ...a,
    prevention_tips: getPreventionTips(a.crop_type, a.content),
  }));
  res.json(enriched);
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const [advisory] = query<any>(db,
    `SELECT a.*, u.full_name as author_name FROM advisories a
     LEFT JOIN users u ON a.created_by = u.user_id WHERE a.advisory_id = ?`,
    [req.params.id]
  );
  if (!advisory) return res.status(404).json({ error: 'Advisory not found' });
  res.json({
    ...advisory,
    prevention_tips: getPreventionTips(advisory.crop_type, advisory.content),
  });
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, content, crop, region, severity } = req.body;
  if (!title || !content || !crop || !region)
    return res.status(400).json({ error: 'title, content, crop and region are required' });
  const db = await getDb();
  const id = uuidv4();
  run(db,
    `INSERT INTO advisories (advisory_id, title, content, crop_type, region, severity, created_by)
     VALUES (?,?,?,?,?,?,?)`,
    [id, title, content, crop, region, severity || 'info', req.user!.id]
  );

  // Log activity
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
     VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'PUBLISH_ADVISORY', 'advisory', id,
     `Published: ${title} (${crop}, ${severity || 'info'})`]
  );

  // Notify all farmers in the region via notification_log
  const farmers = query<any>(db,
    `SELECT u.user_id FROM users u
     JOIN farmers f ON f.farmer_id = u.user_id
     WHERE f.region LIKE ? OR f.region IS NULL`,
    [`%${region.split('—')[1]?.trim() || region}%`]
  );
  farmers.forEach((f: any) => {
    run(db,
      `INSERT INTO notification_log (id, user_id, advisory_id, channel, status, created_at)
       VALUES (?,?,?,?,?,datetime('now'))`,
      [uuidv4(), f.user_id, id, 'app', 'pending']
    );
  });

  res.status(201).json({ id, message: 'Advisory published' });
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, content, crop, region, severity } = req.body;
  const db = await getDb();
  run(db,
    `UPDATE advisories SET title=?, content=?, crop_type=?, region=?, severity=?, updated_at=datetime('now')
     WHERE advisory_id=?`,
    [title, content, crop, region, severity, req.params.id]
  );
  res.json({ message: 'Advisory updated' });
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, 'DELETE FROM advisories WHERE advisory_id = ?', [req.params.id]);
  res.json({ message: 'Advisory deleted' });
});

export default router;
