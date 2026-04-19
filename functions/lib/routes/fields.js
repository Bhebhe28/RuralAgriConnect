"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/mine', auth_1.authenticate, async (req, res) => {
    const fields = await (0, firestore_1.getDocs)('farm_fields', [['farmer_id', '==', req.user.id]], { field: 'created_at', dir: 'desc' });
    res.json(fields);
});
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const filters = [];
    if (req.query.region)
        filters.push(['farmer_region', '==', req.query.region]);
    const fields = await (0, firestore_1.getDocs)('farm_fields', filters, { field: 'created_at', dir: 'desc' });
    res.json(fields);
});
router.post('/', auth_1.authenticate, async (req, res) => {
    const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
    if (!field_name || !crop_type || !area_hectares)
        return res.status(400).json({ error: 'field_name, crop_type and area_hectares are required' });
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('farm_fields', id, {
        farmer_id: req.user.id, field_name, crop_type,
        area_hectares: parseFloat(area_hectares),
        gps_lat: gps_lat || null, gps_lng: gps_lng || null,
        soil_type: soil_type || null, irrigation: irrigation || 'none',
        notes: notes || null, created_at: (0, firestore_1.now)(), updated_at: (0, firestore_1.now)(),
    });
    await (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: req.user.id, action: 'REGISTER_FIELD',
        entity_type: 'farm_field', entity_id: id,
        details: `Registered field: ${field_name} (${area_hectares}ha, ${crop_type})`,
        created_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Field registered' });
});
router.put('/:id', auth_1.authenticate, async (req, res) => {
    const { field_name, crop_type, area_hectares, gps_lat, gps_lng, soil_type, irrigation, notes } = req.body;
    await (0, firestore_1.updateDoc)('farm_fields', req.params.id, {
        field_name, crop_type, area_hectares: parseFloat(area_hectares),
        gps_lat: gps_lat || null, gps_lng: gps_lng || null,
        soil_type: soil_type || null, irrigation: irrigation || 'none',
        notes: notes || null, updated_at: (0, firestore_1.now)(),
    });
    res.json({ message: 'Field updated' });
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    await (0, firestore_1.deleteDoc)('farm_fields', req.params.id);
    res.json({ message: 'Field deleted' });
});
exports.default = router;
//# sourceMappingURL=fields.js.map