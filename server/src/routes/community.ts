import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Store community images locally
const communityDir = path.join(__dirname, '../../public/community');
if (!fs.existsSync(communityDir)) fs.mkdirSync(communityDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, communityDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${Date.now()}-${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const db = await getDb();
  const posts = query<any>(db,
    `SELECT cp.*, u.full_name as author_name FROM community_posts cp LEFT JOIN users u ON cp.user_id = u.user_id ORDER BY cp.created_at DESC`);
  res.json(posts.map(p => ({ ...p, id: p.post_id })));
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const posts = query<any>(db,
    `SELECT cp.*, u.full_name as author_name FROM community_posts cp LEFT JOIN users u ON cp.user_id = u.user_id WHERE cp.post_id = ?`,
    [req.params.id]);
  if (!posts.length) return res.status(404).json({ error: 'Post not found' });
  const replies = query<any>(db,
    `SELECT cr.*, u.full_name as author_name FROM community_replies cr LEFT JOIN users u ON cr.user_id = u.user_id WHERE cr.post_id = ? ORDER BY cr.created_at ASC`,
    [req.params.id]);
  res.json({ ...posts[0], id: posts[0].post_id, replies: replies.map(r => ({ ...r, id: r.reply_id })) });
});

router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { title, body, category } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

  const imageUrl = req.file ? `/community/${req.file.filename}` : null;
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO community_posts (post_id, user_id, title, body, category, image_url, likes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, title, body, category || 'general', imageUrl, 0, now, now]);
  res.status(201).json({ id, message: 'Post created', image_url: imageUrl });
});

router.post('/:id/replies', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });

  const imageUrl = req.file ? `/community/${req.file.filename}` : null;
  const db = await getDb();
  const id = uuidv4();
  run(db, `INSERT INTO community_replies (reply_id, post_id, user_id, body, image_url, created_at) VALUES (?,?,?,?,?,?)`,
    [id, req.params.id, req.user!.id, body, imageUrl, new Date().toISOString()]);
  res.status(201).json({ id, message: 'Reply added', image_url: imageUrl });
});

router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const posts = query<any>(db, `SELECT likes FROM community_posts WHERE post_id = ?`, [req.params.id]);
  if (!posts.length) return res.status(404).json({ error: 'Post not found' });
  run(db, `UPDATE community_posts SET likes = ? WHERE post_id = ?`,
    [(posts[0].likes || 0) + 1, req.params.id]);
  res.json({ message: 'Liked' });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const posts = query<any>(db, `SELECT user_id FROM community_posts WHERE post_id = ?`, [req.params.id]);
  if (!posts.length) return res.status(404).json({ error: 'Post not found' });
  if (posts[0].user_id !== req.user!.id && req.user!.role !== 'admin')
    return res.status(403).json({ error: 'Not allowed' });
  run(db, `DELETE FROM community_replies WHERE post_id = ?`, [req.params.id]);
  run(db, `DELETE FROM community_posts WHERE post_id = ?`, [req.params.id]);
  res.json({ message: 'Post deleted' });
});

export default router;
