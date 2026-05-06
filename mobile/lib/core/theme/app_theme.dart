import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ── Day palette ────────────────────────────────────────────────────────────
  static const Color primaryGreen   = Color(0xFF2E7D32);
  static const Color lightGreen     = Color(0xFF4CAF50);
  static const Color accentAmber    = Color(0xFFFFA000);
  static const Color errorRed       = Color(0xFFD32F2F);
  static const Color surfaceLight   = Color(0xFFF9FBF9);

  // ── Night palette ──────────────────────────────────────────────────────────
  static const Color nightBg        = Color(0xFF0F1A0F); // near-black green
  static const Color nightSurface   = Color(0xFF1A2E1A); // dark green surface
  static const Color nightCard      = Color(0xFF223322); // card bg
  static const Color nightPrimary   = Color(0xFF66BB6A); // lighter green for contrast
  static const Color nightAmber     = Color(0xFFFFB300);
  static const Color nightText      = Color(0xFFE8F5E9); // near-white green tint
  static const Color nightTextMuted = Color(0xFF81C784); // muted green
  static const Color nightBorder    = Color(0xFF2E4D2E);

  // ── Light theme ────────────────────────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryGreen,
        brightness: Brightness.light,
        primary: primaryGreen,
        secondary: accentAmber,
        error: errorRed,
        surface: surfaceLight,
      ),
      scaffoldBackgroundColor: surfaceLight,
      textTheme: GoogleFonts.nunitoTextTheme(),
      appBarTheme: AppBarTheme(
        backgroundColor: primaryGreen,
        foregroundColor: Colors.white,
        elevation: 0,
        titleTextStyle: GoogleFonts.nunito(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryGreen,
          minimumSize: const Size(double.infinity, 52),
          side: const BorderSide(color: primaryGreen, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryGreen, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: errorRed),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: Colors.white,
      ),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dividerColor: const Color(0xFFE0E0E0),
    );
  }

  // ── Night / dark agricultural theme ───────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme(
        brightness: Brightness.dark,
        primary: nightPrimary,
        onPrimary: nightBg,
        primaryContainer: Color(0xFF1B3D1B),
        onPrimaryContainer: nightText,
        secondary: nightAmber,
        onSecondary: nightBg,
        secondaryContainer: Color(0xFF3D2E00),
        onSecondaryContainer: Color(0xFFFFE08A),
        error: errorRed,
        onError: Colors.white,
        surface: nightSurface,
        onSurface: nightText,
        onSurfaceVariant: nightTextMuted,
        outline: nightBorder,
        outlineVariant: Color(0xFF1E3A1E),
      ),
      scaffoldBackgroundColor: nightBg,
      textTheme: GoogleFonts.nunitoTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: nightText,
        displayColor: nightText,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: nightSurface,
        foregroundColor: nightText,
        elevation: 0,
        titleTextStyle: GoogleFonts.nunito(
          color: nightText,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
        iconTheme: const IconThemeData(color: nightText),
        actionsIconTheme: const IconThemeData(color: nightText),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: nightPrimary,
          foregroundColor: nightBg,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: nightPrimary,
          minimumSize: const Size(double.infinity, 52),
          side: const BorderSide(color: nightPrimary, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: nightCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: nightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: nightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: nightPrimary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: errorRed),
        ),
        labelStyle: const TextStyle(color: nightTextMuted),
        hintStyle: TextStyle(color: nightTextMuted.withOpacity(0.7)),
        prefixIconColor: nightTextMuted,
        suffixIconColor: nightTextMuted,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: nightBorder),
        ),
        color: nightCard,
      ),
      iconTheme: const IconThemeData(color: nightText),
      dividerColor: nightBorder,
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: nightCard,
        contentTextStyle: const TextStyle(color: nightText),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: nightBorder),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: nightTextMuted,
        textColor: nightText,
      ),
      dialogTheme: DialogTheme(
        backgroundColor: nightSurface,
        titleTextStyle: GoogleFonts.nunito(
          color: nightText,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
        contentTextStyle: const TextStyle(color: nightText),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: nightSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: nightCard,
        labelStyle: const TextStyle(color: nightText),
        side: const BorderSide(color: nightBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: nightPrimary,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected) ? nightPrimary : Colors.grey),
        trackColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected) ? nightPrimary.withOpacity(0.4) : Colors.grey.withOpacity(0.3)),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: nightPrimary),
      ),
    );
  }
}
