# HuginnAndroid

React Native Android app for Huginn Health Tracker.

## Features

- Health metrics tracking (weight, blood pressure, mood, sleep, etc.)
- Meal and nutrition logging
- Barcode scanning for food items
- AI-powered meal generation
- Device sync with backend API
- Dark theme with modern UI

## Tech Stack

- React Native 0.76.6
- React Navigation
- React Native Vector Icons
- Victory Native for charts
- React Native Vision Camera (barcode scanning)

## Security

- Automated dependency scanning via Dependabot
- Weekly security updates
- Zero known vulnerabilities

## Development

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Build APK
gradlew.bat assembleDebug
```

## Backend API

Connects to Huginn Health Tracker backend:
- Production: `https://healthtracker-440609.nw.r.appspot.com`
- Local Dev: `http://10.0.2.2:3000` (Android emulator)

## Related Repositories

- **Backend & Web**: [healthtracker](https://github.com/danstaunton89/healthtracker)
- **Admin Portal**: [HuginnAdmin](https://github.com/danstaunton89/HuginnAdmin)
