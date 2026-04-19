"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/pull', auth_1.authenticate, async (req, res) => {
    const since = req.query.since || '1970-01-01T00:00:00.000Z';
    const [advisories, weatherAlerts, outbreaks, notifications] = await Promise.all([
        (0, firestore_1.getDocs)('advisories', [['updated_at', '>', since]]),
        (0, firestore_1.getDocs)('alerts', [['alert_type', '==', 'weather'], ['created_at', '>', since]]),
        (0, firestore_1.getDocs)('pest_outbreaks', [['reported_date', '>', since]]),
        (0, firestore_1.getDocs)('notifications', [['user_id', '==', req.user.id], ['created_at', '>', since]]),
    ]);
    await (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: req.user.id, action: 'SYNC_PULL',
        entity_type: 'sync', entity_id: (0, uuid_1.v4)(),
        details: `Sync pull since ${since}`, created_at: (0, firestore_1.now)(),
    });
    res.json({ advisories, weatherAlerts, outbreaks, notifications, syncedAt: (0, firestore_1.now)() });
});
router.post('/push', auth_1.authenticate, async (req, res) => {
    const { actions = [] } = req.body;
    await (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: req.user.id, action: 'SYNC_PUSH',
        entity_type: 'sync', entity_id: (0, uuid_1.v4)(),
        details: `Push sync: ${actions.length} queued action(s)`, created_at: (0, firestore_1.now)(),
    });
    res.json({ message: 'Sync acknowledged', processed: actions.length });
});
exports.default = router;
//# sourceMappingURL=sync.js.map