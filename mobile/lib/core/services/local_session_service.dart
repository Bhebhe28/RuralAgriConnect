import 'package:shared_preferences/shared_preferences.dart';

class SessionData {
  final String uid;
  final String email;
  final String displayName;
  final String role;
  final String region;

  const SessionData({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.role,
    required this.region,
  });
}

class LocalSessionService {
  LocalSessionService._();
  static final LocalSessionService instance = LocalSessionService._();

  static const _uidKey      = 'session_uid';
  static const _emailKey    = 'session_email';
  static const _nameKey     = 'session_name';
  static const _roleKey     = 'session_role';
  static const _regionKey   = 'session_region';

  Future<void> saveSession({
    required String uid,
    required String email,
    required String displayName,
    required String role,
    required String region,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_uidKey,    uid);
    await prefs.setString(_emailKey,  email);
    await prefs.setString(_nameKey,   displayName);
    await prefs.setString(_roleKey,   role);
    await prefs.setString(_regionKey, region);
  }

  Future<SessionData?> getSession() async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString(_uidKey);
    if (uid == null) return null;
    return SessionData(
      uid:         uid,
      email:       prefs.getString(_emailKey)  ?? '',
      displayName: prefs.getString(_nameKey)   ?? '',
      role:        prefs.getString(_roleKey)   ?? 'farmer',
      region:      prefs.getString(_regionKey) ?? '',
    );
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_uidKey);
    await prefs.remove(_emailKey);
    await prefs.remove(_nameKey);
    await prefs.remove(_roleKey);
    await prefs.remove(_regionKey);
  }
}
