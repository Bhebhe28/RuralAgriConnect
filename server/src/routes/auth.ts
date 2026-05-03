import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import { isValidEmail, isStrongPassword } from '../utils';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = await getDb();
  const users = query<any>(db, `SELECT * FROM users WHERE email = ?`, [email]);
  const user = users[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.user_id, role: user.role || 'farmer', email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  // Log activity
  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), user.user_id, 'LOGIN', 'user', user.user_id, `${user.role} logged in`]);

  res.json({
    token,
    user: {
      id:     user.user_id,
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

  const db = await getDb();
  const existing = query(db, `SELECT user_id FROM users WHERE email = ?`, [email]);
  if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

  const roleName = role || 'farmer';
  const userId = uuidv4();

  run(db, `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, region) VALUES (?,?,?,?,?,?,?)`,
    [userId, name, email, phone || null, bcrypt.hashSync(password, 10), roleName, region || null]);

  run(db, `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), userId, 'REGISTER', 'user', userId, `New ${roleName} account created`]);

  res.status(201).json({ message: 'Account created successfully' });
});

// ── FORGOT PASSWORD ────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = await getDb();
  const users = query<any>(db, `SELECT user_id FROM users WHERE email = ?`, [email]);

  // Always return same message to prevent email enumeration
  if (!users.length) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Remove any existing reset tokens for this user
  run(db, `DELETE FROM password_resets WHERE user_id = ?`, [users[0].user_id]);
  run(db, `INSERT INTO password_resets (token, user_id, expires_at) VALUES (?,?,?)`,
    [token, users[0].user_id, expires]);

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
  if (!isStrongPassword(password))
    return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });

  const db = await getDb();
  const resets = query<any>(db, `SELECT * FROM password_resets WHERE token = ?`, [token]);
  const reset = resets[0];

  if (!reset || new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  run(db, `UPDATE users SET password_hash = ? WHERE user_id = ?`,
    [bcrypt.hashSync(password, 10), reset.user_id]);
  run(db, `DELETE FROM password_resets WHERE token = ?`, [token]);

  res.json({ message: 'Password updated successfully' });
});

export default router;
