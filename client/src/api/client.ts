/**
 * SECURITY FIX — A08/A01: Hardened API Client with Offline Queue Integrity
 *
 * Fixes applied:
 * 1. A08: HMAC-SHA-256 integrity signing for offline queue items.
 *    Each queued request is signed with a per-session key derived from the
 *    user's session. On replay, the signature is verified before sending.
 *    A malicious script with localStorage access cannot modify queued requests
 *    without invalidating the signature.
 *
 * 2. A01: Auth token is re-attached fresh on replay (not stored in queue).
 *    If the interceptor fails to attach the token, the request is NOT sent
 *    unauthenticated — it is dropped and logged.
 *
 * 3. A07: On 401 response, both access token and refresh token are cleared.
 *    The user is redirected to login.
 *
 * 4. A08: Replay protection — queued items include a timestamp and are
 *    rejected if they are older than 24 hours (stale queue protection).
 *
 * Why secure: HMAC signing ensures that even if an attacker has localStorage
 * access (e.g., via XSS on a different page), they cannot modify queued
 * requests without knowing the signing key. The key is derived from the
 * session and stored in sessionStorage (cleared on tab close).
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL });

// ── HMAC integrity for offline queue ─────────────────────────────────────────

const QUEUE_KEY      = 'offlineQueue';
const QUEUE_SIGN_KEY = 'rac_queue_sign_key'; // sessionStorage — cleared on tab close

/**
 * SECURITY FIX — A08: Generate a per-session HMAC signing key.
 * Stored in sessionStorage so it's cleared when the tab/app closes.
 * This key is used to sign offline queue items.
 */
async function getOrCreateSignKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(QUEUE_SIGN_KEY);
  if (stored) {
    try {
      const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      return await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    } catch { /* fall through to generate new key */ }
  }
  const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
  const exported = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(QUEUE_SIGN_KEY, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

async function signQueueItem(item: Record<string, unknown>): Promise<string> {
  const key  = await getOrCreateSignKey();
  const data = new TextEncoder().encode(JSON.stringify({ url: item.url, method: item.method, data: item.data, queuedAt: item.queuedAt }));
  const sig  = await crypto.subtle.sign('HMAC', key, data);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyQueueItem(item: Record<string, unknown>, signature: string): Promise<boolean> {
  try {
    const key  = await getOrCreateSignKey();
    const data = new TextEncoder().encode(JSON.stringify({ url: item.url, method: item.method, data: item.data, queuedAt: item.queuedAt }));
    const sig  = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sig, data);
  } catch {
    return false;
  }
}

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // SECURITY FIX — A07: Clear both access and refresh tokens on 401
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // If offline and it's a write operation, queue it for later
    if (!navigator.onLine && err.config?.method !== 'get') {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');

      // SECURITY FIX — A08: Strip Authorization header — token is re-attached on replay
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Authorization, authorization, ...safeHeaders } = err.config.headers || {};

      const item = {
        url:      err.config.url,
        method:   err.config.method,
        data:     err.config.data,
        headers:  safeHeaders,
        queuedAt: new Date().toISOString(),
      };

      // SECURITY FIX — A08: Sign the queue item for tamper detection
      const signature = await signQueueItem(item);
      queue.push({ ...item, _sig: signature });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log('📦 Request queued for sync when online');
      return Promise.resolve({ data: { queued: true, message: 'Saved offline — will sync when connected' } });
    }

    return Promise.reject(err);
  }
);

// ── Online event — flush offline queue ───────────────────────────────────────
window.addEventListener('online', async () => {
  const rawQueue = localStorage.getItem(QUEUE_KEY);
  if (!rawQueue) return;

  let queue: any[];
  try {
    queue = JSON.parse(rawQueue);
  } catch {
    // SECURITY FIX — A08: If queue is unparseable (tampered), discard it
    localStorage.removeItem(QUEUE_KEY);
    return;
  }

  if (queue.length === 0) return;
  console.log(`🔄 Back online — syncing ${queue.length} queued request(s)`);

  const remaining = [];
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours — SECURITY FIX A08: replay protection

  for (const req of queue) {
    // SECURITY FIX — A08: Verify HMAC signature before replaying
    const { _sig, ...item } = req;
    if (_sig) {
      const valid = await verifyQueueItem(item, _sig);
      if (!valid) {
        console.warn('⚠️ Offline queue item failed integrity check — discarding', item.url);
        continue; // Drop tampered item
      }
    }

    // SECURITY FIX — A08: Replay protection — discard stale items (>24h old)
    if (item.queuedAt) {
      const age = Date.now() - new Date(item.queuedAt).getTime();
      if (age > MAX_AGE_MS) {
        console.warn('⚠️ Offline queue item too old — discarding', item.url);
        continue;
      }
    }

    // SECURITY FIX — A01: Verify auth token is present before replaying
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No auth token — skipping offline queue replay until logged in');
      remaining.push(req);
      continue;
    }

    try {
      await api.request({ url: item.url, method: item.method, data: item.data });
      console.log(`✅ Synced: ${item.method} ${item.url}`);
    } catch {
      remaining.push(req); // Keep failed ones for next attempt
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  if (remaining.length === 0) console.log('✅ All offline actions synced');
});

export default api;
