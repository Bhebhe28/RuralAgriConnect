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
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const admin = __importStar(require("firebase-admin"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
async function uploadImage(buffer, mimetype, folder) {
    const bucket = admin.storage().bucket();
    const fileName = `${folder}/${Date.now()}-${(0, uuid_1.v4)()}`;
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType: mimetype });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}
router.get('/', auth_1.authenticate, async (_req, res) => {
    const posts = await (0, firestore_1.getDocs)('community_posts', [], { field: 'created_at', dir: 'desc' });
    res.json(posts);
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    const post = await (0, firestore_1.getDoc)('community_posts', req.params.id);
    if (!post)
        return res.status(404).json({ error: 'Post not found' });
    const replies = await (0, firestore_1.getDocs)('community_replies', [['post_id', '==', req.params.id]], { field: 'created_at', dir: 'asc' });
    res.json({ ...post, replies });
});
router.post('/', auth_1.authenticate, upload.single('image'), async (req, res) => {
    const { title, body, category } = req.body;
    if (!title || !body)
        return res.status(400).json({ error: 'title and body are required' });
    let imageUrl = null;
    if (req.file)
        imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, 'community');
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('community_posts', id, {
        user_id: req.user.id, title, body,
        category: category || 'general',
        image_url: imageUrl, likes: 0,
        created_at: (0, firestore_1.now)(), updated_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Post created', image_url: imageUrl });
});
router.post('/:id/replies', auth_1.authenticate, upload.single('image'), async (req, res) => {
    const { body } = req.body;
    if (!body)
        return res.status(400).json({ error: 'body is required' });
    let imageUrl = null;
    if (req.file)
        imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, 'community');
    const id = (0, uuid_1.v4)();
    await (0, firestore_1.setDoc)('community_replies', id, {
        post_id: req.params.id, user_id: req.user.id,
        body, image_url: imageUrl, created_at: (0, firestore_1.now)(),
    });
    res.status(201).json({ id, message: 'Reply added', image_url: imageUrl });
});
router.post('/:id/like', auth_1.authenticate, async (req, res) => {
    const post = await (0, firestore_1.getDoc)('community_posts', req.params.id);
    if (!post)
        return res.status(404).json({ error: 'Post not found' });
    await (0, firestore_1.updateDoc)('community_posts', req.params.id, { likes: (post.likes || 0) + 1 });
    res.json({ message: 'Liked' });
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    const post = await (0, firestore_1.getDoc)('community_posts', req.params.id);
    if (!post)
        return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Not allowed' });
    const replies = await (0, firestore_1.getDocs)('community_replies', [['post_id', '==', req.params.id]]);
    await Promise.all(replies.map((r) => (0, firestore_1.deleteDoc)('community_replies', r.id)));
    await (0, firestore_1.deleteDoc)('community_posts', req.params.id);
    res.json({ message: 'Post deleted' });
});
exports.default = router;
//# sourceMappingURL=community.js.map