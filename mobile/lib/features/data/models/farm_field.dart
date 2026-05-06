import 'package:uuid/uuid.dart';

/// FarmField model — maps 1:1 to the `farm_fields` SQLite table.
/// Every record is scoped to the server user ID via [userId].
class FarmField {
  final String id;
  final String userId; // Server user ID — enforces data isolation
  final String name;
  final String? location;
  final double? areaHa;
  final String? soilType;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;

  const FarmField({
    required this.id,
    required this.userId,
    required this.name,
    this.location,
    this.areaHa,
    this.soilType,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
  });

  factory FarmField.create({
    required String userId,
    required String name,
    String? location,
    double? areaHa,
    String? soilType,
  }) {
    final now = DateTime.now();
    return FarmField(
      id: const Uuid().v4(),
      userId: userId,
      name: name,
      location: location,
      areaHa: areaHa,
      soilType: soilType,
      createdAt: now,
      updatedAt: now,
    );
  }

  FarmField copyWith({
    String? name,
    String? location,
    double? areaHa,
    String? soilType,
    bool? isSynced,
  }) {
    return FarmField(
      id: id,
      userId: userId,
      name: name ?? this.name,
      location: location ?? this.location,
      areaHa: areaHa ?? this.areaHa,
      soilType: soilType ?? this.soilType,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isSynced: isSynced ?? this.isSynced,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'location': location,
      'area_ha': areaHa,
      'soil_type': soilType,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'is_synced': isSynced ? 1 : 0,
    };
  }

  factory FarmField.fromMap(Map<String, dynamic> map) {
    return FarmField(
      id: map['id'] as String,
      userId: map['user_id'] as String,
      name: map['name'] as String,
      location: map['location'] as String?,
      areaHa: map['area_ha'] as double?,
      soilType: map['soil_type'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
      isSynced: (map['is_synced'] as int) == 1,
    );
  }

  @override
  String toString() => 'FarmField(id: $id, name: $name, userId: $userId)';
}
