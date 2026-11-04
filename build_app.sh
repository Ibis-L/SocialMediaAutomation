#!/bin/bash
set -e

# Change directory to project root if called from elsewhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================="
echo " 1. Compiling Android APK (assembleDebug)"
echo "============================================="
cd app/Automation
./gradlew assembleDebug
cd "$SCRIPT_DIR"

APK_SOURCE="app/Automation/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK_SOURCE" ]; then
    echo "❌ Error: APK file was not created at $APK_SOURCE"
    exit 1
fi

echo ""
echo "============================================="
echo " 2. Updating Web Release Downloads"
echo "============================================="
cp "$APK_SOURCE" backend/dashboard/media/releases/app-debug.apk
cp "$APK_SOURCE" twitter-automation-app.apk
echo "✔ Copied to backend/dashboard/media/releases/app-debug.apk"
echo "✔ Copied to twitter-automation-app.apk"

echo ""
echo "============================================="
echo " 3. Syncing with Running Docker Container"
echo "============================================="
if docker ps --format '{{.Names}}' | grep -q "^news-portal-backend-1$"; then
    docker cp "$APK_SOURCE" news-portal-backend-1:/app/dashboard/media/releases/app-debug.apk
    echo "✔ Successfully synced APK into Docker container (news-portal-backend-1)"
else
    echo "ℹ Docker backend container is not currently running. Local files updated."
fi

echo ""
echo "============================================="
echo " 4. Direct Install to Phone via USB (ADB)"
echo "============================================="
if command -v adb >/dev/null 2>&1; then
    CONNECTED_DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | awk '{print $1}')
    if [ -n "$CONNECTED_DEVICES" ]; then
        echo "✔ Found connected device via USB. Installing APK directly..."
        for dev in $CONNECTED_DEVICES; do
            echo "   Installing to $dev..."
            adb -s "$dev" install -r "$APK_SOURCE"
        done
        echo "✔ Installed directly to your phone! Ready to use."
    else
        echo "ℹ No phone connected via USB. You can download the new APK via the website QR code."
    fi
fi

echo ""
echo "============================================="
echo "🎉 BUILD & DEPLOY COMPLETE!"
echo "============================================="

