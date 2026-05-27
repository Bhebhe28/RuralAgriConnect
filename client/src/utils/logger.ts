const DEV = import.meta.env.DEV;

// A09: Persist security-relevant auth events to the backend audit trail in production.
// Fires-and-forgets — never throws, never blocks the caller.
async function persistSecurityEvent(action: string, detail?: string) {
  try {
    const { auth } = await import('../firebase');
    const token = await auth.currentUser?.getIdToken();
    if (!token) return; // Not authenticated yet — login failures are logged server-side
    fetch('/api/security-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
