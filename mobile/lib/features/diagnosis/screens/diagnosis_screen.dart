import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../../core/config/app_config.dart';
import '../../../core/services/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../models/scan_result.dart';
import '../repositories/scan_repository.dart';
import 'scan_history_screen.dart';

class DiagnosisScreen extends StatefulWidget {
  const DiagnosisScreen({super.key});

  @override
  State<DiagnosisScreen> createState() => _DiagnosisScreenState();
}

class _DiagnosisScreenState extends State<DiagnosisScreen> {
  final _picker = ImagePicker();

  File? _image;
  bool _scanning = false;
  String? _result;
  String? _error;

  // ── Pick image ─────────────────────────────────────────────────────────────
  Future<void> _pick(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 75,   // compress on device — reduces upload size ~60%
        maxWidth: 1024,
      );
      if (picked == null) return;
      setState(() {
        _image = File(picked.path);
        _result = null;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Could not access camera/gallery. Check permissions.');
    }
  }

  // ── Run scan ───────────────────────────────────────────────────────────────
  Future<void> _scan() async {
    if (_image == null) return;
    setState(() { _scanning = true; _error = null; _result = null; });

    try {
      final token = await ApiClient.instance.getToken();
      final dio = Dio(BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 60),
        headers: {'Authorization': 'Bearer $token'},
      ));

      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(
          _image!.path,
          filename: 'scan.jpg',
        ),
        'prompt':
            'Analyze this farm crop image from KwaZulu-Natal, South Africa. '
            'Identify: 1) Disease/pest/deficiency name, 2) Confidence %, '
            '3) Visible symptoms, 4) Treatment using SA products, 5) Prevention tips. '
            'Be concise and practical for a rural farmer.',
      });

      final response = await dio.post('/chat/scan', data: formData);
      final reply = (response.data['reply'] as String? ?? '').trim();

      if (reply.isEmpty) throw Exception('Empty response from server');

      // Save image to app documents so it persists
      final savedPath = await _saveImageLocally(_image!);

      // Persist to SQLite
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      if (auth.uid != null) {
        final scan = ScanResult.create(
          userId: auth.uid!,
          imagePath: savedPath,
          diagnosis: reply,
          cropName: _extractCropName(reply),
        );
        await ScanRepository.instance.insert(scan);
      }

      setState(() { _result = reply; _scanning = false; });
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? e.message ?? 'Network error';
      setState(() { _error = msg; _scanning = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _scanning = false; });
    }
  }

  Future<String> _saveImageLocally(File source) async {
    final dir = await getApplicationDocumentsDirectory();
    final scansDir = Directory('${dir.path}/scans');
    if (!await scansDir.exists()) await scansDir.create(recursive: true);
    final dest = File('${scansDir.path}/${DateTime.now().millisecondsSinceEpoch}.jpg');
    await source.copy(dest.path);
    return dest.path;
  }

  String _extractCropName(String diagnosis) {
    final lower = diagnosis.toLowerCase();
    const crops = ['maize', 'tomato', 'potato', 'cabbage', 'wheat', 'sorghum',
                   'sunflower', 'groundnut', 'soybean', 'cotton', 'spinach', 'onion'];
    for (final c in crops) {
      if (lower.contains(c)) return c[0].toUpperCase() + c.substring(1);
    }
    return '';
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Crop Diagnosis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Scan history',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ScanHistoryScreen()),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Header ──────────────────────────────────────────────────────
            _InfoBanner(isDark: isDark),
            const SizedBox(height: 16),

            // ── Image area ───────────────────────────────────────────────────
            _ImagePreview(
              image: _image,
              scanning: _scanning,
              onTapCamera: () => _pick(ImageSource.camera),
              onTapGallery: () => _pick(ImageSource.gallery),
            ),
            const SizedBox(height: 16),

            // ── Pick buttons ─────────────────────────────────────────────────
            if (_image == null) ...[
              Row(
                children: [
                  Expanded(
                    child: _PickButton(
                      icon: Icons.camera_alt,
                      label: 'Take Photo',
                      onTap: () => _pick(ImageSource.camera),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _PickButton(
                      icon: Icons.photo_library,
                      label: 'Gallery',
                      onTap: () => _pick(ImageSource.gallery),
                    ),
                  ),
                ],
              ),
            ],

            // ── Analyze button ───────────────────────────────────────────────
            if (_image != null && !_scanning && _result == null) ...[
              const SizedBox(height: 4),
              ElevatedButton.icon(
                onPressed: _scan,
                icon: const Icon(Icons.biotech),
                label: const Text('Analyze Plant'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _pick(ImageSource.camera),
                icon: const Icon(Icons.refresh),
                label: const Text('Retake Photo'),
              ),
            ],

            // ── Scanning indicator ───────────────────────────────────────────
            if (_scanning) ...[
              const SizedBox(height: 24),
              _ScanningIndicator(scheme: scheme),
            ],

            // ── Error ────────────────────────────────────────────────────────
            if (_error != null) ...[
              const SizedBox(height: 16),
              _ErrorCard(error: _error!),
            ],

            // ── Result ───────────────────────────────────────────────────────
            if (_result != null) ...[
              const SizedBox(height: 16),
              _ResultCard(result: _result!, isDark: isDark),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  setState(() { _image = null; _result = null; });
                },
                icon: const Icon(Icons.add_a_photo),
                label: const Text('Scan Another Plant'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _InfoBanner extends StatelessWidget {
  final bool isDark;
  const _InfoBanner({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final bg = isDark
        ? AppTheme.nightCard
        : AppTheme.primaryGreen.withOpacity(0.08);
    final fg = isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: fg.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.tips_and_updates_outlined, color: fg, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Take a clear photo of the affected leaf, stem, or fruit for the most accurate diagnosis.',
              style: TextStyle(color: fg, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _ImagePreview extends StatelessWidget {
  final File? image;
  final bool scanning;
  final VoidCallback onTapCamera;
  final VoidCallback onTapGallery;

  const _ImagePreview({
    required this.image,
    required this.scanning,
    required this.onTapCamera,
    required this.onTapGallery,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final emptyBg = isDark ? AppTheme.nightCard : const Color(0xFFF0F4F0);

    if (image == null) {
      return GestureDetector(
        onTap: onTapCamera,
        child: Container(
          height: 220,
          decoration: BoxDecoration(
            color: emptyBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppTheme.nightBorder : const Color(0xFFCCDDCC),
              style: BorderStyle.solid,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_a_photo_outlined,
                  size: 52,
                  color: isDark ? AppTheme.nightTextMuted : AppTheme.primaryGreen.withOpacity(0.5)),
              const SizedBox(height: 12),
              Text('Tap to take a photo',
                  style: TextStyle(
                    color: isDark ? AppTheme.nightTextMuted : Colors.grey[500],
                    fontSize: 15,
                  )),
            ],
          ),
        ),
      );
    }

    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Image.file(image!,
              width: double.infinity, height: 280, fit: BoxFit.cover),
        ),
        if (scanning)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            ),
          ),
      ],
    );
  }
}

class _PickButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PickButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fg = isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen;
    final bg = isDark ? AppTheme.nightCard : AppTheme.primaryGreen.withOpacity(0.07);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: fg.withOpacity(0.4)),
        ),
        child: Column(
          children: [
            Icon(icon, color: fg, size: 32),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _ScanningIndicator extends StatelessWidget {
  final ColorScheme scheme;
  const _ScanningIndicator({required this.scheme});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CircularProgressIndicator(color: scheme.primary),
        const SizedBox(height: 16),
        Text('Analysing your crop…',
            style: TextStyle(color: scheme.onSurface, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text('This usually takes 5–10 seconds',
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13)),
      ],
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String error;
  const _ErrorCard({required this.error});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.errorRed.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.errorRed.withOpacity(0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: AppTheme.errorRed, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(error,
                style: const TextStyle(color: AppTheme.errorRed, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final String result;
  final bool isDark;

  const _ResultCard({required this.result, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final bg = isDark ? AppTheme.nightCard : Colors.white;
    final border = isDark ? AppTheme.nightBorder : const Color(0xFFD0E8D0);
    final titleColor = isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.eco, color: titleColor, size: 20),
              const SizedBox(width: 8),
              Text('Diagnosis Result',
                  style: TextStyle(
                    color: titleColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  )),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: titleColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Saved',
                    style: TextStyle(color: titleColor, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          _FormattedResult(text: result, isDark: isDark),
        ],
      ),
    );
  }
}

class _FormattedResult extends StatelessWidget {
  final String text;
  final bool isDark;

  const _FormattedResult({required this.text, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final lines = text.split('\n');
    final textColor = isDark ? AppTheme.nightText : Colors.black87;
    final mutedColor = isDark ? AppTheme.nightTextMuted : Colors.black54;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) return const SizedBox(height: 6);

        // Numbered headings like "1) Disease name"
        final isHeading = RegExp(r'^\d+[\)\.:]').hasMatch(trimmed) ||
            trimmed.startsWith('**') ||
            trimmed.startsWith('##');

        final cleaned = trimmed
            .replaceAll('**', '')
            .replaceAll('##', '')
            .trim();

        if (isHeading) {
          return Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 2),
            child: Text(cleaned,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppTheme.nightPrimary : AppTheme.primaryGreen,
                  fontSize: 14,
                )),
          );
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text(cleaned,
              style: TextStyle(color: line.startsWith(' ') ? mutedColor : textColor, height: 1.5)),
        );
      }).toList(),
    );
  }
}
