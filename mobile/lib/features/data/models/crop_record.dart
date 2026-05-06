import 'package:uuid/uuid.dart';

enum CropStatus { active, harvested, failed }

extension CropStatusExtension on CropStatus {
  String get value {
    switch (this) {
      case CropStatus.active:
        return 'active';
      case CropStatus.harvested:
        return 'harvested';
      case CropStatus.failed:
        return 'failed';
    }
  }

  static CropStatus fromString(String s) {
    switch (s) {
      case 'harvested':
        return CropStatus.harvested;
      case 'failed':
        return CropStatus.failed;
      default:
        return CropStatus.active;
    }
  }
}

/// CropRecord model — maps 1:1 to the `crop_records` SQLite table.
class CropRecord {
  final String id;
  final String userId; // Server user ID
  final String fieldId;
  final String cropName;
  final String? variety;
  final DateTime? plantedDate;
  final DateTime? harvestDate;
  final CropStatus status;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;

  const CropRecord({
    required this.id,
    required this.userId,
    required this.fieldId,
    required this.cropName,
    this.variety,
    this.plantedDate,
    this.harvestDate,
    this.status = CropStatus.active,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
  });

  factory CropRecord.create({
    required String userId,
    required String fieldId,
    required String cropName,
    String? variety,
    DateTime? plantedDate,
    DateTime? harvestDate,
    String? notes,
  }) {
    final now = DateTime.now();
    return CropRecord(
      id: const Uuid().v4(),
      userId: userId,
      fieldId: fieldId,
      cropName: cropName,
      variety: variety,
      plantedDate: plantedDate,
      harvestDate: harvestDate,
      notes: notes,
      createdAt: now,
      updatedAt: now,
    );
  }

  CropRecord copyWith({
    String? cropName,
    String? variety,
    DateTime? plantedDate,
    DateTime? harvestDate,
    CropStatus? status,
    String? notes,
    bool? isSynced,
  }) {
    return CropRecord(
      id: id,
      userId: userId,
      fieldId: fieldId,
      cropName: cropName ?? this.cropName,
      variety: variety ?? this.variety,
      plantedDate: plantedDate ?? this.plantedDate,
      harvestDate: harvestDate ?? this.harvestDate,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isSynced: isSynced ?? this.isSynced,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'field_id': fieldId,
      'crop_name': cropName,
      'variety': variety,
      'planted_date': plantedDate?.toIso8601String(),
      'harvest_date': harvestDate?.toIso8601String(),
      'status': status.value,
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'is_synced': isSynced ? 1 : 0,
    };
  }

  factory CropRecord.fromMap(Map<String, dynamic> map) {
    return CropRecord(
      id: map['id'] as String,
      userId: map['user_id'] as String,
      fieldId: map['field_id'] as String,
      cropName: map['crop_name'] as String,
      variety: map['variety'] as String?,
      plantedDate: map['planted_date'] != null
          ? DateTime.parse(map['planted_date'] as String)
          : null,
      harvestDate: map['harvest_date'] != null
          ? DateTime.parse(map['harvest_date'] as String)
          : null,
      status: CropStatusExtension.fromString(map['status'] as String),
      notes: map['notes'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
      isSynced: (map['is_synced'] as int) == 1,
    );
  }
}
