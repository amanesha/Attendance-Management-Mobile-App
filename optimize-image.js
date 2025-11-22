// Image optimization script for logo.png
// Install sharp first: npm install --save-dev sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'assets', 'logo.png');
const backupPath = path.join(__dirname, 'assets', 'logo-backup.png');
const optimizedPath = path.join(__dirname, 'assets', 'logo-optimized.png');

async function optimizeLogo() {
  try {
    console.log('📸 Optimizing logo.png...');

    // Create backup of original
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(logoPath, backupPath);
      console.log('✅ Backup created at assets/logo-backup.png');
    }

    // Get original size
    const originalStats = fs.statSync(logoPath);
    console.log(`📊 Original size: ${(originalStats.size / 1024).toFixed(2)} KB`);

    // Optimize the image
    await sharp(logoPath)
      .resize(512, 512, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png({
        quality: 85,
        compressionLevel: 9,
        palette: true
      })
      .toFile(optimizedPath);

    // Get optimized size
    const optimizedStats = fs.statSync(optimizedPath);
    console.log(`📊 Optimized size: ${(optimizedStats.size / 1024).toFixed(2)} KB`);
    console.log(`💾 Saved: ${((1 - optimizedStats.size / originalStats.size) * 100).toFixed(1)}%`);

    // Replace original with optimized
    fs.copyFileSync(optimizedPath, logoPath);
    fs.unlinkSync(optimizedPath);

    console.log('✅ Logo optimized successfully!');
    console.log('🔄 Please restart your app to see the changes');

  } catch (error) {
    console.error('❌ Error optimizing logo:', error.message);
    console.log('\n💡 Make sure you have installed sharp:');
    console.log('   npm install --save-dev sharp');
  }
}

optimizeLogo();
