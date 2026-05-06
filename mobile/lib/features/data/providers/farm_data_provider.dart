import 'package:flutter/foundation.dart';
import '../models/farm_field.dart';
import '../models/crop_record.dart';
import '../repositories/farm_field_repository.dart';
import '../repositories/crop_record_repository.dart';

/// FarmDataProvider — manages farm fields and crop records for the UI.
///
/// Receives the user ID from AuthProvider via ProxyProvider.
/// All repository calls are automatically scoped to the current user.
class FarmDataProvider extends ChangeNotifier {
  final FarmFieldRepository _fieldRepo = FarmFieldRepository();
  final CropRecordRepository _cropRepo = CropRecordRepository();

  String? _userId;
  List<FarmField> _fields = [];
  List<CropRecord> _cropRecords = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<FarmField> get fields => List.unmodifiable(_fields);
  List<CropRecord> get cropRecords => List.unmodifiable(_cropRecords);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get userId => _userId;

  /// Called by ProxyProvider whenever AuthProvider changes.
  void updateUserId(String? uid) {
    if (_userId == uid) return;
    _userId = uid;
    if (uid != null) {
      loadAll();
    } else {
      _fields = [];
      _cropRecords = [];
      notifyListeners();
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  Future<void> loadAll() async {
    if (_userId == null) return;
    _setLoading(true);
    try {
      await Future.wait([loadFields(), loadCropRecords()]);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadFields() async {
    if (_userId == null) return;
    try {
      _fields = await _fieldRepo.getAllByUser(_userId!);
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to load fields: $e';
      notifyListeners();
    }
  }

  Future<void> loadCropRecords() async {
    if (_userId == null) return;
    try {
      _cropRecords = await _cropRepo.getAllByUser(_userId!);
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to load crop records: $e';
      notifyListeners();
    }
  }

  // ── Farm Fields ───────────────────────────────────────────────────────────

  Future<bool> addField({
    required String name,
    String? location,
    double? areaHa,
    String? soilType,
  }) async {
    if (_userId == null) return false;
    try {
      final field = FarmField.create(
        userId: _userId!,
        name: name,
        location: location,
        areaHa: areaHa,
        soilType: soilType,
      );
      final saved = await _fieldRepo.insert(field);
      _fields = [saved, ..._fields];
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to save field: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateField(FarmField updated) async {
    if (_userId == null) return false;
    try {
      final saved = await _fieldRepo.update(updated);
      final index = _fields.indexWhere((f) => f.id == saved.id);
      if (index != -1) {
        _fields = List.from(_fields)..[index] = saved;
        notifyListeners();
      }
      return true;
    } catch (e) {
      _errorMessage = 'Failed to update field: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteField(String fieldId) async {
    if (_userId == null) return false;
    try {
      await _fieldRepo.delete(fieldId, _userId!);
      _fields = _fields.where((f) => f.id != fieldId).toList();
      // Also remove associated crop records from local list
      _cropRecords = _cropRecords.where((c) => c.fieldId != fieldId).toList();
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to delete field: $e';
      notifyListeners();
      return false;
    }
  }

  // ── Crop Records ──────────────────────────────────────────────────────────

  Future<bool> addCropRecord({
    required String fieldId,
    required String cropName,
    String? variety,
    DateTime? plantedDate,
    DateTime? harvestDate,
    String? notes,
  }) async {
    if (_userId == null) return false;
    try {
      final record = CropRecord.create(
        userId: _userId!,
        fieldId: fieldId,
        cropName: cropName,
        variety: variety,
        plantedDate: plantedDate,
        harvestDate: harvestDate,
        notes: notes,
      );
      final saved = await _cropRepo.insert(record);
      _cropRecords = [saved, ..._cropRecords];
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to save crop record: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteCropRecord(String recordId) async {
    if (_userId == null) return false;
    try {
      await _cropRepo.delete(recordId, _userId!);
      _cropRecords = _cropRecords.where((c) => c.id != recordId).toList();
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to delete crop record: $e';
      notifyListeners();
      return false;
    }
  }

  List<CropRecord> getCropRecordsForField(String fieldId) {
    return _cropRecords.where((c) => c.fieldId == fieldId).toList();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
