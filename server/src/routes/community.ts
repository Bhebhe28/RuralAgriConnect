import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Store community images in server/public/community/
const communityDir = path.join(__dirname, '../../public/community');
if (!fs.existsSync(communityDir)) fs.mkdirSync(communityDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, communityDir),
  filename: (req: any, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all posts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const posts = query<any>(db, `
    SELECT p.*, u.full_name as author_name, u.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.post_id) as reply_count
    FROM community_posts p
    JOIN users u ON p.user_id = u.user_id
    ORDER BY p.created_at DESC
  `);
  res.json(posts);
});

// Get single post with replies
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const [post] = query<any>(db, `
    SELECT p.*, u.full_name as author_name, u.avatar_url as author_avatar
    FROM community_posts p JOIN users u ON p.user_id = u.user_id
    WHERE p.post_id = ?`, [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const replies = query<any>(db, `
    SELECT r.*, u.full_name as author_name, u.avatar_url as author_avatar
    FROM community_replies r JOIN users u ON r.user_id = u.user_id
    WHERE r.post_id = ? ORDER BY r.created_at ASC`, [req.params.id]);

  res.json({ ...post, replies });
});

// Create post — any logged in user
router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { title, body, category } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  
  const db = await getDb();
  const id = uuidv4();
  const imageUrl = req.file ? `/community/${req.file.filename}` : null;
  
  run(db,
    `INSERT INTO community_posts (post_id, user_id, title, body, category, image_url) VALUES (?,?,?,?,?,?)`,
    [id, req.user!.id, title, body, category || 'general', imageUrl]
  );
  res.status(201).json({ id, message: 'Post created', image_url: imageUrl });
});

// Reply to a post
router.post('/:id/replies', authenticate, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });
  
  const db = await getDb();
  const id = uuidv4();
  const imageUrl = req.file ? `/community/${req.file.filename}` : null;
  
  run(db,
    `INSERT INTO community_replies (reply_id, post_id, user_id, body, image_url) VALUES (?,?,?,?,?)`,
    [id, req.params.id, req.user!.id, body, imageUrl]
  );
  res.status(201).json({ id, message: 'Reply added', image_url: imageUrl });
});

// Like a post
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `UPDATE community_posts SET likes = likes + 1 WHERE post_id = ?`, [req.params.id]);
  res.json({ message: 'Liked' });
});

// Delete post (own post or admin)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const [post] = query<any>(db, `SELECT user_id FROM community_posts WHERE post_id = ?`, [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.user!.id && req.user!.role !== 'admin')
    return res.status(403).json({ error: 'Not allowed' });
  run(db, `DELETE FROM community_replies WHERE post_id = ?`, [req.params.id]);
  run(db, `DELETE FROM community_posts WHERE post_id = ?`, [req.params.id]);
  res.json({ message: 'Post deleted' });
});

export default router;
