import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// ApiClient — Dio HTTP client wired to your existing Node.js/Express backend.
///
/// Mirrors what client/src/api/client.ts does:
///   - Attaches Bearer JWT token to every request
///   - On 401 → clears token (triggers logout via AuthProvider)
///
/// BASE URL:
///   - Android emulator  → 10.0.2.2:3001  (loopback alias)
///   - iOS simulator     → localhost:3001
///   - Physical device   → your machine's LAN IP (set in .env or config)
class ApiClient {
  ApiClient._internal();
  static final ApiClient instance = ApiClient._internal();

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // ── Callbacks set by AuthProvider ─────────────────────────────────────────
  Function()? onUnauthorized;

  void initialize({required String baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    // Attach JWT token to every request
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          onUnauthorized?.call();
        }
        return handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;

  // ── Convenience methods ───────────────────────────────────────────────────

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> put(String path, {dynamic data}) =>
      _dio.put(path, data: data);

  Future<Response> delete(String path) => _dio.delete(path);

  // ── Token management ──────────────────────────────────────────────────────

  Future<void> saveToken(String token) =>
      _storage.write(key: 'jwt_token', value: token);

  Future<String?> getToken() => _storage.read(key: 'jwt_token');

  Future<void> clearToken() => _storage.delete(key: 'jwt_token');

  // ── Error helper ──────────────────────────────────────────────────────────

  static String extractError(dynamic error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['error'] != null) return data['error'].toString();
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Connection timed out. Check your network.';
      }
      if (error.type == DioExceptionType.connectionError) {
        return 'Cannot reach server. Make sure it is running.';
      }
    }
    return 'An unexpected error occurred.';
  }
}
