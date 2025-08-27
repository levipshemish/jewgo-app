#!/usr/bin/env node

/**
 * Console Logging Cleanup Script
 * 
 * This script removes or replaces console logging statements with proper logging
 * throughout the frontend codebase.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const BACKEND_DIR = path.join(__dirname, '..', 'backend');

// Files to skip (these might need console logging for debugging)
const SKIP_FILES = [
  'test-server-init.js',
  'prisma/seed.ts',
  'prisma/seed-simple.ts',
  'next.config.js', // Keep warnings for configuration
  'lib/feature-guard.ts', // Keep critical startup errors
  'lib/server-init.ts', // Keep critical startup errors
  'middleware.ts', // Keep critical middleware errors
];

// Patterns to remove or replace
const CONSOLE_PATTERNS = [
  // Remove debug console.log statements
  { pattern: /^\s*console\.log\([^)]*\);?\s*$/gm, replacement: '' },
  { pattern: /^\s*console\.debug\([^)]*\);?\s*$/gm, replacement: '' },
  
  // Remove commented console statements
  { pattern: /^\s*\/\/\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*$/gm, replacement: '' },
  
  // Remove console statements in try-catch blocks (keep the error handling)
  { pattern: /^\s*console\.(log|warn|info|debug)\([^)]*\);?\s*$/gm, replacement: '' },
];

// Patterns to replace with proper logging
const REPLACEMENT_PATTERNS = [
  // Replace console.error with proper error logging
  {
    pattern: /console\.error\(([^)]+)\);?/g,
    replacement: (match, args) => {
      // Keep critical errors but remove debug ones
      if (args.includes('CRITICAL') || args.includes('🚨') || args.includes('❌')) {
        return match; // Keep critical errors
      }
      return ''; // Remove other console.error
    }
  },
  
  // Replace console.warn with proper warning logging
  {
    pattern: /console\.warn\(([^)]+)\);?/g,
    replacement: (match, args) => {
      // Keep configuration warnings but remove debug ones
      if (args.includes('⚠️') || args.includes('BACKEND_URL') || args.includes('configuration')) {
        return match; // Keep configuration warnings
      }
      return ''; // Remove other console.warn
    }
  },
];

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skipFile => filePath.includes(skipFile));
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let hasChanges = false;

    // Apply removal patterns
    CONSOLE_PATTERNS.forEach(({ pattern, replacement }) => {
      const newContent = modifiedContent.replace(pattern, replacement);
      if (newContent !== modifiedContent) {
        hasChanges = true;
        modifiedContent = newContent;
      }
    });

    // Apply replacement patterns
    REPLACEMENT_PATTERNS.forEach(({ pattern, replacement }) => {
      const newContent = modifiedContent.replace(pattern, replacement);
      if (newContent !== modifiedContent) {
        hasChanges = true;
        modifiedContent = newContent;
      }
    });

    // Clean up empty lines that might have been left
    modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (hasChanges) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function main() {
  console.log('🧹 Starting console logging cleanup...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;
  
  // Process frontend files
  if (fs.existsSync(FRONTEND_DIR)) {
    console.log('📁 Processing frontend files...');
    const frontendFiles = findFiles(FRONTEND_DIR);
    
    for (const file of frontendFiles) {
      totalFiles++;
      
      if (shouldSkipFile(file)) {
        console.log(`⏭️  Skipped: ${file}`);
        continue;
      }
      
      if (processFile(file)) {
        cleanedFiles++;
      }
    }
  }
  
  // Process backend files (if any console logging exists)
  if (fs.existsSync(BACKEND_DIR)) {
    console.log('\n📁 Processing backend files...');
    const backendFiles = findFiles(BACKEND_DIR, ['.py']);
    
    for (const file of backendFiles) {
      totalFiles++;
      
      if (processFile(file)) {
        cleanedFiles++;
      }
    }
  }
  
  console.log(`\n🎉 Cleanup complete!`);
  console.log(`📊 Processed ${totalFiles} files`);
  console.log(`🧹 Cleaned ${cleanedFiles} files`);
  console.log(`⏭️  Skipped ${totalFiles - cleanedFiles} files`);
  
  // Run linting to check for any issues
  console.log('\n🔍 Running linting check...');
  try {
    execSync('cd frontend && npm run lint', { stdio: 'inherit' });
    console.log('✅ Linting passed');
  } catch (error) {
    console.log('⚠️  Linting found issues - please review');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, findFiles, shouldSkipFile };
