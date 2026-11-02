@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot"
set "Path=%JAVA_HOME%\bin;%Path%"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

echo Compiling Twitter Automation App...
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Copying updated APK to workspace...
    copy /Y "app\build\outputs\apk\debug\app-debug.apk" "..\..\twitter-automation-app.apk"
    copy /Y "app\build\outputs\apk\debug\app-debug.apk" "..\..\..\twitter-automation-app.apk"
    echo [DONE] Updated twitter-automation-app.apk successfully!
) else (
    echo.
    echo [ERROR] Build failed with exit code %ERRORLEVEL%
)
