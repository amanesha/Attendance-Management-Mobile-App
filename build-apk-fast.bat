@echo off
REM ==================================================
REM AttendanceM App - Fast Release APK Builder
REM (Skips clean, faster for quick rebuilds)
REM ==================================================
echo.
echo ========================================
echo  AttendanceM Fast Release APK Builder
echo ========================================
echo.

REM Set Java Home and Android SDK (Using Android Studio's JBR and SDK)
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set ANDROID_SDK_ROOT=%ANDROID_HOME%
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

REM Check if Java is available
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java not found! Please install Android Studio or Java JDK 17.
    pause
    exit /b 1
)

echo [1/4] Java detected successfully!
echo.

REM Check if android folder exists, if not run prebuild
if not exist "%~dp0android" (
    echo [2/4] Android folder not found. Running prebuild...
    call npx expo prebuild --platform android
    echo.
) else (
    echo [2/4] Android folder found, skipping prebuild...
    echo.
)

REM Navigate to android directory
cd /d "%~dp0android"

echo [3/4] Building Release APK (Fast Mode)...
echo This may take a few minutes. Please wait...
echo.

REM Run Gradle build without clean (faster)
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
echo APK Location:
echo %~dp0android\app\build\outputs\apk\release\app-release.apk
echo.
echo APK Size:
for %%A in ("%~dp0android\app\build\outputs\apk\release\app-release.apk") do echo %%~zA bytes
echo.

REM [4/4] Open the output folder
echo [4/4] Opening APK folder...
start "" "%~dp0android\app\build\outputs\apk\release"

echo.
echo Press any key to exit...
pause >nul
