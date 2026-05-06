import 'package:sqflite/sqflite.dart';
import '../../../core/services/database_service.dart';
import '../models/scan_result.dart';

class ScanRepository {
  ScanRepository._();
  static final ScanRepository instance = ScanRepository._();

  Database get _db => DatabaseService.instance.db;

  Future<void> insert(ScanResult scan) async {
    await _db.insert('scan_history', scan.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<ScanResult>> getAllByUser(String userId) async {
    final rows = await _db.query(
      'scan_history',
      where: 'user_id = ?',
      whereArgs: [userId],
      orderBy: 'scanned_at DESC',
    );
    return rows.map(ScanResult.fromMap).toList();
  }

  Future<void> delete(String id) async {
    await _db.delete('scan_history', where: 'id = ?', whereArgs: [id]);
  }
}
