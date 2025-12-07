# Deployment Guide - HuginnAndroid

This guide explains how to deploy the HuginnAndroid app to Google Play Store using automated CI/CD.

## Overview

The GitHub Actions workflow automatically:
- Builds the signed Android App Bundle (.aab)
- Runs on every push to `main` branch
- Uploads to Google Play Store when you create a version tag (e.g., `v1.0.0`)

## Prerequisites

1. **Android Signing Keystore** - Required to sign the release build
2. **Google Play Console Access** - Service account with upload permissions
3. **GitHub Repository Secrets** - Store sensitive credentials securely

## Setup Instructions

### 1. Prepare Your Keystore

If you already have a keystore (`.jks` file), convert it to base64:

```bash
# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\your-keystore.jks")) | Set-Clipboard

# On Mac/Linux
base64 -i path/to/your-keystore.jks | pbcopy
```

If you don't have a keystore, generate one:

```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias your-key-alias
```

### 2. Create Google Play Service Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup → API access**
3. Click **Create new service account**
4. Follow the link to Google Cloud Console
5. Create a service account with these permissions:
   - Service Account User
6. Generate JSON key and download it
7. Back in Play Console, grant access with these permissions:
   - **Releases** → Create and edit releases

### 3. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `KEYSTORE_BASE64` | Base64-encoded keystore file | See step 1 above |
| `KEYSTORE_PASSWORD` | Password for the keystore | Your keystore password |
| `KEY_ALIAS` | Key alias used in keystore | Your key alias (e.g., `upload-key`) |
| `KEY_PASSWORD` | Password for the key | Your key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play service account JSON | Paste entire JSON file content |

### 4. Verify Package Name

Ensure `android/app/build.gradle` has the correct package name:

```gradle
android {
    defaultConfig {
        applicationId "com.blacksquirrel.healthtracker"
    }
}
```

## Deployment Process

### Automatic Deployment (Recommended)

1. **Make your changes** and commit to `main` branch
2. **Create a version tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. **GitHub Actions will automatically**:
   - Build the signed .aab
   - Upload to Google Play Store (Internal Testing track)
   - Make artifact available for download

### Manual Deployment

If you need to deploy manually:

```bash
# Build the bundle
cd android
./gradlew bundleRelease

# Find the .aab file at:
# android/app/build/outputs/bundle/release/app-release.aab

# Upload manually to Play Console
```

## Testing the Workflow

### Test Build Without Deploying

Push to `main` branch without creating a tag:

```bash
git add .
git commit -m "Test build"
git push origin main
```

This will:
- ✅ Build the .aab
- ✅ Upload as GitHub artifact (available for 30 days)
- ❌ NOT upload to Play Store

### Download Build Artifacts

1. Go to GitHub Actions tab
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download `app-release-bundle`

## Versioning

Update version in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 1        // Increment for each Play Store release
        versionName "1.0.0"  // Semantic version
    }
}
```

**Important:** Google Play requires `versionCode` to increment with each upload.

## Release Tracks

The workflow uploads to **Internal Testing** track by default. To change:

Edit `.github/workflows/android-release.yml`:

```yaml
track: internal    # Options: internal, alpha, beta, production
```

## Troubleshooting

### Build Fails: "Keystore not found"

- Verify `KEYSTORE_BASE64` secret is set correctly
- Ensure base64 encoding has no line breaks

### Play Store Upload Fails

- Check service account has correct permissions
- Verify package name matches Play Console app
- Ensure `versionCode` is higher than previous release

### Gradle Build Errors

- Ensure Java 17 is used (workflow handles this)
- Check `android/build.gradle` for dependency issues
- Try local build first: `cd android && ./gradlew bundleRelease`

## Security Best Practices

✅ **DO**:
- Use GitHub secrets for all sensitive data
- Rotate keystore passwords periodically
- Limit service account permissions
- Use Internal/Alpha track before Production

❌ **DON'T**:
- Commit keystores to repository
- Share service account JSON publicly
- Hard-code passwords in files

## Next Steps

After successful deployment to Internal Testing:

1. **Test the build** with internal testers
2. **Promote to Alpha/Beta** for wider testing
3. **Collect feedback** and fix issues
4. **Promote to Production** when ready

## Useful Commands

```bash
# Check gradle version
cd android && ./gradlew --version

# List all gradle tasks
./gradlew tasks

# Clean build
./gradlew clean

# Build debug APK (for testing)
./gradlew assembleDebug

# Build release AAB
./gradlew bundleRelease
```

## Resources

- [Google Play Console](https://play.google.com/console)
- [Android Signing Guide](https://developer.android.com/studio/publish/app-signing)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Play Store Publishing Overview](https://support.google.com/googleplay/android-developer/answer/9859152)

---

**Last Updated:** December 7, 2025
