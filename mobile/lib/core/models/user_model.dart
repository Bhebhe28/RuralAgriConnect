/// UserModel — matches the user object returned by POST /api/auth/login
///
/// Server returns: { id, name, email, phone, role, region }
class UserModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? region;
  final String? avatarUrl;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.role = 'farmer',
    this.region,
    this.avatarUrl,
  });

  bool get isAdmin => role == 'admin';
  bool get isFarmer => role == 'farmer';

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: (map['id'] ?? map['user_id'] ?? '').toString(),
      name: (map['name'] ?? map['full_name'] ?? '').toString(),
      email: (map['email'] ?? '').toString(),
      phone: map['phone']?.toString() ?? map['phone_number']?.toString(),
      role: (map['role'] ?? map['role_name'] ?? 'farmer').toString(),
      region: map['region']?.toString(),
      avatarUrl: map['avatar_url']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'region': region,
      'avatar_url': avatarUrl,
    };
  }

  UserModel copyWith({
    String? name,
    String? phone,
    String? region,
    String? avatarUrl,
  }) {
    return UserModel(
      id: id,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      role: role,
      region: region ?? this.region,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }

  @override
  String toString() => 'UserModel(id: $id, name: $name, role: $role)';
}
