"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (req, res) => {
    const filters = [];
    if (req.query.region)
        filters.push(['region', '==', req.query.region]);
    if (req.query.crop_type)
        filters.push(['crop_type', '==', req.query.crop_type]);
    const rows = await (0, firestore_1.getDocs)('pest_outbreaks', filters, { field: 'reported_date', dir: 'desc' });
    res.json(rows);
});
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { region, crop_type, description, severity } = req.body;
    if (!region || !crop_type || !description)
        return res.status(400).json({ error: 'region, crop_type and description are required' });
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('pest_outbreaks', id, {
        region, crop_type, description,
        severity: severity || 'warning',
        reported_by: req.user.id,
        reported_date: (0, firestore_1.now)(),
    });
    await (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: req.user.id, action: 'REPORT_OUTBREAK',
        entity_type: 'pest_outbreak', entity_id: id,
        details: `${crop_type} outbreak in ${region}`, created_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Outbreak reported' });
});
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    await (0, firestore_1.deleteDoc)('pest_outbreaks', req.params.id);
    res.json({ message: 'Outbreak deleted' });
});
exports.default = router;
//# sourceMappingURL=outbreaks.js.map