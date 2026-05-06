import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/data/screens/farm_field_list_screen.dart';
import '../../features/data/screens/add_farm_field_screen.dart';
import '../../features/data/screens/crop_record_list_screen.dart';
import '../../features/data/screens/add_crop_record_screen.dart';
import '../../features/diagnosis/screens/diagnosis_screen.dart';
import '../../features/diagnosis/screens/scan_history_screen.dart';

class AppRouter {
  static const String login          = '/login';
  static const String register       = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String home           = '/home';
  static const String farmFields     = '/farm-fields';
  static const String cropRecords    = '/crop-records';
  static const String addCropRecord  = '/crop-records/add';
  static const String addFarmField   = '/farm-fields/add';
  static const String diagnosis      = '/diagnosis';
  static const String scanHistory    = '/scan-history';

  static GoRouter router(AuthProvider auth) {
    return GoRouter(
      initialLocation: login,
      refreshListenable: auth,
      redirect: (context, state) {
        final status = auth.status;
        final location = state.matchedLocation;

        if (status == AuthStatus.unknown) return null;

        final isOnAuthRoute = location == login ||
            location == register ||
            location == forgotPassword;

        if (status == AuthStatus.unauthenticated) {
          return isOnAuthRoute ? null : login;
        }

        if (status == AuthStatus.authenticated) {
          return isOnAuthRoute ? home : null;
        }

        return null;
      },
      routes: [
        GoRoute(path: login,          builder: (_, __) => const LoginScreen()),
        GoRoute(path: register,       builder: (_, __) => const RegisterScreen()),
        GoRoute(path: forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
        GoRoute(path: home,           builder: (_, __) => const HomeScreen()),
        GoRoute(path: diagnosis,      builder: (_, __) => const DiagnosisScreen()),
        GoRoute(path: scanHistory,    builder: (_, __) => const ScanHistoryScreen()),
        GoRoute(
          path: farmFields,
          builder: (_, __) => const FarmFieldListScreen(),
          routes: [
            GoRoute(path: 'add', builder: (_, __) => const AddFarmFieldScreen()),
          ],
        ),
        GoRoute(
          path: cropRecords,
          builder: (_, __) => const CropRecordListScreen(),
          routes: [
            GoRoute(path: 'add', builder: (_, __) => const AddCropRecordScreen()),
          ],
        ),
      ],
    );
  }
}
