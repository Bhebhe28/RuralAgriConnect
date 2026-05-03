import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Store avatars locally in server/public/avatars
const avatarDir = path.join(__dirname, '../../public/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (req: any, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${req.user!.id}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const users = query<any>(db, `SELECT * FROM users WHERE user_id = ?`, [req.user!.id]);
  if (!users.length) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safe } = users[0];
  res.json({ ...safe, id: safe.user_id });
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, phone, region } = req.body;
  const db = await getDb();
  run(db, `UPDATE users SET full_name = ?, phone_number = ?, region = ? WHERE user_id = ?`,
    [name, phone, region, req.user!.id]);
  res.json({ message: 'Profile updated' });
});

router.post('/me/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const avatarUrl = `/avatars/${req.file.filename}`;
  const db = await getDb();
  run(db, `UPDATE users SET avatar_url = ? WHERE user_id = ?`, [avatarUrl, req.user!.id]);
  res.json({ avatar_url: avatarUrl, message: 'Avatar updated' });
});

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const db = await getDb();
  const users = query<any>(db, `SELECT * FROM users ORDER BY created_at DESC`);
  res.json(users.map(({ password_hash, ...u }: any) => ({ ...u, id: u.user_id })));
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, `DELETE FROM users WHERE user_id = ?`, [req.params.id]);
  res.json({ message: 'User deleted' });
});

export default router;
