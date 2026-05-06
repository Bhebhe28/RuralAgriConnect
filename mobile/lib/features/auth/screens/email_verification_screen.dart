import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class EmailVerificationScreen extends StatelessWidget {
  const EmailVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Email'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.mark_email_read_outlined, size: 56, color: AppTheme.primaryGreen),
            const SizedBox(height: 16),
            Text(
              'Verify your account',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'A verification email was sent to ${auth.email ?? 'your email'}.',
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 8),
            Text(
              'Open the link in your inbox, then return and tap "I verified my email".',
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: auth.isLoading
                  ? null
                  : () async {
                      final verified =
                          await context.read<AuthProvider>().refreshCurrentUser();
                      if (!context.mounted) return;
                      if (!verified) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Email is still not verified. Please check your inbox.',
                            ),
                          ),
                        );
                      }
                    },
              icon: const Icon(Icons.verified_outlined),
              label: const Text('I verified my email'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: auth.isLoading
                  ? null
                  : () async {
                      final sent =
                          await context.read<AuthProvider>().resendVerificationEmail();
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            sent
                                ? 'Verification email sent again.'
                                : (auth.errorMessage ??
                                    'Unable to resend verification email.'),
                          ),
                          backgroundColor: sent ? null : AppTheme.errorRed,
                        ),
                      );
                    },
              child: const Text('Resend verification email'),
            ),
          ],
        ),
      ),
    );
  }
}
