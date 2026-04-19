"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    const [users, advisories, alerts, outbreaks, yieldReports, fields, subsidies, pendingSubsidies, aiChats, imageScans,] = await Promise.all([
        (0, firestore_1.getDocs)('users'),
        (0, firestore_1.getDocs)('advisories'),
        (0, firestore_1.getDocs)('alerts'),
        (0, firestore_1.getDocs)('pest_outbreaks'),
        (0, firestore_1.getDocs)('yield_reports'),
        (0, firestore_1.getDocs)('farm_fields'),
        (0, firestore_1.getDocs)('subsidy_requests'),
        (0, firestore_1.getDocs)('subsidy_requests', [['status', '==', 'pending']]),
        (0, firestore_1.countDocs)('activity_logs', [['action', '==', 'CHAT_AI']]),
        (0, firestore_1.countDocs)('activity_logs', [['action', '==', 'IMAGE_SCAN']]),
    ]);
    const farmers = users.filter((u) => u.role === 'farmer');
    const totalHectares = fields.reduce((s, f) => s + (f.area_hectares || 0), 0);
    const totalYieldKg = yieldReports.reduce((s, r) => s + (r.yield_kg || 0), 0);
    // Group farmers by region
    const farmersByRegion = farmers.reduce((acc, f) => {
        if (f.region)
            acc[f.region] = (acc[f.region] || 0) + 1;
        return acc;
    }, {});
    // Group advisories by crop
    const advisoriesByCrop = advisories.reduce((acc, a) => {
        acc[a.crop_type] = (acc[a.crop_type] || 0) + 1;
        return acc;
    }, {});
    // Group advisories by severity
    const advisoriesBySeverity = advisories.reduce((acc, a) => {
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
exports.default = router;
//# sourceMappingURL=analytics.js.map