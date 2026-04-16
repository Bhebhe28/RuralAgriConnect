import { Router, Response } from 'express';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Store avatars in server/public/avatars/
const avatarDir = path.join(__dirname, '../../public/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (req: any, file, cb) => cb(null, `${req.user!.id}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const [user] = query<any>(db,
    `SELECT u.user_id as id, u.full_name as name, u.email, u.phone_number as phone,
            r.role_name as role, f.region, f.crop_type, u.created_at
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     LEFT JOIN farmers f ON f.farmer_id = u.user_id
     WHERE u.user_id = ?`,
    [req.user!.id]
  );
  res.json(user);
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, phone, region } = req.body;
  const db = await getDb();
  run(db,
    `UPDATE users SET full_name=?, phone_number=? WHERE user_id=?`,
    [name, phone, req.user!.id]
  );
  run(db, `UPDATE farmers SET region=? WHERE farmer_id=?`, [region, req.user!.id]);
  res.json({ message: 'Profile updated' });
});

// Upload profile photo
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const avatarUrl = `/avatars/${req.file.filename}`;
  const db = await getDb();
  run(db, `UPDATE users SET avatar_url=? WHERE user_id=?`, [avatarUrl, req.user!.id]);
  res.json({ avatar_url: avatarUrl, message: 'Avatar updated' });
});

router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const users = query<any>(db,
    `SELECT u.user_id as id, u.full_name as name, u.email, u.phone_number as phone,
            r.role_name as role, f.region, f.crop_type, u.created_at
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     LEFT JOIN farmers f ON f.farmer_id = u.user_id
     ORDER BY u.created_at DESC`
  );
  res.json(users);
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  run(db, 'DELETE FROM farmers  WHERE farmer_id = ?',  [req.params.id]);
  run(db, 'DELETE FROM officers WHERE officer_id = ?', [req.params.id]);
  run(db, 'DELETE FROM user_roles WHERE user_id = ?',  [req.params.id]);
  run(db, 'DELETE FROM users WHERE user_id = ?',       [req.params.id]);
  res.json({ message: 'User deleted' });
});

export default router;
