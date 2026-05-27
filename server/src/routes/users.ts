/**
 * SECURITY FIX — A01/A05/A08: Hardened Users Routes
 *
 * Fixes applied:
 * 1. A08: Avatar uploads now use memoryStorage + magic byte verification.
 * 2. A05: Profile update fields validated with Zod schema + max-length limits.
 * 3. A09: Structured logging for admin actions.
 * 4. A10: asyncHandler wraps all route handlers.
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateUploadedFile, imageFileFilter } from '../middleware/uploadSecurity';
import { validate, ProfileUpdateSchema } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
// SECURITY FIX — A04: Field-level encryption for PII fields (phone, region)
import { encryptField, decryptUserFields } from '../utils/encryption';

const router = Router();

// Store avatars locally in server/public/avatars
const avatarDir = path.join(__dirname, '../../public/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// SECURITY FIX — A08: Use memoryStorage so we can verify magic bytes before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter, // First-pass MIME type check
});

router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const users = query<any>(db, `SELECT * FROM users WHERE user_id = ?`, [req.user!.id]);
  if (!users.length) return res.status(404).json({ error: 'User not found' });
  // SECURITY FIX — A01: Strip password_hash before returning user object
  const { password_hash, ...safe } = users[0];
  // SECURITY FIX — A04: Decrypt PII fields before returning to client
  res.json({ ...decryptUserFields(safe), id: safe.user_id });
}));

router.put('/me', authenticate, validate(ProfileUpdateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, phone, region } = req.body;
  const db = await getDb();
  // SECURITY FIX — A04: Encrypt PII fields before storing
  run(db, `UPDATE users SET full_name = ?, phone_number = ?, region = ? WHERE user_id = ?`,
    [name, encryptField(phone || null), encryptField(region || null), req.user!.id]);
  res.json({ message: 'Profile updated' });
}));

router.post('/me/avatar', authenticate, upload.single('avatar'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  // SECURITY FIX — A08: Verify magic bytes before saving to disk
  const validation = validateUploadedFile(req.file);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Invalid image file. Only JPEG, PNG, and WebP are accepted.' });
  }

  // SECURITY FIX — A05: Generate random filename — never use original filename
  const ext      = validation.mimeType === 'image/png' ? '.png'
                 : validation.mimeType === 'image/webp' ? '.webp' : '.jpg';
  const filename = `${req.user!.id}-${uuidv4()}${ext}`;
  const filepath = path.join(avatarDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);

  const proto     = (req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
  const host      = req.get('host');
  const avatarUrl = `${proto}://${host}/avatars/${filename}`;
  const db        = await getDb();
  run(db, `UPDATE users SET avatar_url = ? WHERE user_id = ?`, [avatarUrl, req.user!.id]);
  res.json({ avatar_url: avatarUrl, message: 'Avatar updated' });
}));

router.get('/', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = await getDb();
  const users = query<any>(db, `SELECT * FROM users ORDER BY created_at DESC`);
  // SECURITY FIX — A01: Strip password_hash from all user records
  // SECURITY FIX — A04: Decrypt PII fields for admin view
  res.json(users.map(({ password_hash, ...u }: any) => ({ ...decryptUserFields(u), id: u.user_id })));
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const targets = query<any>(db, `SELECT full_name, email, role FROM users WHERE user_id = ?`, [req.params.id]);
  if (!targets.length) return res.status(404).json({ error: 'User not found' });

  // SECURITY FIX — A01: Prevent admin from deleting themselves
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  run(db, `DELETE FROM users WHERE user_id = ?`, [req.params.id]);

  // SECURITY FIX — A09: Structured audit log for user deletion
  logger.audit('Admin deleted user', {
    adminId:     req.user!.id,
    deletedUser: req.params.id,
    name:        targets[0].full_name,
    email:       targets[0].email,
    role:        targets[0].role,
  });

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), req.user!.id, 'DELETE_USER', 'user', req.params.id,
     `Deleted user: ${targets[0].full_name} (${targets[0].email}, role: ${targets[0].role})`]);
  res.json({ message: 'User deleted' });
}));

export default router;
