const DEV = import.meta.env.DEV;

export const logger = {
  info:  (msg: string, ...args: unknown[]) => { if (DEV) console.info(`%c[RAC] ${msg}`, 'color:#16a34a;font-weight:bold', ...args); },
  warn:  (msg: string, ...args: unknown[]) => console.warn(`[RAC] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[RAC] ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => { if (DEV) console.debug(`[RAC] ${msg}`, ...args); },
  auth:  (action: string, detail?: string) => { if (DEV) console.info(`%c[RAC:AUTH] ${action}${detail ? ` — ${detail}` : ''}`, 'color:#7c3aed;font-weight:bold'); },
};
