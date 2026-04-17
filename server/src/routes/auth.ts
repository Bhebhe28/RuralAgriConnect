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
  const [user] = query<any>(db,
    `SELECT u.*, r.role_name as role
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     WHERE u.email = ?`, [email]
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.user_id, role: user.role || 'farmer', email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  // normalise field names for the frontend
  res.json({
    token,
    user: {
      id:     safeUser.user_id,
      name:   safeUser.full_name,
      email:  safeUser.email,
      phone:  safeUser.phone_number,
      role:   safeUser.role || 'farmer',
      region: safeUser.region || null,
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

  const [existing] = query(db, 'SELECT user_id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  // Get role_id
  const roleName = role || 'farmer';
  const [roleRow] = query<any>(db, 'SELECT role_id FROM roles WHERE role_name = ?', [roleName]);
  if (!roleRow) {
    console.error(`Role not found: '${roleName}'. Available roles:`, query(db, 'SELECT role_name FROM roles'));
    return res.status(400).json({ error: `Role '${roleName}' not found. Please contact support.` });
  }
  const userId = uuidv4();

  // Insert user
  run(db,
    `INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role_id)
     VALUES (?,?,?,?,?,?)`,
    [userId, name, email, phone || null, bcrypt.hashSync(password, 10), roleRow.role_id]
  );

  // Insert into user_roles
  run(db, `INSERT INTO user_roles (user_id, role_id) VALUES (?,?)`, [userId, roleRow.role_id]);

  // Insert into farmers or admin table — no officer role
  if (roleName === 'farmer') {
    run(db,
      `INSERT INTO farmers (farmer_id, region, crop_type, language_preference) VALUES (?,?,?,?)`,
      [userId, region || null, null, 'en']
    );
  } else if (roleName === 'admin') {
    run(db,
      `INSERT INTO officers (officer_id, officer_name) VALUES (?,?)`,
      [userId, name]
    );
  }

  // Log activity
  run(db,
    `INSERT INTO activity_logs (log_id, user_id, action, entity_type, entity_id, details)
     VALUES (?,?,?,?,?,?)`,
    [uuidv4(), userId, 'REGISTER', 'user', userId, `New ${roleName} account created`]
  );

  res.status(201).json({ message: 'Account created successfully' });
});

// ── FORGOT PASSWORD ────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = await getDb();
  const [user] = query<any>(db, 'SELECT user_id, email FROM users WHERE email = ?', [email]);

  // Always return success to prevent email enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  run(db,
    `INSERT OR REPLACE INTO password_resets (token, user_id, expires_at) VALUES (?,?,?)`,
    [token, user.user_id, expires]
  );

  try {
    await sendPasswordResetEmail(email, token);
  } catch (e) {
    console.error('Email send failed:', e);
    return res.status(500).json({ error: 'Failed to send reset email. Check server email config.' });
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// ── RESET PASSWORD ─────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase and a number' });

  const db = await getDb();
  const [reset] = query<any>(db,
    `SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );

  if (!reset) return res.status(400).json({ error: 'Invalid or expired reset link' });

  run(db, `UPDATE users SET password_hash = ? WHERE user_id = ?`,
    [bcrypt.hashSync(password, 10), reset.user_id]
  );
  run(db, `DELETE FROM password_resets WHERE token = ?`, [token]);

  res.json({ message: 'Password updated successfully' });
});

export default router;
