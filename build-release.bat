@echo off
echo Setting environment variables...
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\danie\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo.
echo Building Release AAB for Google Play...
cd android
call gradlew.bat bundleRelease

if %ERRORLEVEL% == 0 (
    echo.
    echo BUILD SUCCESSFUL!
    echo AAB location: android\app\build\outputs\bundle\release\app-release.aab
    echo.
    echo Upload this file to Google Play Console
) else (
    echo.
    echo BUILD FAILED.
)

pause