@echo off
REM ==================================================
REM Quick Rebuild Script - Use this after app.json changes
REM ==================================================
echo.
echo ========================================
echo  Rebuilding with New Icon Configuration
echo ========================================
echo.

echo Step 1: Deleting old android folder...
if exist "%~dp0android" (
    rmdir /s /q "%~dp0android"
    echo Android folder deleted successfully!
) else (
    echo Android folder doesn't exist, skipping...
)
echo.

echo Step 2: Running prebuild to generate new Android configuration...
echo This will take a moment...
echo.
call npx expo prebuild --platform android --clean

if errorlevel 1 (
    echo.
    echo [ERROR] Prebuild failed! Check the errors above.
    pause
    exit /b 1
)

echo.
echo Step 3: Building APK...
echo This may take 5-10 minutes...
echo.

REM Set Java Home and Android SDK
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set ANDROID_SDK_ROOT=%ANDROID_HOME%
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

REM Navigate to android directory
cd /d "%~dp0android"

REM Build APK
call gradlew.bat assembleRelease --no-daemon

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Check the errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILD SUCCESSFUL!
echo ========================================
echo.
echo Your APK is ready with the new icon!
echo.
echo APK Location:
echo %~dp0android\app\build\outputs\apk\release\app-release.apk
echo.
echo IMPORTANT:
echo 1. Uninstall the old app from your phone
echo 2. Install this new APK
echo 3. The logo should now display correctly!
echo.

REM Open the output folder
echo Opening APK folder...
start "" "%~dp0android\app\build\outputs\apk\release"

echo.
echo Press any key to exit...
pause >nul
