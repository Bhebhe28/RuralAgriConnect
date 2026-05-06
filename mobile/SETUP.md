# RurAgriConnect Mobile - Setup Guide

## Architecture Contract

```
Flutter (UI + app logic)
├── Firebase Authentication (identity only)
└── SQLite local database (all business data, offline-first)
```

- Firebase handles registration, login, password reset, and email verification.
- Firebase UID is stored locally and used as `user_id` in every SQLite table.
- SQLite remains the source of truth for local/offline app data.
- Sync remains optional and future-ready via local `is_synced` fields and `sync_queue`.

---

## Step 1 - Create Firebase Project

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication > Sign-in method > Email/Password**.
3. Add Android and iOS apps in Firebase:
   - Android package: `com.ruragriconnect.mobile`
   - iOS bundle ID: `com.ruragriconnect.mobile`

---

## Step 2 - Configure FlutterFire

```bash
cd mobile
flutter pub get
dart pub global activate flutterfire_cli
flutterfire configure
```

This generates correct platform config values. Replace placeholder values in:
- `lib/firebase_options.dart`

And ensure generated files are added:
- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`

---

## Step 3 - Platform Build Setup

### Android
- Ensure `android/build.gradle` includes Google Services classpath.
- Ensure `android/app/build.gradle` applies `com.google.gms.google-services`.
- Keep release signing config set before publishing.

### iOS (macOS only)
```bash
cd ios
pod install
cd ..
```

---

## Step 4 - Run

```bash
flutter run
```

Test flow:
1. Register with email/password.
2. Verify email from inbox.
3. Login and confirm home screen shows Firebase UID.
4. Add farm/crop data and relaunch app to confirm offline persistence.

---

## Build for Release

### Android APK
```bash
flutter build apk --release
```

### Android AAB (Play Store)
```bash
flutter build appbundle --release
```

### iOS IPA (App Store)
```bash
flutter build ipa --release
```

---

## Project Layers

- `lib/core/services/auth_service.dart` -> Firebase Authentication operations
- `lib/core/services/local_session_service.dart` -> local UID/session persistence
- `lib/core/services/database_service.dart` -> SQLite schema + UID-scoped data
- `lib/features/auth` -> register/login/forgot/verify UI + provider
- `lib/features/data` -> repositories/providers for offline business entities
