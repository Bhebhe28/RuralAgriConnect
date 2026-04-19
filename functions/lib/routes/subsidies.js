"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const RESOURCE_TYPES = ['Seeds', 'Fertilizer', 'Pesticide', 'Irrigation Equipment', 'Tools & Equipment', 'Animal Feed', 'Other'];
router.post('/', auth_1.authenticate, async (req, res) => {
    const { resource_type, quantity, reason } = req.body;
    if (!resource_type || !quantity || !reason)
        return res.status(400).json({ error: 'resource_type, quantity and reason are required' });
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('subsidy_requests', id, {
        farmer_id: req.user.id, resource_type, quantity, reason,
        status: 'pending', reviewed_by: null, review_notes: null,
        created_at: (0, firestore_1.now)(), updated_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Request submitted successfully' });
});
router.get('/mine', auth_1.authenticate, async (req, res) => {
    const requests = await (0, firestore_1.getDocs)('subsidy_requests', [['farmer_id', '==', req.user.id]], { field: 'created_at', dir: 'desc' });
    res.json(requests);
});
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const filters = [];
    if (req.query.status)
        filters.push(['status', '==', req.query.status]);
    const requests = await (0, firestore_1.getDocs)('subsidy_requests', filters, { field: 'created_at', dir: 'desc' });
    res.json(requests);
});
router.put('/:id/review', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
        return res.status(400).json({ error: 'status must be approved, rejected or pending' });
    await (0, firestore_1.updateDoc)('subsidy_requests', req.params.id, {
        status, reviewed_by: req.user.id,
        review_notes: review_notes || null, updated_at: (0, firestore_1.now)(),
    });
    const request = await (0, firestore_1.getDoc)('subsidy_requests', req.params.id);
    if (request) {
        await (0, firestore_1.setDoc)('notifications', (0, uuid_1.v4)(), {
            user_id: request.farmer_id,
            title: `Subsidy Request ${status}`,
            message: `Your resource request has been ${status}`,
            channel: 'app', status: 'pending', read: false,
            created_at: (0, firestore_1.now)(),
        });
    }
    res.json({ message: `Request ${status}` });
});
router.get('/resource-types', auth_1.authenticate, (_req, res) => res.json(RESOURCE_TYPES));
exports.default = router;
//# sourceMappingURL=subsidies.js.map