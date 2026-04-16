import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

const dbPath = process.env.DB_PATH || './data/ruragriconnect.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db: Database;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    _db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    _db = new SQL.Database();
  }
  return _db;
}

export function saveDb() {
  if (!_db) return;
  fs.writeFileSync(dbPath, Buffer.from(_db.export()));
}

export async function initDb() {
  const db = await getDb();

  db.run(`
    -- ── ROLES ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS roles (
      role_id   TEXT PRIMARY KEY,
      role_name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── USERS ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      user_id       TEXT PRIMARY KEY,
      full_name     TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      phone_number  TEXT,
      password_hash TEXT NOT NULL,
      role_id       TEXT REFERENCES roles(role_id),
      avatar_url    TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- ── USER ROLES (many-to-many) ───────────────────────
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id    TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      role_id    TEXT REFERENCES roles(role_id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, role_id)
    );

    -- ── OFFICERS ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS officers (
      officer_id   TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      officer_name TEXT NOT NULL
    );

    -- ── FARMERS ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS farmers (
      farmer_id           TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      region              TEXT,
      crop_type           TEXT,
      language_preference TEXT DEFAULT 'en'
    );

    -- ── ADVISORIES ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS advisories (
      advisory_id      TEXT PRIMARY KEY,
      title            TEXT NOT NULL,
      content          TEXT NOT NULL,
      crop_type        TEXT NOT NULL,
      region           TEXT NOT NULL,
      severity         TEXT DEFAULT 'info',
      prevention_tips  TEXT DEFAULT '[]',
      created_by       TEXT REFERENCES officers(officer_id),
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    -- ── ALERTS ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS alerts (
      alert_id     TEXT PRIMARY KEY,
      alert_type   TEXT NOT NULL,
      message      TEXT NOT NULL,
      advisory_id  TEXT REFERENCES advisories(advisory_id),
      issued_by    TEXT REFERENCES officers(officer_id),
      scheduled_for TEXT,
      sent_at      TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- ── WEATHER DATA ───────────────────────────────────
    CREATE TABLE IF NOT EXISTS weather_data (
      weather_id    TEXT PRIMARY KEY,
      region        TEXT NOT NULL,
      forecast_date TEXT NOT NULL,
      temperature   REAL,
      humidity      REAL,
      rainfall      REAL,
      wind_speed    REAL,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- ── PEST OUTBREAKS ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS pest_outbreaks (
      outbreak_id   TEXT PRIMARY KEY,
      region        TEXT NOT NULL,
      crop_type     TEXT NOT NULL,
      description   TEXT,
      severity      TEXT DEFAULT 'warning',
      reported_by   TEXT REFERENCES users(user_id),
      reported_date TEXT DEFAULT (datetime('now')),
      temperature   REAL,
      humidity      REAL,
      rainfall      REAL,
      wind_speed    REAL
    );

    -- ── COMMUNITY POSTS ────────────────────────────────
    CREATE TABLE IF NOT EXISTS community_posts (
      post_id    TEXT PRIMARY KEY,
      user_id    TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      category   TEXT DEFAULT 'general',
      image_url  TEXT,
      likes      INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ── COMMUNITY REPLIES ──────────────────────────────
    CREATE TABLE IF NOT EXISTS community_replies (
      reply_id   TEXT PRIMARY KEY,
      post_id    TEXT REFERENCES community_posts(post_id) ON DELETE CASCADE,
      user_id    TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      image_url  TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ── SMS NOTIFICATIONS ──────────────────────────────
    CREATE TABLE IF NOT EXISTS sms_notifications (
      sms_id     TEXT PRIMARY KEY,
      farmer_id  TEXT REFERENCES farmers(farmer_id) ON DELETE CASCADE,
      alert_id   TEXT REFERENCES alerts(alert_id),
      status     TEXT DEFAULT 'pending',
      sent_at    TEXT
    );

    -- ── NOTIFICATION LOG ───────────────────────────────
    CREATE TABLE IF NOT EXISTS notification_log (
      id           TEXT PRIMARY KEY,
      user_id      TEXT REFERENCES users(user_id),
      advisory_id  TEXT REFERENCES advisories(advisory_id),
      channel      TEXT NOT NULL,
      status       TEXT DEFAULT 'pending',
      sent_at      TEXT,
      delivered_at TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- ── ACTIVITY LOGS ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS activity_logs (
      log_id      TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(user_id),
      action      TEXT NOT NULL,
      entity_type TEXT,
      entity_id   TEXT,
      details     TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── CROP YIELD REPORTS ─────────────────────────────
    CREATE TABLE IF NOT EXISTS yield_reports (
      report_id    TEXT PRIMARY KEY,
      farmer_id    TEXT REFERENCES farmers(farmer_id) ON DELETE CASCADE,
      season       TEXT NOT NULL,
      crop_type    TEXT NOT NULL,
      region       TEXT NOT NULL,
      area_hectares REAL NOT NULL,
      yield_kg     REAL NOT NULL,
      quality      TEXT DEFAULT 'good',
      notes        TEXT,
      reported_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── SUBSIDY REQUESTS ───────────────────────────────
    CREATE TABLE IF NOT EXISTS subsidy_requests (
      request_id   TEXT PRIMARY KEY,
      farmer_id    TEXT REFERENCES farmers(farmer_id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      quantity     TEXT NOT NULL,
      reason       TEXT NOT NULL,
      status       TEXT DEFAULT 'pending',
      reviewed_by  TEXT REFERENCES users(user_id),
      review_notes TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- ── CROP CALENDAR ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS crop_calendar (
      calendar_id  TEXT PRIMARY KEY,
      crop_type    TEXT NOT NULL,
      region       TEXT NOT NULL,
      activity     TEXT NOT NULL,
      month_start  INTEGER NOT NULL,
      month_end    INTEGER NOT NULL,
      description  TEXT,
      created_by   TEXT REFERENCES users(user_id),
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- ── FARM FIELDS ────────────────────────────────────
    CREATE TABLE IF NOT EXISTS farm_fields (
      field_id     TEXT PRIMARY KEY,
      farmer_id    TEXT REFERENCES farmers(farmer_id) ON DELETE CASCADE,
      field_name   TEXT NOT NULL,
      crop_type    TEXT NOT NULL,
      area_hectares REAL NOT NULL,
      gps_lat      REAL,
      gps_lng      REAL,
      soil_type    TEXT,
      irrigation   TEXT DEFAULT 'none',
      notes        TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Add image columns to existing tables if they don't exist ──
  try {
    db.run(`ALTER TABLE community_posts ADD COLUMN image_url TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    db.run(`ALTER TABLE community_replies ADD COLUMN image_url TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // ── Ensure default roles always exist ──────────────
  const existingRoles = query(db, `SELECT role_name FROM roles`);
  if (existingRoles.length === 0) {
    const { v4: uuidv4 } = await import('uuid');
    db.run(`INSERT INTO roles (role_id, role_name, description) VALUES (?,?,?)`,
      [uuidv4(), 'admin',  'System administrator with full access']);
    db.run(`INSERT INTO roles (role_id, role_name, description) VALUES (?,?,?)`,
      [uuidv4(), 'farmer', 'Registered farmer receiving advisories']);
    console.log('✅ Default roles created');
  }

  saveDb();
}

/** Run a SELECT and return rows as plain objects */
export function query<T = Record<string, unknown>>(
  db: Database,
  sql: string,
  params: unknown[] = []
): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as any);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

/** Run INSERT / UPDATE / DELETE */
export function run(db: Database, sql: string, params: unknown[] = []) {
  db.run(sql, params as any);
  saveDb();
}

export default { getDb, saveDb, initDb, query, run };
