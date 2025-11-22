// Script to create Android adaptive icon from logo.png
// Install sharp first: npm install --save-dev sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'assets', 'logo.png');
const outputPath = path.join(__dirname, 'assets', 'adaptive-icon.png');
const backupPath = path.join(__dirname, 'assets', 'adaptive-icon-backup.png');

async function createAdaptiveIcon() {
  try {
    console.log('🎨 Creating Android adaptive icon from logo.png...');

    // Backup existing adaptive icon if it exists
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, backupPath);
      console.log('✅ Backup created at assets/adaptive-icon-backup.png');
    }

    // Android adaptive icons should be 1024x1024
    // The safe zone (always visible) is a 66% diameter circle in the center
    // We'll create a 1024x1024 canvas and center the logo with padding

    const iconSize = 1024;
    const logoSize = 700; // Leave padding for the circular mask
    const padding = (iconSize - logoSize) / 2;

    // Read the logo
    const logoBuffer = await sharp(logoPath)
      .resize(logoSize, logoSize, {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Create a transparent canvas
    const canvas = await sharp({
      create: {
        width: iconSize,
        height: iconSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{
      input: logoBuffer,
      top: Math.round(padding),
      left: Math.round(padding)
    }])
    .png()
    .toFile(outputPath);

    console.log('✅ Adaptive icon created successfully!');
    console.log('📊 Size: 1024x1024 pixels');
    console.log('📍 Location: assets/adaptive-icon.png');
    console.log('\n🔄 Next steps:');
    console.log('1. Rebuild your app: eas build -p android --profile preview');
    console.log('   OR for local build: npx expo run:android');
    console.log('2. The icon should now display correctly on Android!');

  } catch (error) {
    console.error('❌ Error creating adaptive icon:', error.message);
    console.log('\n💡 Make sure you have installed sharp:');
    console.log('   npm install --save-dev sharp');
    console.log('\n💡 Also ensure logo.png exists in the assets folder');
  }
}

createAdaptiveIcon();
