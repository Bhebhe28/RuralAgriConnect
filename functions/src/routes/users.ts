import { Router, Response } from 'express';
import { getDocs, getDoc, updateDoc, deleteDoc } from '../db/firestore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { getFirestore } from '../db/firestore';
import * as admin from 'firebase-admin';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await getDoc<any>('users', req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safe } = user;
  res.json(safe);
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, phone, region } = req.body;
  await updateDoc('users', req.user!.id, {
    full_name: name, phone_number: phone, region,
  });
  res.json({ message: 'Profile updated' });
});

router.post('/me/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const bucket = admin.storage().bucket();
  const fileName = `avatars/${req.user!.id}`;
  const file = bucket.file(fileName);
  await file.save(req.file.buffer, { contentType: req.file.mimetype });
  await file.makePublic();
  const avatarUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  await updateDoc('users', req.user!.id, { avatar_url: avatarUrl });
  res.json({ avatar_url: avatarUrl, message: 'Avatar updated' });
});

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const users = await getDocs<any>('users', [], { field: 'created_at', dir: 'desc' });
  res.json(users.map(({ password_hash, ...u }) => u));
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await deleteDoc('users', req.params.id);
  res.json({ message: 'User deleted' });
});

export default router;
