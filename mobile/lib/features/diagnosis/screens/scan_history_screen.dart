import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../models/scan_result.dart';
import '../repositories/scan_repository.dart';

class ScanHistoryScreen extends StatefulWidget {
  const ScanHistoryScreen({super.key});

  @override
  State<ScanHistoryScreen> createState() => _ScanHistoryScreenState();
}

class _ScanHistoryScreenState extends State<ScanHistoryScreen> {
  List<ScanResult> _scans = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = context.read<AuthProvider>().uid;
    if (uid == null) { setState(() => _loading = false); return; }
    final scans = await ScanRepository.instance.getAllByUser(uid);
    if (mounted) setState(() { _scans = scans; _loading = false; });
  }

  Future<void> _delete(ScanResult scan) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete scan?'),
        content: const Text('This will remove the diagnosis record.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.errorRed),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    await ScanRepository.instance.delete(scan.id);
    // Also delete local image file
    try { await File(scan.imagePath).delete(); } catch (_) {}
    setState(() => _scans.removeWhere((s) => s.id == scan.id));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan History'),
        actions: [
          if (_scans.isNotEmpty)
            TextButton(
              onPressed: _confirmClearAll,
              child: Text('Clear All',
                  style: TextStyle(
                    color: isDark ? AppTheme.nightText : Colors.white,
                    fontSize: 13,
                  )),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _scans.isEmpty
              ? _EmptyState(isDark: isDark)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _scans.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _ScanCard(
                      scan: _scans[i],
                      isDark: isDark,
                      onDelete: () => _delete(_scans[i]),
                      onTap: () => _showDetail(_scans[i]),
                    ),
                  ),
                ),
    );
  }

  Future<void> _confirmClearAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear all history?'),
        content: const Text('All scan records and images will be deleted.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.errorRed),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    for (final s in _scans) {
      await ScanRepository.instance.delete(s.id);
      try { await File(s.imagePath).delete(); } catch (_) {}
    }
    setState(() => _scans.clear());
  }

  void _showDetail(ScanResult scan) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        builder: (_, ctrl) => _DetailSheet(scan: scan, isDark: isDark, ctrl: ctrl),
      ),
    );
  }
}

// ── Cards & sheets ────────────────────────────────────────────────────────────

class _ScanCard extends StatelessWidget {
  final ScanResult scan;
  final bool isDark;
  final VoidCallback onDelete;
  final VoidCallback onTap;

  const _ScanCard({
    required this.scan,
    required this.isDark,
    required this.onDelete,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final imageFile = File(scan.imagePath);
    final imageExists = imageFile.existsSync();

    return GestureDetector(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Thumbnail
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: imageExists
                    ? Image.file(imageFile, width: 70, height: 70, fit: BoxFit.cover)
                    : Container(
                        width: 70,
                        height: 70,
                        color: isDark ? AppTheme.nightBorder : Colors.grey[200],
                        child: Icon(Icons.image_not_supported,
                            color: isDark ? AppTheme.nightTextMuted : Colors.grey),
                      ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (scan.cropName.isNotEmpty)
                      Text(scan.cropName,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen,
                          )),
                    Text(
                      _preview(scan.diagnosis),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppTheme.nightText : Colors.black87,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatDate(scan.scannedAt),
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppTheme.nightTextMuted : Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20),
                color: isDark ? AppTheme.nightTextMuted : Colors.grey[400],
                onPressed: onDelete,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _preview(String text) =>
      text.replaceAll('\n', ' ').replaceAll('**', '').trim();

  String _formatDate(DateTime dt) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}  ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }
}

class _DetailSheet extends StatelessWidget {
  final ScanResult scan;
  final bool isDark;
  final ScrollController ctrl;

  const _DetailSheet({required this.scan, required this.isDark, required this.ctrl});

  @override
  Widget build(BuildContext context) {
    final imageFile = File(scan.imagePath);
    final titleColor = isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppTheme.nightSurface : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: ListView(
        controller: ctrl,
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppTheme.nightBorder : Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (imageFile.existsSync())
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.file(imageFile, height: 200, fit: BoxFit.cover),
            ),
          const SizedBox(height: 16),
          if (scan.cropName.isNotEmpty)
            Text(scan.cropName,
                style: TextStyle(color: titleColor, fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 4),
          Text(_formatDate(scan.scannedAt),
              style: TextStyle(
                color: isDark ? AppTheme.nightTextMuted : Colors.grey[500],
                fontSize: 12,
              )),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          ..._buildLines(scan.diagnosis, isDark),
        ],
      ),
    );
  }

  List<Widget> _buildLines(String text, bool isDark) {
    final textColor = isDark ? AppTheme.nightText : Colors.black87;
    final headingColor = isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen;

    return text.split('\n').map((line) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) return const SizedBox(height: 6);
      final isHeading = RegExp(r'^\d+[\)\.:]').hasMatch(trimmed) || trimmed.startsWith('**');
      final cleaned = trimmed.replaceAll('**', '').trim();
      if (isHeading) {
        return Padding(
          padding: const EdgeInsets.only(top: 12, bottom: 2),
          child: Text(cleaned,
              style: TextStyle(color: headingColor, fontWeight: FontWeight.w700, fontSize: 15)),
        );
      }
      return Padding(
        padding: const EdgeInsets.only(bottom: 3),
        child: Text(cleaned, style: TextStyle(color: textColor, height: 1.5)),
      );
    }).toList();
  }

  String _formatDate(DateTime dt) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}  ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }
}

class _EmptyState extends StatelessWidget {
  final bool isDark;
  const _EmptyState({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history,
              size: 72,
              color: isDark ? AppTheme.nightBorder : Colors.grey[300]),
          const SizedBox(height: 16),
          Text('No scans yet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: isDark ? AppTheme.nightTextMuted : Colors.grey[500],
              )),
          const SizedBox(height: 8),
          Text('Your scan history will appear here',
              style: TextStyle(
                color: isDark ? AppTheme.nightTextMuted : Colors.grey[400],
              )),
        ],
      ),
    );
  }
}
