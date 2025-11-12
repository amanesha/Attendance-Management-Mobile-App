@echo off
REM ==================================================
REM AttendanceM App - Clean Build Script
REM Use this when you have build issues
REM ==================================================
echo.
echo ========================================
echo  AttendanceM Clean Build
echo ========================================
echo.
echo This will clean all build files and caches.
echo Use this when you have build issues.
echo.

set /p confirm="Continue? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

REM Set Java Home
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

REM Check if android folder exists
if not exist "%~dp0android" (
    echo Android folder not found. Nothing to clean.
    echo Run build-apk-fast.bat or build-apk-release.bat first.
    pause
    exit /b 0
)

REM Navigate to android directory
cd /d "%~dp0android"

echo.
echo [1/3] Cleaning Gradle build...
call gradlew.bat clean

echo.
echo [2/3] Cleaning build directories...
rmdir /s /q app\build 2>nul
rmdir /s /q build 2>nul
rmdir /s /q .gradle 2>nul

echo.
echo [3/3] Cleaning Metro bundler cache...
cd /d "%~dp0"
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q .expo 2>nul

echo.
echo ========================================
echo  CLEAN COMPLETE!
echo ========================================
echo.
echo Now you can run build-apk-release.bat
echo.
pause
