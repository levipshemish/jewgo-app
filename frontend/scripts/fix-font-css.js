#!/usr/bin/env node

/**
 * Font CSS Fix Script
 * 
 * This script fixes invalid unicode-range values in Next.js generated CSS files.
 * The issue is that Next.js font optimizer sometimes generates invalid ranges like:
 * - u+1f?? (should be u+1f6?? or specific range)
 * - u+1ee?? (should be u+1ee00-1eeff or specific range)
 * - u+28?? (should be u+2800-28ff or specific range)
 * - u+2b?? (should be u+2b00-2bff or specific range)
 * - u+1f0?? (should be u+1f000-1f0ff or specific range)
 * - u+1f7?? (should be u+1f700-1f7ff or specific range)
 * - u+1fb?? (should be u+1fb00-1fbff or specific range)
 * - u+00?? (should be u+0000-00ff or specific range)
 */

const fs = require('fs');
const path = require('path');

// Define the invalid patterns and their valid replacements
const invalidPatterns = [
  {
    pattern: /u\+1f\?\?/g,
    replacement: 'u+1f600-1f64f' // Emoji range
  },
  {
    pattern: /u\+1ee\?\?/g,
    replacement: 'u+1ee00-1eeff' // Arabic Mathematical Alphabetic Symbols
  },
  {
    pattern: /u\+28\?\?/g,
    replacement: 'u+2800-28ff' // Braille Patterns
  },
  {
    pattern: /u\+2b\?\?/g,
    replacement: 'u+2b00-2bff' // Miscellaneous Symbols and Arrows
  },
  {
    pattern: /u\+1f0\?\?/g,
    replacement: 'u+1f000-1f0ff' // Mahjong Tiles
  },
  {
    pattern: /u\+1f7\?\?/g,
    replacement: 'u+1f700-1f7ff' // Alchemical Symbols
  },
  {
    pattern: /u\+1fb\?\?/g,
    replacement: 'u+1fb00-1fbff' // Legacy Computing
  },
  {
    pattern: /u\+00\?\?/g,
    replacement: 'u+0000-00ff' // Basic Latin
  }
];

function fixCssFile(filePath) {
  try {
    console.log(`🔧 Processing: ${filePath}`);
    
    // Read the CSS file
    let cssContent = fs.readFileSync(filePath, 'utf8');
    let originalContent = cssContent;
    let fixesApplied = 0;
    
    // Apply fixes for each invalid pattern
    invalidPatterns.forEach(({ pattern, replacement }) => {
      const matches = cssContent.match(pattern);
      if (matches) {
        console.log(`  Found ${matches.length} instances of ${pattern.source}`);
        cssContent = cssContent.replace(pattern, replacement);
        fixesApplied += matches.length;
      }
    });
    
    // Write the fixed content back to the file
    if (fixesApplied > 0) {
      fs.writeFileSync(filePath, cssContent, 'utf8');
      console.log(`✅ Fixed ${fixesApplied} invalid unicode-range values in ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No invalid unicode-range values found in ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findCssFiles(directory) {
  const cssFiles = [];
  
  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        cssFiles.push(...findCssFiles(filePath));
      } else if (file.endsWith('.css')) {
        cssFiles.push(filePath);
      }
    });
  } catch (error) {
    console.error(`❌ Error reading directory ${directory}:`, error.message);
  }
  
  return cssFiles;
}

function main() {
  console.log('🚀 Starting Font CSS Fix Script...\n');
  
  // Find all CSS files in the .next/static/css directory
  const cssDir = path.join(process.cwd(), '.next', 'static', 'css');
  
  if (!fs.existsSync(cssDir)) {
    console.log('ℹ️  No .next/static/css directory found. Run "npm run build" first.');
    return;
  }
  
  const cssFiles = findCssFiles(cssDir);
  
  if (cssFiles.length === 0) {
    console.log('ℹ️  No CSS files found in .next/static/css directory.');
    return;
  }
  
  console.log(`📁 Found ${cssFiles.length} CSS file(s) to process:\n`);
  
  let totalFixes = 0;
  let filesFixed = 0;
  
  cssFiles.forEach(file => {
    const wasFixed = fixCssFile(file);
    if (wasFixed) {
      filesFixed++;
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`  Files processed: ${cssFiles.length}`);
  console.log(`  Files fixed: ${filesFixed}`);
  
  if (filesFixed > 0) {
    console.log('\n✅ Font CSS fix completed successfully!');
    console.log('💡 You may need to rebuild the project for changes to take effect.');
  } else {
    console.log('\nℹ️  No fixes were needed.');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixCssFile, findCssFiles, invalidPatterns };
