#!/bin/bash
# Script to check latest Play Store version before releasing
# Usage: ./scripts/check-version.sh

echo "Checking latest version in Play Store..."

# Get service account JSON from GitHub secrets or local file
if [ -f "service-account.json" ]; then
    SERVICE_ACCOUNT="service-account.json"
else
    echo "Error: service-account.json not found"
    echo "Download from Google Cloud Console and place in project root"
    exit 1
fi

# Get package name
PACKAGE_NAME="com.blacksquirrel.healthtracker"

# Get current versionCode from build.gradle
CURRENT_VERSION=$(grep "versionCode" android/app/build.gradle | awk '{print $2}')
CURRENT_NAME=$(grep "versionName" android/app/build.gradle | awk '{print $2}' | tr -d '"')

echo ""
echo "Current build.gradle:"
echo "  versionCode: $CURRENT_VERSION"
echo "  versionName: $CURRENT_NAME"
echo ""

# Use Google Play Developer API to get latest version
# Requires: pip install google-auth google-auth-httplib2 google-api-python-client
python3 - <<END
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
SERVICE_ACCOUNT_FILE = '$SERVICE_ACCOUNT'
PACKAGE_NAME = '$PACKAGE_NAME'

try:
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    service = build('androidpublisher', 'v3', credentials=credentials)

    # Get internal track info
    track = service.edits().tracks().get(
        packageName=PACKAGE_NAME,
        editId=service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()['id'],
        track='internal'
    ).execute()

    if 'releases' in track and len(track['releases']) > 0:
        latest = track['releases'][0]
        version_codes = latest.get('versionCodes', [])
        if version_codes:
            print(f"Latest Play Store (Internal):")
            print(f"  versionCode: {max(version_codes)}")
            print(f"  status: {latest.get('status', 'unknown')}")
            print()

            if max(version_codes) >= int('$CURRENT_VERSION'):
                print("⚠️  WARNING: Current versionCode ($CURRENT_VERSION) is <= Play Store version ({max(version_codes)})")
                print("   You need to increment versionCode in android/app/build.gradle")
                sys.exit(1)
            else:
                print("✅ Version check passed! Safe to release.")
    else:
        print("No releases found in internal track")

except Exception as e:
    print(f"Error checking Play Store: {e}")
    print("Skipping version validation")
END

echo ""
echo "Next versionCode should be: $((CURRENT_VERSION + 1)) or higher"
