#!/usr/bin/env node

/**
 * Verifies placeholder folder structure exists
 * Creates missing folders if needed
 * Lists what images are needed
 */

const fs = require('fs');
const path = require('path');

const SYSTEM_CATEGORIES = [
  'restaurant', 'cafe', 'bar', 'pub', 'bakery', 'fast_food',
  'dessert', 'takeaway', 'salon', 'barber', 'tattoo', 'wellness',
  'retail', 'fitness', 'sports', 'hotel', 'venue', 'entertainment',
  'professional', 'other'
];

const VARIANTS_PER_CATEGORY = 11; // 0-10
const BASE_PATH = path.join(__dirname, '../public/placeholders');

console.log('🔍 Verifying placeholder folder structure...\n');

// Ensure base directory exists
if (!fs.existsSync(BASE_PATH)) {
  fs.mkdirSync(BASE_PATH, { recursive: true });
  console.log('✅ Created base directory: /public/placeholders/\n');
}

let totalFolders = 0;
let totalImages = 0;
let missingImages = 0;

SYSTEM_CATEGORIES.forEach(category => {
  const categoryPath = path.join(BASE_PATH, category);
  
  // Create category folder if missing
  if (!fs.existsSync(categoryPath)) {
    fs.mkdirSync(categoryPath, { recursive: true });
    console.log(`✅ Created folder: ${category}/`);
  }
  totalFolders++;
  
  // Check for expected images
  const expectedImages = [];
  const missingImagesList = [];
  
  for (let i = 0; i < VARIANTS_PER_CATEGORY; i++) {
    const paddedId = String(i).padStart(2, '0');
    const filename = `${category}-abstract-${paddedId}.v1.webp`;
    const filePath = path.join(categoryPath, filename);
    
    expectedImages.push(filename);
    
    if (fs.existsSync(filePath)) {
      totalImages++;
    } else {
      missingImagesList.push(filename);
      missingImages++;
    }
  }
  
  // Report status for this category
  const existing = expectedImages.length - missingImagesList.length;
  if (existing === 0) {
    console.log(`⚠️  ${category}: 0/${VARIANTS_PER_CATEGORY} images (empty)`);
  } else if (missingImagesList.length > 0) {
    console.log(`⚠️  ${category}: ${existing}/${VARIANTS_PER_CATEGORY} images (incomplete)`);
  } else {
    console.log(`✅ ${category}: ${existing}/${VARIANTS_PER_CATEGORY} images (complete)`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 SUMMARY:`);
console.log(`   Folders: ${totalFolders}/${SYSTEM_CATEGORIES.length}`);
console.log(`   Images: ${totalImages}/${SYSTEM_CATEGORIES.length * VARIANTS_PER_CATEGORY}`);
console.log(`   Missing: ${missingImages}`);
console.log('='.repeat(60) + '\n');

if (missingImages > 0) {
  console.log('🎨 NEXT STEP: Generate missing placeholder images');
  console.log('   Format: WebP, 40-120KB, 800px max width, 16:9 aspect');
  console.log('   Style: Dark, cinematic, abstract detail shots');
  console.log('   See: AI_PLACEHOLDER_GENERATION_GUIDE.md\n');
} else {
  console.log('🎉 All placeholder images are present!\n');
}

// Exit with non-zero if images are missing (useful for CI/deployment checks)
process.exit(missingImages > 0 ? 1 : 0);

