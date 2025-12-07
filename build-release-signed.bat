@echo off
echo Setting environment variables...
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=C:\Users\danie\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo.
echo Building SIGNED Release AAB for Google Play...
cd android

REM Copy keystore to android/app if it exists
if exist ..\upload-keystore.jks (
    copy ..\upload-keystore.jks app\upload-keystore.jks
    echo Keystore copied to android\app
) else (
    echo ERROR: upload-keystore.jks not found!
    echo Please run download-keystore.bat first
    pause
    exit /b 1
)

call gradlew.bat clean
call gradlew.bat bundleRelease

if %ERRORLEVEL% == 0 (
    echo.
    echo BUILD SUCCESSFUL!
    echo AAB location: android\app\build\outputs\bundle\release\app-release.aab
    echo.
    echo This AAB is signed with your original keystore and ready for Google Play
) else (
    echo.
    echo BUILD FAILED.
    echo Check that keystore.properties has the correct passwords
)

pause