import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseService {
  DatabaseService._internal();
  static final DatabaseService instance = DatabaseService._internal();

  static Database? _db;

  static const int _schemaVersion = 2;
  static const String _dbName = 'ruragriconnect.db';

  Database get db {
    if (_db == null) throw StateError('DatabaseService not initialized. Call initialize() first.');
    return _db!;
  }

  Future<void> initialize() async {
    if (_db != null) return;
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _dbName);

    _db = await openDatabase(
      path,
      version: _schemaVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
      onConfigure: _onConfigure,
    );
  }

  Future<void> _onConfigure(Database db) async {
    await db.execute('PRAGMA foreign_keys = ON');
  }

  Future<void> _onCreate(Database db, int version) async {
    await _createSchema(db);
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
          id          TEXT PRIMARY KEY,
          user_id     TEXT NOT NULL,
          image_path  TEXT NOT NULL,
          diagnosis   TEXT NOT NULL,
          crop_name   TEXT NOT NULL DEFAULT '',
          scanned_at  TEXT NOT NULL
        )
      ''');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_scans_user ON scan_history(user_id)');
    }
  }

  Future<void> _createSchema(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS farm_fields (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        name        TEXT NOT NULL,
        location    TEXT,
        area_ha     REAL,
        soil_type   TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        is_synced   INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS crop_records (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        field_id      TEXT NOT NULL,
        crop_name     TEXT NOT NULL,
        variety       TEXT,
        planted_date  TEXT,
        harvest_date  TEXT,
        status        TEXT NOT NULL DEFAULT 'active',
        notes         TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        is_synced     INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (field_id) REFERENCES farm_fields(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS yield_reports (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL,
        crop_record_id  TEXT NOT NULL,
        yield_kg        REAL NOT NULL,
        quality_grade   TEXT,
        report_date     TEXT NOT NULL,
        notes           TEXT,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (crop_record_id) REFERENCES crop_records(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS advisories (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        title        TEXT NOT NULL,
        content      TEXT NOT NULL,
        category     TEXT,
        severity     TEXT,
        published_at TEXT,
        created_at   TEXT NOT NULL,
        is_read      INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_queue (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL,
        table_name  TEXT NOT NULL,
        record_id   TEXT NOT NULL,
        operation   TEXT NOT NULL,
        payload     TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0
      )
    ''');

    // AI scan history
    await db.execute('''
      CREATE TABLE IF NOT EXISTS scan_history (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        image_path  TEXT NOT NULL,
        diagnosis   TEXT NOT NULL,
        crop_name   TEXT NOT NULL DEFAULT '',
        scanned_at  TEXT NOT NULL
      )
    ''');

    await db.execute('CREATE INDEX IF NOT EXISTS idx_fields_user ON farm_fields(user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_crops_user ON crop_records(user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_yields_user ON yield_reports(user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_advisories_user ON advisories(user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sync_user ON sync_queue(user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_scans_user ON scan_history(user_id)');
  }

  Future<void> clearUserData(String userId) async {
    final tables = ['farm_fields', 'crop_records', 'yield_reports', 'advisories', 'sync_queue', 'scan_history'];
    for (final table in tables) {
      await db.delete(table, where: 'user_id = ?', whereArgs: [userId]);
    }
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
