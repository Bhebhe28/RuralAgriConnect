"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const DEFAULT_CALENDAR = [
    { crop: 'Maize', region: 'All', activity: 'Land Preparation', start: 10, end: 11, desc: 'Plough and disc fields. Apply lime if pH < 5.5.' },
    { crop: 'Maize', region: 'All', activity: 'Planting', start: 11, end: 12, desc: 'Plant at 75cm row spacing. Apply 2:3:2 basal fertilizer.' },
    { crop: 'Maize', region: 'All', activity: 'Weed Control', start: 12, end: 1, desc: 'Apply pre-emergent herbicide. Hand weed at 3 weeks.' },
    { crop: 'Maize', region: 'All', activity: 'Top Dressing', start: 1, end: 2, desc: 'Apply LAN at 6 weeks after planting.' },
    { crop: 'Maize', region: 'All', activity: 'Pest Scouting', start: 12, end: 3, desc: 'Scout weekly for fall armyworm.' },
    { crop: 'Maize', region: 'All', activity: 'Harvesting', start: 4, end: 5, desc: 'Harvest when grain moisture < 14%.' },
    { crop: 'Vegetables', region: 'All', activity: 'Seedbed Prep', start: 8, end: 9, desc: 'Prepare raised beds. Add compost at 5 tons/ha.' },
    { crop: 'Vegetables', region: 'All', activity: 'Transplanting', start: 9, end: 10, desc: 'Transplant seedlings in the evening.' },
    { crop: 'Vegetables', region: 'All', activity: 'Irrigation', start: 9, end: 3, desc: 'Drip irrigate every 2 days.' },
    { crop: 'Vegetables', region: 'All', activity: 'Harvesting', start: 11, end: 4, desc: 'Harvest in the morning.' },
    { crop: 'Legumes', region: 'All', activity: 'Planting', start: 10, end: 11, desc: 'Inoculate seed with Rhizobium.' },
    { crop: 'Legumes', region: 'All', activity: 'Harvesting', start: 2, end: 4, desc: 'Harvest when pods are dry.' },
    { crop: 'Poultry', region: 'All', activity: 'Brooding', start: 1, end: 12, desc: 'Maintain 32°C for day-old chicks.' },
    { crop: 'Poultry', region: 'All', activity: 'Vaccination', start: 1, end: 12, desc: 'Newcastle at day 7 & 21.' },
];
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (req, res) => {
    let entries = await (0, firestore_1.getDocs)('crop_calendar', [], { field: 'crop_type', dir: 'asc' });
    // Seed defaults if empty
    if (entries.length === 0) {
        for (const item of DEFAULT_CALENDAR) {
            const id = (0, uuid_1.v4)();
            await (0, firestore_1.setDoc)('crop_calendar', id, {
                crop_type: item.crop, region: item.region,
                activity: item.activity, month_start: item.start,
                month_end: item.end, description: item.desc,
                created_at: (0, firestore_1.now)(),
            });
        }
        entries = await (0, firestore_1.getDocs)('crop_calendar', [], { field: 'crop_type', dir: 'asc' });
    }
    let result = entries;
    if (req.query.crop_type)
        result = result.filter((e) => e.crop_type === req.query.crop_type);
    if (req.query.month) {
        const m = parseInt(req.query.month);
        result = result.filter((e) => {
            if (e.month_start <= e.month_end)
                return e.month_start <= m && e.month_end >= m;
            return e.month_start <= m || e.month_end >= m;
        });
    }
    res.json(result);
});
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const { crop_type, region, activity, month_start, month_end, description } = req.body;
    if (!crop_type || !activity || !month_start || !month_end)
        return res.status(400).json({ error: 'crop_type, activity, month_start and month_end are required' });
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('crop_calendar', id, {
        crop_type, region: region || 'All', activity,
        month_start, month_end, description: description || null,
        created_by: req.user.id, created_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Calendar entry added' });
});
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    await (0, firestore_1.deleteDoc)('crop_calendar', req.params.id);
    res.json({ message: 'Entry deleted' });
});
exports.default = router;
//# sourceMappingURL=calendar.js.map