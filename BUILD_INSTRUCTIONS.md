# Build Instructions for AttendanceM App

## Prerequisites
- **Android Studio** installed (for Java/JDK)
- **Node.js** installed
- Project dependencies installed: `npm install`

## Build Scripts

### 1. 🚀 Fast Build (Recommended for testing)
**File:** `build-apk-fast.bat`

Quick build without cleaning. Best for development and testing.

```bash
# Double-click the file or run:
build-apk-fast.bat
```

**Features:**
- Skips clean step (faster)
- Auto-generates android folder if missing
- Opens output folder when done
- Shows APK size

**Time:** ~3-8 minutes
**Use:** Quick rebuilds, testing changes

---

### 2. 🎯 Release Build (Production)
**File:** `build-apk-release.bat`

Full clean build for production/distribution.

```bash
build-apk-release.bat
```

**Features:**
- Runs clean before build (ensures fresh build)
- Optimized for production
- Shows build size and location

**Time:** ~5-12 minutes
**Use:** Final builds for distribution

---

### 3. 🧹 Clean Build (Fix Issues)
**File:** `build-apk-clean.bat`

Cleans all caches and build files. Use when you have build errors.

```bash
build-apk-clean.bat
```

**Cleans:**
- Gradle build cache
- Build directories
- Metro bundler cache
- Expo cache

**Time:** ~1-2 minutes
**Use:** When builds fail or after updating dependencies

---

## Build Process

### First Build
1. Make sure Android Studio is installed at:
   `C:\Program Files\Android\Android Studio`

2. Run fast build:
   ```bash
   build-apk-fast.bat
   ```

3. Wait for build to complete (~5-10 minutes first time)

4. APK will be at:
   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```

### Subsequent Builds
- **For testing:** Use `build-apk-fast.bat` (faster)
- **For release:** Use `build-apk-release.bat` (cleaner)
- **If errors:** Run `build-apk-clean.bat` first, then rebuild

---

## Output Location

After successful build:
```
android\app\build\outputs\apk\release\app-release.apk
```

The folder will automatically open when build completes!

---

## Installing APK

### On Your Phone:
1. Copy `app-release.apk` to your phone
2. Open it from File Manager
3. Allow "Install from unknown sources" if prompted
4. Install the app

### Via ADB (USB):
```bash
adb install android\app\build\outputs\apk\release\app-release.apk
```

---

## Troubleshooting

### ❌ "Java not found"
**Solution:** Install Android Studio or ensure it's at:
`C:\Program Files\Android\Android Studio`

### ❌ Build fails with dependency errors
**Solution:**
1. Run `build-apk-clean.bat`
2. Then run `build-apk-release.bat`

### ❌ "Android folder not found"
**Solution:** The build script will auto-generate it using `expo prebuild`

### ❌ Build is slow
**Solution:**
- First build is always slow (~10 min)
- Subsequent builds are faster (~3-5 min)
- Use `build-apk-fast.bat` for faster rebuilds

### ❌ APK doesn't install
**Solution:**
- Enable "Unknown sources" in phone settings
- Make sure you have enough space
- Try uninstalling old version first

---

## Build Types Comparison

| Build Type | Speed | Clean | Use Case |
|------------|-------|-------|----------|
| **Fast** | ⚡⚡⚡ | ❌ | Testing, development |
| **Release** | ⚡⚡ | ✅ | Production, distribution |
| **Clean** | ⚡ | ✅✅ | Fix errors, after updates |

---

## Distribution

### Direct Install:
- Copy APK to phone via USB
- Share via WhatsApp, Email, Drive
- Install directly

### For Play Store:
- Build with `build-apk-release.bat`
- Upload APK to Google Play Console
- Or convert to AAB for Play Store

---

## Tips

✅ **Use Fast Build** for daily development
✅ **Use Release Build** before sharing APK
✅ **Use Clean Build** when things break
✅ First build takes longest (~10 min)
✅ Keep Android Studio installed for Java
✅ APK size is typically 30-50MB

---

## File Structure After Build

```
android/
├── app/
│   └── build/
│       └── outputs/
│           └── apk/
│               └── release/
│                   └── app-release.apk  ← Your APK here!
├── gradle/
└── gradlew.bat
```

---

**Need help?** Check the error messages - they usually tell you what's wrong!
