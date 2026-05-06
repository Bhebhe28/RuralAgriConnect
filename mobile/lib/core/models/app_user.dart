class AppUser {
  final String uid;
  final String email;
  final String? displayName;
  final String role;
  final String? region;
  final bool emailVerified;

  const AppUser({
    required this.uid,
    required this.email,
    required this.emailVerified,
    this.displayName,
    this.role = 'farmer',
    this.region,
  });

  bool get isAdmin => role == 'admin';
}
