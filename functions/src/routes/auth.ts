import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDocs, setDoc, updateDoc, deleteDoc, now } from '../db/firestore';
import { isValidEmail, isStrongPassword } from '../utils';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const users = await getDocs<any>('users', [['email', '==', email]]);
  const user = users[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role || 'farmer', email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id:     user.id,
      name:   user.full_name,
      email:  user.email,
      phone:  user.phone_number,
      role:   user.role || 'farmer',
      region: user.region || null,
    }
  });
});

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, phone, password, role, region } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password required' });
  if (!isValidEmail(email))
    return res.status(400).json({ error: 'Invalid email format' });
  if (!isStrongPassword(password))
    return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });

  const existing = await getDocs('users', [['email', '==', email]]);
  if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

  const roleName = role || 'farmer';
  const userId = uuidv4();

  await setDoc('users', userId, {
    full_name:     name,
    email,
    phone_number:  phone || null,
    password_hash: bcrypt.hashSync(password, 10),
    role:          roleName,
    region:        region || null,
    avatar_url:    null,
    created_at:    now(),
  });

  // Log activity
  await setDoc('activity_logs', uuidv4(), {
    user_id:     userId,
    action:      'REGISTER',
    entity_type: 'user',
    entity_id:   userId,
    details:     `New ${roleName} account created`,
    created_at:  now(),
  });

  res.status(201).json({ message: 'Account created successfully' });
});

// ── FORGOT PASSWORD ────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const users = await getDocs<any>('users', [['email', '==', email]]);
  if (!users.length) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await setDoc('password_resets', token, {
    user_id:    users[0].id,
    expires_at: expires,
    created_at: now(),
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (e) {
    console.error('Email send failed:', e);
    return res.status(500).json({ error: 'Failed to send reset email.' });
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// ── RESET PASSWORD ─────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });

  const reset = await getDocs<any>('password_resets', [
    ['__name__', '==', token],
  ]);

  // Check manually since Firestore doesn't support date comparison easily
  const resetDoc = reset[0];
  if (!resetDoc || new Date(resetDoc.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  await updateDoc('users', resetDoc.user_id, {
    password_hash: bcrypt.hashSync(password, 10),
  });
  await deleteDoc('password_resets', token);

  res.json({ message: 'Password updated successfully' });
});

export default router;
