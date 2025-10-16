#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Quote replacements for react/no-unescaped-entities
const replacements = [
  { from: /'/g, to: '&apos;' },
  { from: /"/g, to: '&quot;' }
];

function fixQuotesInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Only fix quotes inside JSX text content (not in attributes)
    // This is a simplified approach - look for quotes between > and <
    const jsxTextRegex = />([^<]*['"'][^<]*)</g;
    
    content = content.replace(jsxTextRegex, (match, textContent) => {
      let newTextContent = textContent;
      
      // Replace single quotes
      if (newTextContent.includes("'")) {
        newTextContent = newTextContent.replace(/'/g, '&apos;');
        changed = true;
      }
      
      // Replace double quotes
      if (newTextContent.includes('"')) {
        newTextContent = newTextContent.replace(/"/g, '&quot;');
        changed = true;
      }
      
      return '>' + newTextContent;
    });
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed quotes in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Find all TSX files
const tsxFiles = glob.sync('**/*.{tsx,jsx}', {
  ignore: ['node_modules/**', '.next/**', 'qwikker-clean-export/**']
});

console.log(`🔍 Found ${tsxFiles.length} TSX/JSX files to check...`);

let fixedCount = 0;
tsxFiles.forEach(file => {
  if (fixQuotesInFile(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed quotes in ${fixedCount} files!`);
