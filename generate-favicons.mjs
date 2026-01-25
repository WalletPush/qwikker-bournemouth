#!/usr/bin/env node
import sharp from 'sharp'
import fs from 'fs'

const svgContent = fs.readFileSync('public/qwikker-icon.svg', 'utf-8')

console.log('🎨 Generating favicons from qwikker-icon.svg...')

// Generate favicon.ico (32x32)
await sharp(Buffer.from(svgContent))
  .resize(32, 32)
  .toFile('app/favicon.ico')
console.log('✅ Created app/favicon.ico (32x32)')

// Generate icon.svg (just copy the source)
fs.copyFileSync('public/qwikker-icon.svg', 'app/icon.svg')
console.log('✅ Created app/icon.svg')

// Generate apple-icon.png (180x180 for iOS)
await sharp(Buffer.from(svgContent))
  .resize(180, 180)
  .toFile('app/apple-icon.png')
console.log('✅ Created app/apple-icon.png (180x180)')

// Optional: Generate icon-192.png (for PWA)
await sharp(Buffer.from(svgContent))
  .resize(192, 192)
  .toFile('public/icon-192.png')
console.log('✅ Created public/icon-192.png (192x192)')

// Optional: Generate icon-512.png (for PWA)
await sharp(Buffer.from(svgContent))
  .resize(512, 512)
  .toFile('public/icon-512.png')
console.log('✅ Created public/icon-512.png (512x512)')

console.log('\n🎉 All favicons generated successfully!')
console.log('💡 Commit and push to deploy:')
console.log('   git add app/favicon.ico app/icon.svg app/apple-icon.png')
console.log('   git commit -m "Update favicon with Qwikker logo"')
console.log('   git push origin main')
