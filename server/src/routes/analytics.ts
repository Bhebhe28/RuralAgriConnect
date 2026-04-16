import { Router, Response } from 'express';
import { getDb, query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const db = await getDb();

  const totalUsers       = (query(db, `SELECT COUNT(*) as c FROM users`)[0] as any).c;
  const totalFarmers     = (query(db, `SELECT COUNT(*) as c FROM farmers`)[0] as any).c;
  const totalAdvisories  = (query(db, `SELECT COUNT(*) as c FROM advisories`)[0] as any).c;
  const totalAlerts      = (query(db, `SELECT COUNT(*) as c FROM alerts`)[0] as any).c;
  const totalOutbreaks   = (query(db, `SELECT COUNT(*) as c FROM pest_outbreaks`)[0] as any).c;
  const totalYieldReports= (query(db, `SELECT COUNT(*) as c FROM yield_reports`)[0] as any).c;
  const totalFields      = (query(db, `SELECT COUNT(*) as c FROM farm_fields`)[0] as any).c;
  const totalSubsidies   = (query(db, `SELECT COUNT(*) as c FROM subsidy_requests`)[0] as any).c;
  const pendingSubsidies = (query(db, `SELECT COUNT(*) as c FROM subsidy_requests WHERE status='pending'`)[0] as any).c;
  const totalHectares    = (query(db, `SELECT ROUND(SUM(area_hectares),2) as c FROM farm_fields`)[0] as any).c || 0;
  const totalYieldKg     = (query(db, `SELECT ROUND(SUM(yield_kg),2) as c FROM yield_reports`)[0] as any).c || 0;
  const aiChats          = (query(db, `SELECT COUNT(*) as c FROM activity_logs WHERE action LIKE 'CHAT%'`)[0] as any).c;
  const imageScans       = (query(db, `SELECT COUNT(*) as c FROM activity_logs WHERE action='IMAGE_SCAN'`)[0] as any).c;

  // Farmers per region
  const farmersByRegion = query(db, `
    SELECT region, COUNT(*) as count FROM farmers WHERE region IS NOT NULL GROUP BY region ORDER BY count DESC
  `);

  // Advisories per crop
  const advisoriesByCrop = query(db, `
    SELECT crop_type, COUNT(*) as count FROM advisories GROUP BY crop_type ORDER BY count DESC
  `);

  // Advisories per severity
  const advisoriesBySeverity = query(db, `
    SELECT severity, COUNT(*) as count FROM advisories GROUP BY severity
  `);

  // Yield by crop
  const yieldByCrop = query(db, `
    SELECT crop_type, ROUND(SUM(yield_kg)/1000,1) as tons, COUNT(*) as reports
    FROM yield_reports GROUP BY crop_type ORDER BY tons DESC
  `);

  // Outbreaks by region
  const outbreaksByRegion = query(db, `
    SELECT region, COUNT(*) as count, severity FROM pest_outbreaks GROUP BY region ORDER BY count DESC
  `);

  // Subsidy requests by resource type
  const subsidiesByType = query(db, `
    SELECT resource_type, COUNT(*) as count, status FROM subsidy_requests GROUP BY resource_type ORDER BY count DESC
  `);

  // Recent activity (last 10)
  const recentActivity = query(db, `
    SELECT a.action, a.details, a.created_at, u.full_name as user_name
    FROM activity_logs a LEFT JOIN users u ON u.user_id = a.user_id
    ORDER BY a.created_at DESC LIMIT 10
  `);

  // Monthly registrations (last 6 months)
  const monthlyRegistrations = query(db, `
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM users GROUP BY month ORDER BY month DESC LIMIT 6
  `);

  res.json({
    totals: {
      users: totalUsers, farmers: totalFarmers, advisories: totalAdvisories,
      alerts: totalAlerts, outbreaks: totalOutbreaks, yieldReports: totalYieldReports,
      fields: totalFields, subsidies: totalSubsidies, pendingSubsidies,
      hectares: totalHectares, yieldTons: Math.round(totalYieldKg / 1000),
      aiChats, imageScans,
    },
    farmersByRegion,
    advisoriesByCrop,
    advisoriesBySeverity,
    yieldByCrop,
    outbreaksByRegion,
    subsidiesByType,
    recentActivity,
    monthlyRegistrations,
  });
});

export default router;
