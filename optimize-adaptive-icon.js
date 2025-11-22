// Optimize the adaptive icon file
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const adaptiveIconPath = path.join(__dirname, 'assets', 'adaptive-icon.png');

async function optimizeAdaptiveIcon() {
  try {
    console.log('🎨 Optimizing adaptive-icon.png...');

    const originalStats = fs.statSync(adaptiveIconPath);
    console.log(`📊 Original size: ${(originalStats.size / 1024).toFixed(2)} KB`);

    // Read and optimize
    await sharp(adaptiveIconPath)
      .png({
        quality: 90,
        compressionLevel: 9,
        palette: true
      })
      .toFile(adaptiveIconPath + '.tmp');

    // Get optimized size
    const optimizedStats = fs.statSync(adaptiveIconPath + '.tmp');
    console.log(`📊 Optimized size: ${(optimizedStats.size / 1024).toFixed(2)} KB`);
    console.log(`💾 Saved: ${((1 - optimizedStats.size / originalStats.size) * 100).toFixed(1)}%`);

    // Replace
    fs.unlinkSync(adaptiveIconPath);
    fs.renameSync(adaptiveIconPath + '.tmp', adaptiveIconPath);

    console.log('✅ Adaptive icon optimized successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

optimizeAdaptiveIcon();
