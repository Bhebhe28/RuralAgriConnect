const DEV = import.meta.env.DEV;

// A09: Persist security-relevant auth events to the backend audit trail in production.
// Fires-and-forgets — never throws, never blocks the caller.
async function persistSecurityEvent(action: string, detail?: string) {
  try {
    const customToken = localStorage.getItem('token');
    const { auth } = await import('../firebase');
    const token = customToken || await auth.currentUser?.getIdToken().catch(() => null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/security-log', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        detail,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  } catch { /**/ }
}

export const logger = {
  info:  (msg: string, ...args: unknown[]) => { if (DEV) console.info(`%c[RAC] ${msg}`, 'color:#16a34a;font-weight:bold', ...args); },
  warn:  (msg: string, ...args: unknown[]) => console.warn(`[RAC] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[RAC] ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => { if (DEV) console.debug(`[RAC] ${msg}`, ...args); },
  auth:  (action: string, detail?: string) => {
    if (DEV) console.info(`%c[RAC:AUTH] ${action}${detail ? ` — ${detail}` : ''}`, 'color:#7c3aed;font-weight:bold');
    persistSecurityEvent(action, detail);
  },
};
