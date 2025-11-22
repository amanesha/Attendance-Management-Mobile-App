# How to Rebuild APK with New Logo and Icon Changes

## Why Logo Isn't Showing

The logo isn't showing on your phone because:

1. ✅ **We optimized the logo files** (logo.png and adaptive-icon.png)
2. ✅ **We updated app.json** to use the new adaptive icon
3. ❌ **But your APK was built BEFORE these changes**

The fast build script (`build-apk-fast.bat`) skips the prebuild step, which means it doesn't pick up changes to:
- app.json configuration
- Asset files (logo.png, adaptive-icon.png)
- Native Android settings

## ⚡ Quick Solution (Recommended)

Since you made changes to app.json and icons, you need to **rebuild with prebuild**:

### Option 1: Delete android folder and rebuild

```bash
# 1. Delete the android folder
rmdir /s /q android

# 2. Build with the fast script (it will run prebuild automatically)
build-apk-fast.bat
```

### Option 2: Force prebuild before building

```bash
# 1. Run prebuild to regenerate android folder with new settings
npx expo prebuild --platform android --clean

# 2. Build the APK
build-apk-fast.bat
```

### Option 3: Use the release build script

The release build script might already include prebuild. Let me check and update it.

```bash
build-apk-release.bat
```

## 🧹 When to Use Each Build Script

### `build-apk-fast.bat` - Fast rebuilds
**Use when:**
- Only JavaScript/React code changed
- No changes to app.json
- No changes to assets
- No changes to native Android code

**Rebuilds:** Code only (skips prebuild)
**Speed:** ⚡ Fast (2-5 minutes)

### `build-apk-clean.bat` - Clean build cache
**Use when:**
- Build errors occur
- Strange bugs after changes
- Before using release build

**Does:** Cleans all build caches
**Speed:** 🧹 Quick (30 seconds)
**Note:** Run this THEN run build-apk-fast.bat or build-apk-release.bat

### `build-apk-release.bat` - Full rebuild
**Use when:**
- app.json changed
- Assets (icons, images) changed
- Native code changed
- First build after cloning

**Rebuilds:** Everything including native code
**Speed:** 🐌 Slower (5-10 minutes)

## 📋 Step-by-Step: Fix Your Logo Issue

### Step 1: Clean Everything (Recommended)
```bash
# Run the clean script
build-apk-clean.bat
```

### Step 2: Delete android folder
```bash
# Delete the old android folder (this forces a complete rebuild)
rmdir /s /q android
```

### Step 3: Rebuild with new configuration
```bash
# This will automatically run prebuild since android folder is missing
build-apk-fast.bat
```

### Step 4: Install on your phone
1. Uninstall the old APK from your phone
2. Install the new APK from `android\app\build\outputs\apk\release\app-release.apk`
3. The logo should now display correctly!

## 🎯 What Changed in Your App

### Files That Were Updated:
1. **app.json**
   - Removed default splash screen config
   - Updated Android adaptive icon to use `adaptive-icon.png`

2. **assets/logo.png**
   - Optimized from 165KB → 45KB (73% smaller)
   - Will load faster in Login and Splash screens

3. **assets/adaptive-icon.png**
   - Created new file (162KB)
   - Properly formatted for Android with safe zone
   - Will show correctly in circular icons

4. **SplashScreen.js**
   - Now shows before Login
   - Checks authentication
   - 3-second delay with animations

### Native Android Files Affected:
- `android/app/src/main/res/` (icon files)
- `android/app/build.gradle` (app configuration)
- `android/app/src/main/AndroidManifest.xml` (manifest)

These native files are ONLY updated when you run `npx expo prebuild`, which happens automatically if the android folder doesn't exist.

## 🔧 Troubleshooting

### "Logo still not showing after rebuild"

**Solution 1:** Make sure you uninstalled the old app first
```bash
# On your phone, go to Settings > Apps > AttendanceM > Uninstall
# Then install the new APK
```

**Solution 2:** Check if the logo file exists
```bash
# Verify logo files are present
dir assets\logo.png
dir assets\adaptive-icon.png
```

**Solution 3:** Complete clean rebuild
```bash
# 1. Clean
build-apk-clean.bat

# 2. Delete android folder
rmdir /s /q android

# 3. Delete node_modules cache
rmdir /s /q node_modules\.cache

# 4. Rebuild
npx expo prebuild --platform android --clean
build-apk-fast.bat
```

### "Build fails with 'icon not found' error"

The icon paths in app.json must be correct:
```json
"icon": "./assets/logo.png",
"adaptiveIcon": {
  "foregroundImage": "./assets/adaptive-icon.png",
  "backgroundColor": "#1e3a8a"
}
```

Verify files exist:
```bash
ls -la assets/logo.png
ls -la assets/adaptive-icon.png
```

### "Splash screen not showing"

The splash screen is now a custom React component, not from app.json. It should show automatically when the app starts.

If it's not showing:
1. Check that AppNavigator.js has `Splash` as initialRouteName
2. Make sure you rebuilt after the changes
3. Uninstall and reinstall the app

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Clean build cache | `build-apk-clean.bat` |
| Fast rebuild (code only) | `build-apk-fast.bat` |
| Full rebuild (with prebuild) | Delete `android` folder, then `build-apk-fast.bat` |
| Force prebuild | `npx expo prebuild --platform android --clean` |
| Build after prebuild | `cd android && gradlew.bat assembleRelease` |

## ✅ After Building Successfully

Your app will now have:
- ✨ Optimized logo (45KB) showing in Login and Splash screens
- 📱 Proper Android adaptive icon (162KB) on home screen
- 🎨 Custom splash screen with 3-second animation
- 🔐 Authentication check on app start

## 🎯 Recommended Build Process Going Forward

**For code changes only:**
```bash
build-apk-fast.bat
```

**For any of these changes:**
- app.json modified
- New icons/images added
- Package.json dependencies changed

**Do this:**
```bash
# 1. Delete android folder
rmdir /s /q android

# 2. Rebuild (prebuild runs automatically)
build-apk-fast.bat
```

This ensures your APK always has the latest configuration and assets!
