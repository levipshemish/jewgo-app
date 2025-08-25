#!/usr/bin/env node

/**
 * fix-font-css
 * Font CSS Fix Script
 * 
 * This script provides font css fix script for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category utility
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node fix-font-css.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node fix-font-css.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
 */
const fs = require('fs');
const { defaultLogger } = require('./utils/logger');

const { defaultErrorHandler } = require('./utils/errorHandler');

const path = require('path');
/**
 * Wrap function with error handling
 */
function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}


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
    defaultLogger.info(`🔧 Processing: ${filePath}`);
    
    // Read the CSS file
    let cssContent = wrapSyncWithErrorHandling(() => fs.readFileSync)(filePath, 'utf8');
    let originalContent = cssContent;
    let fixesApplied = 0;
    
    // Apply fixes for each invalid pattern
    defaultLogger.startProgress(invalidPatterns.length, 'Processing invalidPatterns');
let progressCounter = 0;
invalidPatterns.forEach((item, index) => {
  progressCounter++;
  defaultLogger.updateProgress(progressCounter, `Processing item ${index + 1}`);
      const matches = cssContent.match(pattern);
      if (matches) {
        defaultLogger.info(`  Found ${matches.length} instances of ${pattern.source}`);
        cssContent = cssContent.replace(pattern, replacement);
        fixesApplied += matches.length;
      }
    });
    
    // Write the fixed content back to the file
    if (fixesApplied > 0) {
      wrapSyncWithErrorHandling(() => fs.writeFileSync)(filePath, cssContent, 'utf8');
      defaultLogger.info(`✅ Fixed ${fixesApplied} invalid unicode-range values in ${filePath}`);
      return true;
    } else {
      defaultLogger.info(`ℹ️  No invalid unicode-range values found in ${filePath}`);
      return false;
    }
    
  } catch (error) {
    defaultLogger.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findCssFiles(directory) {
  const cssFiles = [];
  
  try {
    const files = wrapSyncWithErrorHandling(() => fs.readdirSync)(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = wrapSyncWithErrorHandling(() => fs.statSync)(filePath);
      
      if (stat.isDirectory()) {
        cssFiles.push(...findCssFiles(filePath));
      } else if (file.endsWith('.css')) {
        cssFiles.push(filePath);
      }
    });
  } catch (error) {
    defaultLogger.error(`❌ Error reading directory ${directory}:`, error.message);
  }
  
  return cssFiles;
}

function main() {
  defaultLogger.info('🚀 Starting Font CSS Fix Script...\n');
  
  // Find all CSS files in the .next/static/css directory
  const cssDir = path.join(process.cwd(), '.next', 'static', 'css');
  
  if (!wrapSyncWithErrorHandling(() => fs.existsSync)(cssDir)) {
    defaultLogger.info('ℹ️  No .next/static/css directory found. Run "npm run build" first.');
    return;
  }
  
  const cssFiles = findCssFiles(cssDir);
  
  if (cssFiles.length === 0) {
    defaultLogger.info('ℹ️  No CSS files found in .next/static/css directory.');
    return;
  }
  
  defaultLogger.info(`📁 Found ${cssFiles.length} CSS file(s) to process:\n`);
  
  let totalFixes = 0;
  let filesFixed = 0;
  
  cssFiles.forEach(file => {
    const wasFixed = fixCssFile(file);
    if (wasFixed) {
      filesFixed++;
    }
  });
  
  defaultLogger.info('\n📊 Summary:');
  defaultLogger.info(`  Files processed: ${cssFiles.length}`);
  defaultLogger.info(`  Files fixed: ${filesFixed}`);
  
  if (filesFixed > 0) {
    defaultLogger.info('\n✅ Font CSS fix completed successfully!');
    defaultLogger.info('💡 You may need to rebuild the project for changes to take effect.');
  } else {
    defaultLogger.info('\nℹ️  No fixes were needed.');
  }
}

// Run the script

// Wrap main function with error handling
const mainWithErrorHandling = wrapWithErrorHandling(main, {
  script: __filename,
  operation: 'main'
});

// Execute with error handling
if (require.main === module) {
  mainWithErrorHandling().catch(error => {
    defaultLogger.error('Script failed:', error.message);
    wrapSyncWithErrorHandling(() => process.exit)(1);
  });
}


module.exports = { fixCssFile, findCssFiles, invalidPatterns };
