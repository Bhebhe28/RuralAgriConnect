"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, async (req, res) => {
    const { season, crop_type, region, area_hectares, yield_kg, quality, notes } = req.body;
    if (!season || !crop_type || !region || !area_hectares || !yield_kg)
        return res.status(400).json({ error: 'season, crop_type, region, area_hectares and yield_kg are required' });
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('yield_reports', id, {
        farmer_id: req.user.id, season, crop_type, region,
        area_hectares: parseFloat(area_hectares),
        yield_kg: parseFloat(yield_kg),
        quality: quality || 'good', notes: notes || null,
        reported_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Yield report submitted' });
});
router.get('/mine', auth_1.authenticate, async (req, res) => {
    const reports = await (0, firestore_1.getDocs)('yield_reports', [['farmer_id', '==', req.user.id]], { field: 'reported_at', dir: 'desc' });
    res.json(reports);
});
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const filters = [];
    if (req.query.region)
        filters.push(['region', '==', req.query.region]);
    if (req.query.crop_type)
        filters.push(['crop_type', '==', req.query.crop_type]);
    if (req.query.season)
        filters.push(['season', '==', req.query.season]);
    const reports = await (0, firestore_1.getDocs)('yield_reports', filters, { field: 'reported_at', dir: 'desc' });
    res.json(reports);
});
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    await (0, firestore_1.deleteDoc)('yield_reports', req.params.id);
    res.json({ message: 'Report deleted' });
});
exports.default = router;
//# sourceMappingURL=yields.js.map