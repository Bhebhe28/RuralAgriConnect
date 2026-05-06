import 'dart:io';

/// AppConfig — single place to set your server URL.
///
/// MODE 1: Emulator (Android emulator / iOS simulator on same machine)
/// MODE 2: LAN — physical device on same WiFi as your dev machine
/// MODE 3: ngrok — any device, any network (run: ngrok http 3001)
/// MODE 4: Production — Railway deployed server

enum AppMode { emulator, lan, ngrok, production }

class AppConfig {
  // ── SET YOUR MODE HERE ────────────────────────────────────────────────────
  static const AppMode _mode = AppMode.production;
  // ─────────────────────────────────────────────────────────────────────────

  // Mode 2 — LAN (same WiFi, run `ipconfig` to find your PC IP)
  static const String lanIp = '192.168.1.100';
  static const int port = 3001;

  // Mode 3 — ngrok (run: ngrok http 3001, paste URL here)
  static const String ngrokUrl = 'https://abc123.ngrok-free.app';

  // Mode 4 — Production (Railway)
  static const String productionUrl =
      'https://ruragriconnect-api-production.up.railway.app';

  // ── Resolved base URL ─────────────────────────────────────────────────────
  static String get baseUrl {
    switch (_mode) {
      case AppMode.ngrok:
        return '$ngrokUrl/api';
      case AppMode.production:
        return '$productionUrl/api';
      case AppMode.lan:
        return 'http://$lanIp:$port/api';
      case AppMode.emulator:
        if (Platform.isAndroid) return 'http://10.0.2.2:$port/api';
        return 'http://localhost:$port/api';
    }
  }
}
