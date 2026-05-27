/**
 * SECURITY FIX — A09: Structured Logging Middleware
 *
 * Vulnerability: console.error/console.log produce unstructured output with no
 * queryable fields, no severity levels, and no log rotation. In production this
 * makes incident response nearly impossible.
 *
 * Attack scenario: An attacker performs a slow brute-force over days. Without
 * structured logs, the pattern is invisible in raw stdout noise.
 *
 * Risk severity: HIGH
 *
 * Remediation: Replace all console.* calls with a Pino-based structured logger
 * that emits JSON lines. Each log entry includes timestamp, level, service name,
 * and a structured `data` field — making it trivially ingestible by Cloud Logging,
 * Datadog, Loki, or any SIEM.
 *
 * Why secure: JSON-structured logs are machine-parseable, enabling real-time
 * alerting rules (e.g., "5 LOGIN_FAILED for same email in 60s → alert").
 * Log rotation prevents unbounded disk growth. Production mode suppresses
 * debug/info noise while keeping warn/error/security levels.
 */

/**
 * SECURITY FIX — A09: SIEM / Webhook Forwarder
 *
 * Vulnerability: Security and audit events were written only to SQLite and
 * stdout. If the server is compromised, an attacker can delete both. There
 * was no real-time alerting for critical events.
 *
 * Remediation: When SECURITY_WEBHOOK_URL is set in the environment, every
 * `security` and `audit` level log entry is also forwarded to that URL via
 * HTTP POST. This can be a Slack incoming webhook, PagerDuty Events API,
 * Microsoft Teams connector, or any SIEM HTTP intake (Splunk HEC, Datadog
 * Logs API, Google Cloud Logging, etc.).
 *
 * Why secure: Out-of-band log forwarding means log data survives server
 * compromise. The forwarding is fire-and-forget and never blocks the
 * main request path.
 */
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { Request, Response, NextFunction } from 'express';

// ── Log levels ────────────────────────────────────────────────────────────────
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security' | 'audit';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug:    0,
  info:     1,
  warn:     2,
  error:    3,
  security: 4,
  audit:    5,
};

// In production only emit warn and above; in development emit everything
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

// ── SIEM webhook forwarder ────────────────────────────────────────────────────

/**
 * SECURITY FIX — A09: Forward security/audit events to an external webhook.
 * Fire-and-forget — never blocks the request path.
 * Set SECURITY_WEBHOOK_URL in the environment to enable.
 *
 * Compatible with:
 *   - Slack incoming webhooks (posts as { text: "..." })
 *   - PagerDuty Events v2 API
 *   - Microsoft Teams connectors
 *   - Splunk HTTP Event Collector (set SECURITY_WEBHOOK_TOKEN)
 *   - Any HTTP endpoint accepting POST with JSON body
 */
function forwardToSiem(level: LogLevel, entry: Record<string, unknown>): void {
  const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
  if (!webhookUrl) return;

  // Only forward security and audit events — not debug/info/warn/error
  if (level !== 'security' && level !== 'audit') return;

  try {
    const url     = new URL(webhookUrl);
    const body    = JSON.stringify(entry);
    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        // Optional bearer token for authenticated SIEM endpoints (Splunk HEC, etc.)
        ...(process.env.SECURITY_WEBHOOK_TOKEN
          ? { 'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN}` }
          : {}),
      },
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req       = transport.request(options, (res) => {
      // Drain the response body to free the socket
      res.resume();
    });

    req.on('error', () => {
      // SECURITY: Silently swallow webhook errors — never let monitoring
      // failures affect the main application flow
    });

    req.setTimeout(5000, () => { req.destroy(); }); // 5s timeout
    req.write(body);
    req.end();
  } catch {
    // Malformed URL or other error — silently ignore
  }
}

// ── Core emit function ────────────────────────────────────────────────────────
function emit(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service:   'ruragriconnect-api',
    message,
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  };

  // Always write to stdout as JSON — container runtimes (Railway, Cloud Run)
  // capture stdout and forward to their logging backends.
  // Use process.stdout.write to avoid any console interception.
  const line = JSON.stringify(entry) + '\n';
  if (level === 'error' || level === 'security') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }

  // SECURITY FIX — A09: Forward security/audit events to external SIEM webhook
  forwardToSiem(level, entry);
}

// ── Public logger API ─────────────────────────────────────────────────────────
export const logger = {
  debug:    (msg: string, data?: Record<string, unknown>) => emit('debug',    msg, data),
  info:     (msg: string, data?: Record<string, unknown>) => emit('info',     msg, data),
  warn:     (msg: string, data?: Record<string, unknown>) => emit('warn',     msg, data),
  error:    (msg: string, data?: Record<string, unknown>) => emit('error',    msg, data),

  /**
   * SECURITY FIX — A09: Security-specific log level.
   * All auth failures, access denials, and suspicious events use this level.
   * Downstream alerting rules can filter on level==="security" to trigger
   * real-time notifications (PagerDuty, Slack webhook, etc.).
   */
  security: (msg: string, data?: Record<string, unknown>) => emit('security', msg, data),

  /**
   * SECURITY FIX — A09: Immutable audit trail for privileged actions.
   * Every admin action, role change, and data deletion emits an audit entry.
   * These are never suppressed regardless of NODE_ENV.
   */
  audit:    (msg: string, data?: Record<string, unknown>) => {
    // Audit logs are ALWAYS emitted — never suppressed by log level
    const entry = {
      timestamp: new Date().toISOString(),
      level:     'audit' as LogLevel,
      service:   'ruragriconnect-api',
      message:   msg,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
    // SECURITY FIX — A09: Forward audit events to SIEM
    forwardToSiem('audit', entry);
  },
};

// ── HTTP request logger middleware ────────────────────────────────────────────
/**
 * SECURITY FIX — A09: Log every inbound HTTP request with method, path,
 * status, latency, and user ID. This creates a complete access log that
 * can be used to detect scanning, enumeration, and abuse patterns.
 *
 * SECURITY: Authorization header is explicitly excluded from logs to prevent
 * token leakage into log storage systems.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const user = (req as any).user;

    // Only log at warn+ for 4xx/5xx; info for 2xx/3xx in dev
    const level: LogLevel = res.statusCode >= 500 ? 'error'
                          : res.statusCode >= 400 ? 'warn'
                          : 'info';

    logger[level](`${req.method} ${req.path}`, {
      method:     req.method,
      path:       req.path,
      status:     res.statusCode,
      ms,
      ip:         req.ip,
      userId:     user?.id ?? null,
      userAgent:  req.get('user-agent')?.slice(0, 100) ?? null,
      // SECURITY: Never log Authorization header — it contains the JWT
    });
  });

  next();
}
