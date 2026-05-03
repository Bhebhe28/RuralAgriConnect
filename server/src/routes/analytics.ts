import { Router, Response } from 'express';
import { getDb, query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const db = await getDb();

  const users        = query<any>(db, `SELECT * FROM users`);
  const advisories   = query<any>(db, `SELECT * FROM advisories`);
  const alerts       = query<any>(db, `SELECT * FROM alerts`);
  const outbreaks    = query<any>(db, `SELECT * FROM pest_outbreaks`);
  const yieldReports = query<any>(db, `SELECT * FROM yield_reports`);
  const fields       = query<any>(db, `SELECT * FROM farm_fields`);
  const subsidies    = query<any>(db, `SELECT * FROM subsidy_requests`);
  const pendingSubs  = query<any>(db, `SELECT * FROM subsidy_requests WHERE status = 'pending'`);
  const aiChats      = query<any>(db, `SELECT COUNT(*) as cnt FROM activity_logs WHERE action = 'CHAT_AI'`);
  const imageScans   = query<any>(db, `SELECT COUNT(*) as cnt FROM activity_logs WHERE action = 'IMAGE_SCAN'`);

  const farmers = users.filter((u: any) => u.role === 'farmer');
  const totalHectares = fields.reduce((s: number, f: any) => s + (f.area_hectares || 0), 0);
  const totalYieldKg  = yieldReports.reduce((s: number, r: any) => s + (r.yield_kg || 0), 0);

  const farmersByRegion = farmers.reduce((acc: any, f: any) => {
    if (f.region) acc[f.region] = (acc[f.region] || 0) + 1;
    return acc;
  }, {});

  const advisoriesByCrop = advisories.reduce((acc: any, a: any) => {
    acc[a.crop_type] = (acc[a.crop_type] || 0) + 1;
    return acc;
  }, {});

  const advisoriesBySeverity = advisories.reduce((acc: any, a: any) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totals: {
      users:            users.length,
      farmers:          farmers.length,
      advisories:       advisories.length,
      alerts:           alerts.length,
      outbreaks:        outbreaks.length,
      yieldReports:     yieldReports.length,
      fields:           fields.length,
      subsidies:        subsidies.length,
      pendingSubsidies: pendingSubs.length,
      hectares:         Math.round(totalHectares * 100) / 100,
      yieldTons:        Math.round(totalYieldKg / 1000),
      aiChats:          (aiChats[0] as any)?.cnt || 0,
      imageScans:       (imageScans[0] as any)?.cnt || 0,
    },
    farmersByRegion:     Object.entries(farmersByRegion).map(([region, count]) => ({ region, count })),
    advisoriesByCrop:    Object.entries(advisoriesByCrop).map(([crop_type, count]) => ({ crop_type, count })),
    advisoriesBySeverity:Object.entries(advisoriesBySeverity).map(([severity, count]) => ({ severity, count })),
  });
});

export default router;
