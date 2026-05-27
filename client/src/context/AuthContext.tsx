import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logger } from '../utils/logger';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'farmer' | 'admin';
  region?: string;
  avatar_url?: string;
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  region?: string;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  idleWarning: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Profile cache ─────────────────────────────────────────────
const PROFILE_KEY  = 'rac_user_profile';
const LOCKED_KEY   = 'rac_session_locked';
const SESSION_KEY  = 'rac_session_active'; // sessionStorage — cleared on app/tab close

function saveProfile(profile: AppUser) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {/**/}
}
function loadProfile(): AppUser | null {
  try { const r = localStorage.getItem(PROFILE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function isLocked(): boolean {
  return localStorage.getItem(LOCKED_KEY) === '1';
}
function setLocked(v: boolean) {
  try { v ? localStorage.setItem(LOCKED_KEY, '1') : localStorage.removeItem(LOCKED_KEY); } catch {/**/}
}
// sessionStorage is cleared when the browser/PWA closes — forces re-login on fresh open
function sessionActive(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}
function setSessionActive(v: boolean) {
  try { v ? sessionStorage.setItem(SESSION_KEY, '1') : sessionStorage.removeItem(SESSION_KEY); } catch {/**/}
}

// ── Offline credentials — PBKDF2 via Web Crypto ───────────────
const CREDS_KEY = 'rac_offline_creds';

async function deriveKey(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMat, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function saveOfflineCreds(email: string, password: string) {
  try {
    const salt = crypto.randomUUID();
    const hash = await deriveKey(password, salt);
    localStorage.setItem(CREDS_KEY, JSON.stringify({ email, hash, salt }));
  } catch {/**/}
}

async function verifyOfflineCreds(email: string, password: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return false;
    const { email: stored, hash, salt } = JSON.parse(raw);
    if (email.toLowerCase() !== stored.toLowerCase()) return false;
    const computed = await deriveKey(password, salt);
    return computed === hash;
  } catch { return false; }
}

// A07: 5-minute idle session timeout (PCI DSS 8.1.8 — max 15 min; 5 min is stricter)
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const IDLE_WARNING_MS = IDLE_TIMEOUT_MS - 30_000; // warn 30 s before lock
const IDLE_EVENTS     = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

// ════════════════════════════════════════════════════════════════
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                 = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading]           = useState(true);
  const [idleWarning, setIdleWarning]   = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        // Block auto-restore if:
        //  - user explicitly logged out (locked), OR
        //  - app was closed and reopened (no sessionStorage flag = fresh open)
        if (isLocked() || !sessionActive()) {
          setLoading(false);
          return;
        }

        // Show cached profile instantly
        const cached = loadProfile();
        if (cached && cached.id === fbUser.uid) {
          setUser(cached);
          setLoading(false);
        }

        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          if (snap.exists()) {
            const profile: AppUser = { id: fbUser.uid, ...snap.data() } as AppUser;
            setUser(profile);
            saveProfile(profile);
            logger.auth('Session restored', `${profile.name} (${profile.role})`);
          } else {
            const profile: AppUser = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              role: 'farmer',
            };
            setUser(profile);
            saveProfile(profile);
          }
        } catch {
          // Offline — keep cached profile, Firestore will serve from IndexedDB
          if (!cached || cached.id !== fbUser.uid) {
            setUser({ id: fbUser.uid, name: fbUser.displayName || 'User', email: fbUser.email || '', role: 'farmer' });
          }
        }
      } else {
        // Firebase Auth fully signed out (only happens on explicit real signOut)
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    // Case 1: Firebase Auth session is alive (locked screen after "Sign Out" or fresh app open)
    if (auth.currentUser) {
      const currentEmail = auth.currentUser.email?.toLowerCase();
      if (currentEmail === email.toLowerCase()) {
        // Same user — verify password locally, works offline
        const valid = await verifyOfflineCreds(email, password);
        if (valid) {
          const cached = loadProfile();
          if (cached) {
            setLocked(false);
            setSessionActive(true);
            setUser(cached);
            logger.auth('Unlocked', email);
            return;
          }
        }
        const err: any = new Error('Wrong password');
        err.code = 'auth/wrong-password';
        throw err;
      }
      // Different user switching in — wipe the previous session's cached data
      // immediately so no stale profile can leak through during the sign-out gap
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(CREDS_KEY);
      setUser(null);
      setLocked(false);
      await signOut(auth);
    }

    // Case 2: No Firebase session — need internet for first-time login
    try {
      // Set session active BEFORE sign-in so onAuthStateChanged finds it set
      setSessionActive(true);
      await signInWithEmailAndPassword(auth, email, password);
      await saveOfflineCreds(email, password);
      setLocked(false);
      logger.auth('Signed in', email);
    } catch (err: any) {
      setSessionActive(false); // clear optimistic flag on failure
      if (err.code === 'auth/network-request-failed') {
        // No internet and no active Firebase session — try offline creds
        const valid = await verifyOfflineCreds(email, password);
        if (valid) {
          const cached = loadProfile();
          if (cached && cached.email.toLowerCase() === email.toLowerCase()) {
            setLocked(false);
            setSessionActive(true);
            setUser(cached);
            logger.auth('Signed in offline (no Firebase session)', email);
            return;
          }
        }
      }
      throw err;
    }
  };

  const register = async ({ name, email, phone, password, role, region }: RegisterData) => {
    // Lock BEFORE creating the account so onAuthStateChanged never auto-signs in after registration.
    // The user must explicitly sign in — this is the security requirement.
    setLocked(true);
    setSessionActive(false);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const profile: AppUser = {
      id: cred.user.uid, name, email,
      phone: phone || undefined,
      role: 'farmer', // Always 'farmer'; admin role is assigned only via admin panel
      region: region || undefined,
    };
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email,
      phone:      phone || null,
      role:       'farmer',
      region:     region || null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    });
    saveProfile(profile);
    await saveOfflineCreds(email, password);
    // Do NOT unlock or set session active — user must sign in manually
    logger.auth('Registered', `${name} (${role || 'farmer'})`);
  };

  // Idle session timeout — warn at 4:30, lock at 5:00 of inactivity
  useEffect(() => {
    if (!user) return;
    let warnTimer: ReturnType<typeof setTimeout>;
    let lockTimer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(warnTimer);
      clearTimeout(lockTimer);
      setIdleWarning(false);
      warnTimer = setTimeout(() => setIdleWarning(true), IDLE_WARNING_MS);
      lockTimer = setTimeout(() => {
        setLocked(true);
        setSessionActive(false);
        setUser(null);
        setIdleWarning(false);
        logger.auth('Session expired (5-min idle timeout)');
      }, IDLE_TIMEOUT_MS);
    };
    IDLE_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(warnTimer);
      clearTimeout(lockTimer);
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user]);

  const logout = async () => {
    // Lock the session — clears React state but keeps Firebase Auth alive.
    // Firestore retains a valid auth token so data stays synced offline.
    // The farmer can re-login offline using the cached password hash.
    setLocked(true);
    setSessionActive(false);
    setUser(null);
    logger.auth('Session locked');
  };

  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    if (snap.exists()) {
      const profile = { id: fbUser.uid, ...snap.data() } as AppUser;
      setUser(profile);
      saveProfile(profile);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, firebaseUser, loading,
      login, register, logout, refreshUser,
      isAdmin: user?.role === 'admin',
      idleWarning,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return {
    user: null, firebaseUser: null, loading: false,
    login: async () => {}, register: async () => {}, logout: async () => {}, refreshUser: async () => {},
    isAdmin: false, idleWarning: false,
  };
  return ctx;
}

export { sendPasswordResetEmail, auth };
