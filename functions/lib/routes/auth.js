"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const utils_1 = require("../utils");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    const users = await (0, firestore_1.getDocs)('users', [['email', '==', email]]);
    const user = users[0];
    if (!user || !bcryptjs_1.default.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role || 'farmer', email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({
        token,
        user: {
            id: user.id,
            name: user.full_name,
            email: user.email,
            phone: user.phone_number,
            role: user.role || 'farmer',
            region: user.region || null,
        }
    });
});
router.post('/register', async (req, res) => {
    const { name, email, phone, password, role, region } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password required' });
    if (!(0, utils_1.isValidEmail)(email))
        return res.status(400).json({ error: 'Invalid email format' });
    if (!(0, utils_1.isStrongPassword)(password))
        return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });
    const existing = await (0, firestore_1.getDocs)('users', [['email', '==', email]]);
    if (existing.length > 0)
        return res.status(409).json({ error: 'Email already registered' });
    const roleName = role || 'farmer';
    const userId = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('users', userId, {
        full_name: name,
        email,
        phone_number: phone || null,
        password_hash: bcryptjs_1.default.hashSync(password, 10),
        role: roleName,
        region: region || null,
        avatar_url: null,
        created_at: (0, firestore_1.now)(),
    });
    // Log activity
    await (0, firestore_1.setDoc)('activity_logs', (0, uuid_1.v4)(), {
        user_id: userId,
        action: 'REGISTER',
        entity_type: 'user',
        entity_id: userId,
        details: `New ${roleName} account created`,
        created_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ message: 'Account created successfully' });
});
// ── FORGOT PASSWORD ────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email required' });
    const users = await (0, firestore_1.getDocs)('users', [['email', '==', email]]);
    if (!users.length)
        return res.json({ message: 'If that email exists, a reset link has been sent.' });
    const token = (0, uuid_1.v4)();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await (0, firestore_1.setDoc)('password_resets', token, {
        user_id: users[0].id,
        expires_at: expires,
        created_at: (0, firestore_1.now)(),
    });
    try {
        await (0, emailService_1.sendPasswordResetEmail)(email, token);
    }
    catch (e) {
        console.error('Email send failed:', e);
        return res.status(500).json({ error: 'Failed to send reset email.' });
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
});
// ── RESET PASSWORD ─────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password)
        return res.status(400).json({ error: 'Token and password required' });
    if (!(0, utils_1.isStrongPassword)(password))
        return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });
    const reset = await (0, firestore_1.getDocs)('password_resets', [
        ['__name__', '==', token],
    ]);
    // Check manually since Firestore doesn't support date comparison easily
    const resetDoc = reset[0];
    if (!resetDoc || new Date(resetDoc.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    await (0, firestore_1.updateDoc)('users', resetDoc.user_id, {
        password_hash: bcryptjs_1.default.hashSync(password, 10),
    });
    await (0, firestore_1.deleteDoc)('password_resets', token);
    res.json({ message: 'Password updated successfully' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map