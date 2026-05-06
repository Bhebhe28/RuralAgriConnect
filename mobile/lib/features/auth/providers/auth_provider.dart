import 'package:flutter/foundation.dart';
import '../../../core/models/app_user.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/database_service.dart';
import '../../../core/services/api_client.dart';
import '../../../core/config/app_config.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService.instance;

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;
  bool _isLoading = false;
  String? _errorMessage;

  AuthStatus get status => _status;
  AppUser? get user => _user;
  String? get uid => _user?.uid;
  String? get displayName => _user?.displayName;
  String? get email => _user?.email;
  String get role => _user?.role ?? 'farmer';
  String? get region => _user?.region;
  bool get isAdmin => _user?.isAdmin ?? false;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  // No email verification needed — JWT-based auth
  bool get requiresEmailVerification => false;

  AuthProvider() {
    // Initialize API client with Railway URL
    ApiClient.instance.initialize(baseUrl: AppConfig.baseUrl);
    ApiClient.instance.onUnauthorized = () {
      _user = null;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
    };
    _restoreSession();
  }

  // ── Session restore ───────────────────────────────────────────────────────
  Future<void> _restoreSession() async {
    _status = AuthStatus.unknown;
    notifyListeners();

    final result = await _authService.restoreSession();
    if (result.user != null) {
      _user = result.user;
      _status = AuthStatus.authenticated;
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  Future<bool> login({required String email, required String password}) async {
    _setLoading(true);
    _clearError();

    final result = await _authService.login(email: email, password: password);
    _setLoading(false);

    if (result.isSuccess) {
      _user = result.user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } else {
      _errorMessage = result.errorMessage;
      notifyListeners();
      return false;
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────
  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? region,
  }) async {
    _setLoading(true);
    _clearError();

    final result = await _authService.register(
      displayName: name,
      email: email,
      password: password,
      phone: phone,
      region: region,
    );

    _setLoading(false);

    if (result.isSuccess) {
      _user = result.user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } else {
      _errorMessage = result.errorMessage;
      notifyListeners();
      return false;
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    _setLoading(true);
    if (_user != null) {
      await DatabaseService.instance.clearUserData(_user!.uid);
    }
    await _authService.logout();
    _user = null;
    _status = AuthStatus.unauthenticated;
    _setLoading(false);
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  Future<bool> sendPasswordResetEmail(String email) async {
    _setLoading(true);
    _clearError();
    final result = await _authService.sendPasswordResetEmail(email);
    _setLoading(false);
    if (!result.isSuccess) {
      _errorMessage = result.errorMessage;
      notifyListeners();
      return false;
    }
    return true;
  }

  // ── Email verification stubs (not used — JWT auth has no verification step)
  Future<bool> refreshCurrentUser() async => true;
  Future<bool> resendVerificationEmail() async => false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void _clearError() => _errorMessage = null;

  void clearError() {
    _clearError();
    notifyListeners();
  }
}
