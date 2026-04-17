import { Router, Response } from 'express';
import { getDocs, countDocs } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const [
    users, advisories, alerts, outbreaks,
    yieldReports, fields, subsidies, pendingSubsidies,
    aiChats, imageScans,
  ] = await Promise.all([
    getDocs<any>('users'),
    getDocs<any>('advisories'),
    getDocs<any>('alerts'),
    getDocs<any>('pest_outbreaks'),
    getDocs<any>('yield_reports'),
    getDocs<any>('farm_fields'),
    getDocs<any>('subsidy_requests'),
    getDocs<any>('subsidy_requests', [['status', '==', 'pending']]),
    countDocs('activity_logs', [['action', '==', 'CHAT_AI']]),
    countDocs('activity_logs', [['action', '==', 'IMAGE_SCAN']]),
  ]);

  const farmers = users.filter((u: any) => u.role === 'farmer');
  const totalHectares = fields.reduce((s: number, f: any) => s + (f.area_hectares || 0), 0);
  const totalYieldKg = yieldReports.reduce((s: number, r: any) => s + (r.yield_kg || 0), 0);

  // Group farmers by region
  const farmersByRegion = farmers.reduce((acc: any, f: any) => {
    if (f.region) acc[f.region] = (acc[f.region] || 0) + 1;
    return acc;
  }, {});

  // Group advisories by crop
  const advisoriesByCrop = advisories.reduce((acc: any, a: any) => {
    acc[a.crop_type] = (acc[a.crop_type] || 0) + 1;
    return acc;
  }, {});

  // Group advisories by severity
  const advisoriesBySeverity = advisories.reduce((acc: any, a: any) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totals: {
      users: users.length, farmers: farmers.length,
      advisories: advisories.length, alerts: alerts.length,
      outbreaks: outbreaks.length, yieldReports: yieldReports.length,
      fields: fields.length, subsidies: subsidies.length,
      pendingSubsidies: pendingSubsidies.length,
      hectares: Math.round(totalHectares * 100) / 100,
      yieldTons: Math.round(totalYieldKg / 1000),
      aiChats, imageScans,
    },
    farmersByRegion: Object.entries(farmersByRegion).map(([region, count]) => ({ region, count })),
    advisoriesByCrop: Object.entries(advisoriesByCrop).map(([crop_type, count]) => ({ crop_type, count })),
    advisoriesBySeverity: Object.entries(advisoriesBySeverity).map(([severity, count]) => ({ severity, count })),
  });
});

export default router;
