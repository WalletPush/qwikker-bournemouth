/**
 * Simple script to generate PWA icons
 * This creates basic colored squares with the Qwikker "Q" logo
 * For production, you'd want to use proper icon generation tools
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create SVG template for Qwikker icon
function createIconSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00d083;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00b86f;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">Q</text>
</svg>`;
}

// Create public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
iconSizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Generated ${filename}`);
});

// Create favicon.ico placeholder
const faviconSVG = createIconSVG(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
console.log('✅ Generated favicon.svg');

// Create apple-touch-icon
const appleTouchIcon = createIconSVG(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), appleTouchIcon);
console.log('✅ Generated apple-touch-icon.svg');

console.log('\n🎉 PWA icons generated successfully!');
console.log('📝 Note: These are SVG icons. For production, consider converting to PNG for better compatibility.');
console.log('🔧 You can use tools like sharp or imagemagick to convert SVG to PNG if needed.');
