import 'package:uuid/uuid.dart';

class ScanResult {
  final String id;
  final String userId;
  final String imagePath;
  final String diagnosis;
  final String cropName;
  final DateTime scannedAt;

  const ScanResult({
    required this.id,
    required this.userId,
    required this.imagePath,
    required this.diagnosis,
    required this.cropName,
    required this.scannedAt,
  });

  factory ScanResult.create({
    required String userId,
    required String imagePath,
    required String diagnosis,
    String cropName = '',
  }) {
    return ScanResult(
      id: const Uuid().v4(),
      userId: userId,
      imagePath: imagePath,
      diagnosis: diagnosis,
      cropName: cropName,
      scannedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'user_id': userId,
    'image_path': imagePath,
    'diagnosis': diagnosis,
    'crop_name': cropName,
    'scanned_at': scannedAt.toIso8601String(),
  };

  factory ScanResult.fromMap(Map<String, dynamic> m) => ScanResult(
    id: m['id'] as String,
    userId: m['user_id'] as String,
    imagePath: m['image_path'] as String,
    diagnosis: m['diagnosis'] as String,
    cropName: (m['crop_name'] as String?) ?? '',
    scannedAt: DateTime.parse(m['scanned_at'] as String),
  );
}
