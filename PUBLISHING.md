# HealthTracker Mobile App - Private Play Store Publishing Guide

## Overview
This guide will help you publish the HealthTracker mobile app as a **private/internal app** on Google Play Store for limited distribution.

## Prerequisites

### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Create EAS Project
```bash
eas init
```
This will update the `projectId` in `app.json` automatically.

### 4. Google Play Console Setup
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app with these settings:
   - **App name**: HealthTracker
   - **Default language**: English (US)
   - **App or game**: App
   - **Free or paid**: Free
   - **Content rating**: Everyone
   - **Target audience**: Adults (18+)

## Building the App

### Development Build (Testing)
```bash
# For testing on physical device
eas build --platform android --profile development
```

### Preview Build (APK for Testing)
```bash
# Creates APK for internal testing
eas build --platform android --profile preview
```

### Production Build (Play Store)
```bash
# Creates AAB for Play Store submission
eas build --platform android --profile production
```

## Setting Up Private Distribution

### 1. Google Play Console Configuration

#### App Content
- **Privacy Policy**: Required (create a simple privacy policy page)
- **Target Audience**: Adults
- **Content Rating**: Complete questionnaire (will likely be "Everyone")

#### Store Listing
- **App name**: HealthTracker
- **Short description**: "Personal health and nutrition tracking app"
- **Full description**:
```
HealthTracker is a comprehensive personal health management app designed to help you monitor and improve your wellness journey.

Key Features:
• Dashboard with health metrics overview
• Meal planning and nutrition tracking
• Health target setting and progress monitoring
• Dark/light theme support
• Secure data storage

Perfect for individuals who want to take control of their health data and maintain consistent tracking of their wellness goals.
```

#### Internal Testing Setup
1. Go to **Testing > Internal testing**
2. Click **Create new release**
3. Upload your AAB file from EAS build
4. Add **testers** by email addresses
5. Set release to **Internal testing track**

### 2. App Configuration for Privacy

The app is already configured with:
- `"privacy": "unlisted"` in app.json
- Internal testing track in eas.json
- Appropriate permissions for camera (future barcode scanning)

## Publishing Process

### Step 1: Build Production AAB
```bash
eas build --platform android --profile production
```

### Step 2: Download AAB
Once build completes, download the `.aab` file from Expo dashboard.

### Step 3: Upload to Play Console
1. Go to Google Play Console
2. Navigate to **Testing > Internal testing**
3. Create new release
4. Upload the `.aab` file
5. Complete the release notes
6. Review and rollout to Internal testing

### Step 4: Add Testers
1. In **Internal testing** section
2. Go to **Testers** tab
3. Add email addresses of people who should access the app
4. They'll receive an email invitation

### Step 5: Share Testing Link
After publishing to internal testing:
1. Copy the **internal testing link**
2. Share with testers
3. Testers install via Play Store using the special link

## Security & Privacy Considerations

### Data Protection
- App stores health data locally
- No sensitive data transmitted without encryption
- Users control their own data

### Permissions
- **Camera**: For barcode scanning functionality
- **Storage**: For local data persistence

### Private Distribution Benefits
- Limited to invited testers only
- No public app store listing
- Full control over who can access
- Can update and manage privately

## Future Updates

### Updating the App
1. Increment version in `app.json`:
   ```json
   "version": "1.0.1",
   "android": {
     "versionCode": 2
   }
   ```

2. Build new version:
   ```bash
   eas build --platform android --profile production
   ```

3. Upload to new release in Play Console

### Moving to Open Testing (Optional)
If you later want broader testing:
1. Move from **Internal testing** to **Open testing**
2. Add more comprehensive store listing
3. Complete additional Google Play requirements

## Troubleshooting

### Common Issues
1. **Build failures**: Check app.json configuration
2. **Upload errors**: Ensure version codes are incremented
3. **Tester access**: Verify email addresses are correct

### Support
- Expo Documentation: https://docs.expo.dev/
- Google Play Console Help: https://support.google.com/googleplay/android-developer/

## Commands Summary

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Initialize project
eas init

# Build for production
eas build --platform android --profile production

# Build preview APK
eas build --platform android --profile preview

# Check build status
eas build:list
```

This setup ensures your HealthTracker app remains private while providing a professional distribution method for your intended users.