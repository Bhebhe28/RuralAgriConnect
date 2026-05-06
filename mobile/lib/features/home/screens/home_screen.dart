import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/data/providers/farm_data_provider.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/theme_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth  = context.watch<AuthProvider>();
    final data  = context.watch<FarmDataProvider>();
    final theme = context.watch<ThemeProvider>();
    final isDark = theme.isDark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('RurAgriConnect'),
        actions: [
          // ── Day / Night toggle ───────────────────────────────────────────
          Tooltip(
            message: isDark ? 'Switch to Day mode' : 'Switch to Night mode',
            child: IconButton(
              icon: Icon(isDark ? Icons.wb_sunny_outlined : Icons.nightlight_round),
              onPressed: () => context.read<ThemeProvider>().toggle(),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => _confirmLogout(context, auth),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => data.loadAll(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Welcome banner ─────────────────────────────────────────────
              _WelcomeBanner(
                displayName: auth.displayName ?? auth.email ?? 'Farmer',
                region: auth.region ?? 'KwaZulu-Natal',
                isDark: isDark,
              ),
              const SizedBox(height: 20),

              // ── AI Diagnosis hero card ─────────────────────────────────────
              _AiDiagnosisCard(isDark: isDark),
              const SizedBox(height: 20),

              // ── Stats row ──────────────────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      icon: Icons.landscape,
                      label: 'Farm Fields',
                      value: data.fields.length.toString(),
                      color: AppTheme.primaryGreen,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      icon: Icons.grass,
                      label: 'Crop Records',
                      value: data.cropRecords.length.toString(),
                      color: AppTheme.accentAmber,
                      isDark: isDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── Quick actions ──────────────────────────────────────────────
              Text(
                'Quick Actions',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 12),
              _QuickActionCard(
                icon: Icons.add_location_alt_outlined,
                title: 'Manage Farm Fields',
                subtitle: '${data.fields.length} fields registered',
                onTap: () => context.push(AppRouter.farmFields),
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              _QuickActionCard(
                icon: Icons.eco_outlined,
                title: 'Crop Records',
                subtitle: '${data.cropRecords.length} records',
                onTap: () => context.push(AppRouter.cropRecords),
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              _QuickActionCard(
                icon: Icons.history,
                title: 'Scan History',
                subtitle: 'View past AI diagnoses',
                onTap: () => context.push(AppRouter.scanHistory),
                isDark: isDark,
              ),
              const SizedBox(height: 20),

              // ── Offline indicator ──────────────────────────────────────────
              _OfflineNotice(isDark: isDark),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, AuthProvider auth) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
            'Your data is saved locally and will be available when you sign back in.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed == true) await auth.logout();
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _WelcomeBanner extends StatelessWidget {
  final String displayName;
  final String region;
  final bool isDark;

  const _WelcomeBanner({
    required this.displayName,
    required this.region,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [AppTheme.nightSurface, AppTheme.nightCard]
              : [AppTheme.primaryGreen, AppTheme.lightGreen],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: isDark
            ? Border.all(color: AppTheme.nightBorder)
            : null,
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: isDark
                ? AppTheme.nightPrimary.withOpacity(0.2)
                : Colors.white24,
            radius: 26,
            child: Text(
              displayName.isNotEmpty ? displayName[0].toUpperCase() : 'F',
              style: TextStyle(
                color: isDark ? AppTheme.nightPrimary : Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 22,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome back,',
                    style: TextStyle(
                      color: isDark
                          ? AppTheme.nightTextMuted
                          : Colors.white.withOpacity(0.8),
                      fontSize: 13,
                    )),
                Text(displayName,
                    style: TextStyle(
                      color: isDark ? AppTheme.nightText : Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                    )),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.location_on,
                        size: 13,
                        color: isDark
                            ? AppTheme.nightTextMuted
                            : Colors.white70),
                    const SizedBox(width: 3),
                    Text(region,
                        style: TextStyle(
                          color: isDark
                              ? AppTheme.nightTextMuted
                              : Colors.white70,
                          fontSize: 12,
                        )),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AiDiagnosisCard extends StatelessWidget {
  final bool isDark;
  const _AiDiagnosisCard({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(AppRouter.diagnosis),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isDark
                ? [const Color(0xFF1B3D1B), const Color(0xFF223322)]
                : [const Color(0xFF1B5E20), AppTheme.primaryGreen],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: isDark ? Border.all(color: AppTheme.nightBorder) : null,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.biotech, color: Colors.white, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('AI Crop Diagnosis',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 17)),
                  const SizedBox(height: 4),
                  Text('Take a photo to detect diseases & pests instantly',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.8), fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 16),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = isDark ? AppTheme.nightCard : Colors.white;
    final valueColor = isDark && color == AppTheme.primaryGreen ? AppTheme.nightPrimary : color;

    return Card(
      color: cardColor,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: valueColor, size: 28),
            const SizedBox(height: 8),
            Text(value,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: valueColor,
                    )),
            Text(label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isDark ? AppTheme.nightTextMuted : Colors.grey[600],
                    )),
          ],
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDark;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final iconBg = isDark
        ? AppTheme.nightPrimary.withOpacity(0.15)
        : AppTheme.primaryGreen.withOpacity(0.1);
    final iconColor = isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen;

    return Card(
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
              color: iconBg, borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: iconColor),
        ),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: Icon(Icons.chevron_right,
            color: isDark ? AppTheme.nightTextMuted : Colors.grey),
        onTap: onTap,
      ),
    );
  }
}

class _OfflineNotice extends StatelessWidget {
  final bool isDark;
  const _OfflineNotice({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final bg = isDark
        ? AppTheme.nightCard
        : Colors.blue.shade50;
    final border = isDark ? AppTheme.nightBorder : Colors.blue.shade200;
    final fg = isDark ? AppTheme.nightPrimary : Colors.blue.shade700;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border)),
      child: Row(
        children: [
          Icon(Icons.offline_bolt_outlined, color: fg, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text('All data stored locally. Works fully offline.',
                style: TextStyle(color: fg, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
