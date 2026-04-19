"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const admin = __importStar(require("firebase-admin"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.get('/me', auth_1.authenticate, async (req, res) => {
    const user = await (0, firestore_1.getDoc)('users', req.user.id);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safe } = user;
    res.json(safe);
});
router.put('/me', auth_1.authenticate, async (req, res) => {
    const { name, phone, region } = req.body;
    await (0, firestore_1.updateDoc)('users', req.user.id, {
        full_name: name, phone_number: phone, region,
    });
    res.json({ message: 'Profile updated' });
});
router.post('/me/avatar', auth_1.authenticate, upload.single('avatar'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No image uploaded' });
    const bucket = admin.storage().bucket();
    const fileName = `avatars/${req.user.id}`;
    const file = bucket.file(fileName);
    await file.save(req.file.buffer, { contentType: req.file.mimetype });
    await file.makePublic();
    const avatarUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    await (0, firestore_1.updateDoc)('users', req.user.id, { avatar_url: avatarUrl });
    res.json({ avatar_url: avatarUrl, message: 'Avatar updated' });
});
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (_req, res) => {
    const users = await (0, firestore_1.getDocs)('users', [], { field: 'created_at', dir: 'desc' });
    res.json(users.map(({ password_hash, ...u }) => u));
});
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    await (0, firestore_1.deleteDoc)('users', req.params.id);
    res.json({ message: 'User deleted' });
});
exports.default = router;
//# sourceMappingURL=users.js.map