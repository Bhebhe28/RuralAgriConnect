import '../../../core/services/database_service.dart';
import '../models/crop_record.dart';

/// CropRecordRepository — all SQLite operations for crop records.
/// Every query is scoped to [userId] (Firebase UID).
class CropRecordRepository {
  final DatabaseService _db = DatabaseService.instance;

  static const String _table = 'crop_records';

  Future<CropRecord> insert(CropRecord record) async {
    await _db.db.insert(_table, record.toMap());
    return record;
  }

  Future<List<CropRecord>> getAllByUser(String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'user_id = ?',
      whereArgs: [userId],
      orderBy: 'created_at DESC',
    );
    return maps.map(CropRecord.fromMap).toList();
  }

  Future<List<CropRecord>> getByField(String fieldId, String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'field_id = ? AND user_id = ?',
      whereArgs: [fieldId, userId],
      orderBy: 'created_at DESC',
    );
    return maps.map(CropRecord.fromMap).toList();
  }

  Future<CropRecord?> getById(String id, String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return CropRecord.fromMap(maps.first);
  }

  Future<CropRecord> update(CropRecord record) async {
    await _db.db.update(
      _table,
      record.toMap(),
      where: 'id = ? AND user_id = ?',
      whereArgs: [record.id, record.userId],
    );
    return record;
  }

  Future<void> delete(String id, String userId) async {
    await _db.db.delete(
      _table,
      where: 'id = ? AND user_id = ?',
      whereArgs: [id, userId],
    );
  }

  Future<List<CropRecord>> getUnsynced(String userId) async {
    final maps = await _db.db.query(
      _table,
      where: 'user_id = ? AND is_synced = 0',
      whereArgs: [userId],
    );
    return maps.map(CropRecord.fromMap).toList();
  }
}
