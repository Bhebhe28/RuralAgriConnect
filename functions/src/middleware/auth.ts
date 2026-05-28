import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

// Legacy custom-JWT-only middleware — kept for reference but no longer used in routes.
// All routes now use authenticateFirebase (exported as authenticate below).
function _authenticateLegacyJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return res.status(500).json({ error: 'Server configuration error' });

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      id: string; role: string; email: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Verifies either a Firebase ID token or a custom JWT — whichever the client sent.
// Firebase ID token: issued by firebase.currentUser.getIdToken()
// Custom JWT: issued by /api/auth/login using JWT_SECRET
export async function authenticateFirebase(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Try Firebase ID token first
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      id:    decoded.uid,
      role:  (decoded as any).role || 'farmer',
      email: decoded.email || '',
    };
    return next();
  } catch (firebaseErr) {
    // Log Firebase verification failure for debugging
    console.error('[AUTH] Firebase ID token verification failed:', (firebaseErr as any).message);
    /* fall through to custom JWT */
  }

  // Fall back to custom JWT (issued by /api/auth/login)
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    try {
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role: string; email: string };
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      console.error('[AUTH] Custom JWT verification failed:', (jwtErr as any).message);
      /* fall through */
    }
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

// Optional authentication — attempts to authenticate but doesn't fail if no token is provided.
// Used for endpoints like security-log that should accept both authenticated and unauthenticated requests.
export async function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    // No token provided — continue without authentication
    return next();
  }

  // Try Firebase ID token first
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      id:    decoded.uid,
      role:  (decoded as any).role || 'farmer',
      email: decoded.email || '',
    };
    return next();
  } catch (firebaseErr) {
    // Firebase verification failed — try custom JWT
    console.error('[AUTH] Firebase ID token verification failed:', (firebaseErr as any).message);
  }

  // Fall back to custom JWT (issued by /api/auth/login)
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    try {
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role: string; email: string };
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      console.error('[AUTH] Custom JWT verification failed:', (jwtErr as any).message);
      // Invalid token — but still continue (don't fail)
      return next();
    }
  }

  // No JWT secret configured — continue anyway
  return next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// All routes import `authenticate` — this alias routes them through Firebase-aware auth.
export const authenticate = authenticateFirebase;
