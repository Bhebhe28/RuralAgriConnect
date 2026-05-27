import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateFirebase, AuthRequest } from '../middleware/auth';
import { setDoc, now } from '../db/firestore';

const router = Router();

// A09: Receives client-side security events (auth lifecycle) and writes them to
// the immutable security_logs collection. Rate-limited by the global auth limiter.
router.post('/', authenticateFirebase, async (req: AuthRequest, res: Response) => {
  const { action, detail, timestamp, userAgent } = req.body;

  if (typeof action !== 'string' || action.length > 100) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  await setDoc('security_logs', uuidv4(), {
    user_id:    req.user!.id,
    action:     action.slice(0, 100),
    detail:     typeof detail === 'string' ? detail.slice(0, 200) : null,
    ip:         req.ip,
    user_agent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : null,
    timestamp:  typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
    logged_at:  now(),
  });

  res.json({ ok: true });
});

export default router;
