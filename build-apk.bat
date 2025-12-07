@echo off
echo Setting environment variables...
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\danie\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo.
echo Building APK...
cd android
call gradlew.bat assembleDebug

if %ERRORLEVEL% == 0 (
    echo.
    echo BUILD SUCCESSFUL!
    echo APK location: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo BUILD FAILED. You may need to install Android SDK.
    echo Please install Android Studio from https://developer.android.com/studio
)

pause