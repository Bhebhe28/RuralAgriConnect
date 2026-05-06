import 'package:dio/dio.dart';
import '../models/app_user.dart';
import 'api_client.dart';
import 'local_session_service.dart';

/// AuthService — talks to our Express/JWT backend.
/// Firebase is NOT used for auth — only our Railway API.
class AuthService {
  AuthService._internal();
  static final AuthService instance = AuthService._internal();

  final LocalSessionService _localSession = LocalSessionService.instance;
  final ApiClient _api = ApiClient.instance;

  // ── Register ──────────────────────────────────────────────────────────────
  Future<AuthResult> register({
    required String email,
    required String password,
    String? displayName,
    String? phone,
    String? role,
    String? region,
  }) async {
    try {
      await _api.post('/auth/register', data: {
        'name': displayName ?? email.split('@').first,
        'email': email.trim(),
        'password': password,
        if (phone != null) 'phone': phone,
        'role': role ?? 'farmer',
        if (region != null) 'region': region,
      });
      // Auto-login after register
      return await login(email: email, password: password);
    } on DioException catch (e) {
      return AuthResult.failure(message: ApiClient.extractError(e));
    } catch (_) {
      return AuthResult.failure(message: 'Unable to register at the moment.');
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _api.post('/auth/login', data: {
        'email': email.trim(),
        'password': password,
      });

      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String;
      final userData = data['user'] as Map<String, dynamic>;

      // Save JWT token
      await _api.saveToken(token);

      final appUser = AppUser(
        uid: userData['id'].toString(),
        email: userData['email'].toString(),
        displayName: userData['name']?.toString(),
        role: userData['role']?.toString() ?? 'farmer',
        region: userData['region']?.toString(),
        emailVerified: true, // JWT-based, no email verification needed
      );

      await _localSession.saveSession(
        uid: appUser.uid,
        email: appUser.email,
        displayName: appUser.displayName ?? '',
        role: appUser.role,
        region: appUser.region ?? '',
      );

      return AuthResult.success(user: appUser);
    } on DioException catch (e) {
      return AuthResult.failure(message: ApiClient.extractError(e));
    } catch (_) {
      return AuthResult.failure(message: 'Unable to sign in at the moment.');
    }
  }

  // ── Restore session from stored JWT ───────────────────────────────────────
  Future<AuthResult> restoreSession() async {
    final token = await _api.getToken();
    if (token == null) return const AuthResult.unauthenticated();

    final session = await _localSession.getSession();
    if (session == null) return const AuthResult.unauthenticated();

    // Verify token is still valid by calling /users/me
    try {
      final response = await _api.get('/users/me');
      final data = response.data as Map<String, dynamic>;
      final appUser = AppUser(
        uid: (data['user_id'] ?? data['id']).toString(),
        email: data['email'].toString(),
        displayName: data['full_name']?.toString(),
        role: data['role']?.toString() ?? 'farmer',
        region: data['region']?.toString(),
        emailVerified: true,
      );
      return AuthResult.success(user: appUser);
    } catch (_) {
      // Token expired or invalid — clear it
      await _api.clearToken();
      await _localSession.clearSession();
      return const AuthResult.unauthenticated();
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  Future<AuthResult> sendPasswordResetEmail(String email) async {
    try {
      await _api.post('/auth/forgot-password', data: {'email': email.trim()});
      return const AuthResult.actionCompleted();
    } on DioException catch (e) {
      return AuthResult.failure(message: ApiClient.extractError(e));
    } catch (_) {
      return AuthResult.failure(message: 'Unable to send reset email.');
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await _api.clearToken();
    await _localSession.clearSession();
  }
}

// ── Result type ───────────────────────────────────────────────────────────────
class AuthResult {
  final bool isSuccess;
  final bool completed;
  final AppUser? user;
  final String? errorMessage;

  const AuthResult._({
    required this.isSuccess,
    required this.completed,
    this.user,
    this.errorMessage,
  });

  const AuthResult.unauthenticated()
      : isSuccess = false,
        completed = false,
        user = null,
        errorMessage = null;

  const AuthResult.actionCompleted()
      : isSuccess = true,
        completed = true,
        user = null,
        errorMessage = null;

  factory AuthResult.success({required AppUser user}) =>
      AuthResult._(isSuccess: true, completed: true, user: user);

  factory AuthResult.failure({required String message}) =>
      AuthResult._(isSuccess: false, completed: true, errorMessage: message);
}
