"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (req, res) => {
    const rows = await (0, firestore_1.getDocs)('notifications', [['user_id', '==', req.user.id]], { field: 'created_at', dir: 'desc' }, 50);
    res.json(rows);
});
router.put('/read-all', auth_1.authenticate, async (req, res) => {
    const rows = await (0, firestore_1.getDocs)('notifications', [['user_id', '==', req.user.id], ['read', '==', false]]);
    await Promise.all(rows.map(r => (0, firestore_1.updateDoc)('notifications', r.id, { read: true, status: 'read' })));
    res.json({ message: 'All marked as read' });
});
router.put('/:id/read', auth_1.authenticate, async (req, res) => {
    await (0, firestore_1.updateDoc)('notifications', req.params.id, { read: true, status: 'read' });
    res.json({ message: 'Marked as read' });
});
exports.default = router;
//# sourceMappingURL=notifications.js.map