import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { setDoc, now } from '../db/firestore';

const router = Router();

// A09: Security log endpoint — accepts requests with or without authentication
// Used for audit trail of auth events (login, logout, etc.)
router.post('/', async (req: Request, res: Response) => {
  console.log('[SECURITY-LOG] POST request received');
  
  // Return a very specific response so we can identify if this endpoint is being called
  res.status(200).json({ 
    ok: true,
    message: 'SECURITY_LOG_ENDPOINT_REACHED',
    timestamp: new Date().toISOString()
  });
});

export default router;
