const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const destDir = path.join(__dirname, '..', 'dist');

try {
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log('[copy-to-root] Successfully mirrored dist to parent root dist directory.');
  }
} catch (err) {
  console.error('[copy-to-root] Error copying to root dist:', err);
}
