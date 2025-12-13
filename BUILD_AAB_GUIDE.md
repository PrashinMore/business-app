# Android App Bundle (AAB) Build Guide

This guide will help you build an Android App Bundle (.aab) file for uploading to the Google Play Store.

## Prerequisites

1. **Java Development Kit (JDK)** - Should already be installed
2. **Android SDK** - Should already be installed
3. **Keystore file** - Your release keystore (`my-release-key.keystore`) should be in `android/app/`
4. **Gradle** - Comes with the Android project

## Quick Build (Recommended)

### Option 1: Using npm script (Easiest)

```bash
npm run android:bundle
```

This will:
- Navigate to the android directory
- Run the Gradle bundleRelease task
- Create the AAB file in `android/app/build/outputs/bundle/release/`

### Option 2: Using Gradle directly

```bash
cd android
gradlew bundleRelease
```

Or on Windows:
```bash
cd android
.\gradlew bundleRelease
```

## Step-by-Step Process

### 1. Navigate to Project Root

```bash
cd C:\Users\Prashin\Desktop\PROJECTS\business-app
```

### 2. Build the AAB Bundle

Run one of these commands:

**Option A - Using npm script:**
```bash
npm run android:bundle
```

**Option B - Using Gradle directly:**
```bash
cd android
.\gradlew bundleRelease
```

### 3. Wait for Build to Complete

- The build process takes **5-15 minutes** depending on your machine
- You'll see progress messages like:
  - `> Task :app:createBundleReleaseJsAndAssets`
  - `> Task :app:bundleRelease`
- **DO NOT cancel the process** - let it complete
- You'll see "BUILD SUCCESSFUL" when done

### 4. Locate Your AAB File

Once the build completes successfully, your AAB file will be at:

```
android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### Build Fails with CMake Errors

If you see CMake errors during clean, you can skip the clean step and build directly:

```bash
cd android
.\gradlew bundleRelease --no-daemon
```

### Build Takes Too Long

- This is normal for the first build
- Subsequent builds are faster due to caching
- Make sure you have enough disk space (at least 2GB free)

### "Gradle not found" Error

Make sure you're in the project root or android directory when running the command.

### Keystore Issues

If you get signing errors, verify:
- `android/app/my-release-key.keystore` exists
- Keystore password and key alias are correct in `android/app/build.gradle`

## Before Building

### 1. Update Version Number

Make sure to update the version in:
- `package.json` - version field
- `app.json` - version field
- `android/app/build.gradle` - versionCode and versionName

### 2. Verify Keystore Configuration

Check `android/app/build.gradle` has correct signing config:

```gradle
signingConfigs {
    debug {
        storeFile file('my-release-key.keystore')
        storePassword 'your-password'
        keyAlias 'my-key-alias'
        keyPassword 'your-password'
    }
}
```

### 3. Clean Build (Optional but Recommended)

For a completely fresh build:

```bash
npm run clean:all
cd android
.\gradlew clean
.\gradlew bundleRelease
```

## Uploading to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Production** (or **Testing** track)
4. Click **Create new release**
5. Upload the `app-release.aab` file from:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```
6. Fill in release notes
7. Review and publish

## File Locations

- **AAB File**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK File** (if needed): `android/app/build/outputs/apk/release/app-release.apk`
- **Keystore**: `android/app/my-release-key.keystore`
- **Build Config**: `android/app/build.gradle`

## Build Commands Reference

| Command | Description |
|---------|-------------|
| `npm run android:bundle` | Build AAB bundle (recommended) |
| `cd android && gradlew bundleRelease` | Build AAB directly with Gradle |
| `cd android && gradlew assembleRelease` | Build APK instead of AAB |
| `cd android && gradlew clean` | Clean build artifacts |
| `npm run clean:all` | Clean all caches (Metro, Expo, etc.) |

## Notes

- **AAB is required** for new apps and app updates on Google Play Store
- AAB files are smaller than APK files
- Google Play generates optimized APKs from your AAB for different device configurations
- Always test your AAB before uploading to production
- Keep your keystore file safe - you'll need it for all future updates

## Version Management

When releasing an update:

1. **Increment versionCode** in `android/app/build.gradle`:
   ```gradle
   versionCode 2  // Increment this number
   versionName "1.0.2"  // Update version string
   ```

2. **Update version in package.json**:
   ```json
   "version": "1.0.2"
   ```

3. **Update version in app.json**:
   ```json
   "version": "1.0.2"
   ```

## Quick Checklist

Before building:
- [ ] Version numbers updated
- [ ] Code changes committed
- [ ] Tests passed (if applicable)
- [ ] Keystore file exists and is correct

After building:
- [ ] Build completed successfully
- [ ] AAB file exists in `android/app/build/outputs/bundle/release/`
- [ ] File size is reasonable (usually 20-50MB)
- [ ] Ready to upload to Play Store

---

**Last Updated**: Based on current project configuration
**Project**: business-app-MVP
**Current Version**: 1.0.1

