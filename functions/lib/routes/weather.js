"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const weatherService_1 = require("../services/weatherService");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (req, res) => {
    const filters = [];
    if (req.query.region)
        filters.push(['region', '==', req.query.region]);
    let rows = await (0, firestore_1.getDocs)('weather_data', filters, { field: 'forecast_date', dir: 'desc' });
    // Deduplicate — keep latest per region
    const seen = new Set();
    rows = rows.filter((r) => {
        if (seen.has(r.region))
            return false;
        seen.add(r.region);
        return true;
    });
    if (rows.length === 0) {
        const fresh = await (0, weatherService_1.fetchAndSaveWeather)();
        return res.json(fresh);
    }
    res.json(rows);
});
router.get('/alerts', auth_1.authenticate, async (req, res) => {
    const filters = [['alert_type', '==', 'weather']];
    const alerts = await (0, firestore_1.getDocs)('alerts', filters, { field: 'created_at', dir: 'desc' });
    if (req.query.region) {
        return res.json(alerts.filter((a) => a.message?.includes(req.query.region)));
    }
    res.json(alerts);
});
router.post('/refresh', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    try {
        const results = await (0, weatherService_1.fetchAndSaveWeather)();
        res.json({ message: `Weather refreshed for ${results.length} regions`, data: results });
    }
    catch (err) {
        res.status(500).json({ error: 'Weather refresh failed', detail: err.message });
    }
});
router.post('/alerts', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { alert_type, message, region, severity } = req.body;
    if (!message || !region)
        return res.status(400).json({ error: 'message and region are required' });
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('alerts', id, {
        alert_type: alert_type || 'weather',
        message: `${message} — ${region}`,
        issued_by: req.user.id,
        severity: severity || 'info',
        created_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Alert created' });
});
router.delete('/alerts/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    await (0, firestore_1.deleteDoc)('alerts', req.params.id);
    res.json({ message: 'Alert deleted' });
});
exports.default = router;
//# sourceMappingURL=weather.js.map