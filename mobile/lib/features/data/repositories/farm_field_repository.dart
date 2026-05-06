import '../../../core/services/database_service.dart';
import '../models/farm_field.dart';

/// FarmFieldRepository — all SQLite operations for farm fields.
///
/// CRITICAL: Every query filters by [userId] (Firebase UID).
/// This ensures complete data isolation between users on the same device.
class FarmFieldRepository {
  final DatabaseService _db = DatabaseService.instance;

  static const String _table = 'farm_fields';

  // ── Create ────────────────────────────────────────────────────────────────

  Future<FarmField> insert(FarmField field) async {
    await _db.db.insert(_table, field.toMap());
    return field;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  /// Returns all fields belonging to [userId], newest first.
  Future<List<FarmField>> getAllByUser(String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'user_id = ?',
      whereArgs: [userId],
      orderBy: 'created_at DESC',
    );
    return maps.map(FarmField.fromMap).toList();
  }

  Future<FarmField?> getById(String id, String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return FarmField.fromMap(maps.first);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  Future<FarmField> update(FarmField field) async {
    await _db.db.update(
      _table,
      field.toMap(),
      where: 'id = ? AND user_id = ?',
      whereArgs: [field.id, field.userId],
    );
    return field;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  Future<void> delete(String id, String userId) async {
    await _db.db.delete(
      _table,
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
    );
  }

  // ── Sync helpers (future-ready) ───────────────────────────────────────────

  Future<List<FarmField>> getUnsynced(String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'user_id = ? AND is_synced = 0',
      whereArgs: [userId],
    );
    return maps.map(FarmField.fromMap).toList();
  }

  Future<void> markSynced(String id, String userId) async {
    await _db.db.update(
      _table,
      {'is_synced': 1, 'updated_at': DateTime.now().toIso8601String()},
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
    );
  }
}
