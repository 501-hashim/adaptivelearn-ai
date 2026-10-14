const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'dist');
const destDir = path.join(__dirname, 'dist');

try {
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log('[copy-dist] Successfully mirrored frontend/dist to root dist directory.');
    console.log('[copy-dist] Published files:', fs.readdirSync(destDir));
  } else {
    console.warn('[copy-dist] Warning: frontend/dist does not exist.');
  }
} catch (err) {
  console.error('[copy-dist] Error copying dist:', err);
}
