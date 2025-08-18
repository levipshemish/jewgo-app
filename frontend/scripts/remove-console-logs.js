#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script to remove all console.log statements from TypeScript/React files
 * This is critical for production deployment
 */

const EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage'
];

const CONSOLE_PATTERNS = [
  // Remove console.log statements
  {
    pattern: /console\.log\([^)]*\);?\s*\n?/g,
    replacement: '',
    description: 'Remove console.log statements'
  },
  // Remove console.warn statements (but keep errors)
  {
    pattern: /console\.warn\([^)]*\);?\s*\n?/g,
    replacement: '',
    description: 'Remove console.warn statements'
  },
  // Remove console.info statements
  {
    pattern: /console\.info\([^)]*\);?\s*\n?/g,
    replacement: '',
    description: 'Remove console.info statements'
  },
  // Keep console.error for production debugging, just comment them
  {
    pattern: /(\s*)console\.error\(/g,
    replacement: '$1// // console.error(',
    description: 'Comment out console.error statements'
  }
];

function shouldProcessFile(_filePath) {
  const ext = path.extname(filePath);
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}

function shouldExcludeDirectory(_dirPath) {
  const dirName = path.basename(dirPath);
  return EXCLUDED_DIRS.includes(dirName);
}

function processFile(_filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesCount = 0;

    CONSOLE_PATTERNS.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changesCount += matches.length;
      }
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return changesCount;
    }

    return 0;
  } catch (error) {
    // console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function walkDirectory(_dir) {
  const files = fs.readdirSync(dir);
  let totalChanges = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!shouldExcludeDirectory(fullPath)) {
        totalChanges += walkDirectory(fullPath);
      }
    } else if (shouldProcessFile(fullPath)) {
      totalChanges += processFile(fullPath);
    }
  }

  return totalChanges;
}

function main() {
  // Count current console statements
  let beforeCount = 0;
  try {
    // const result = execSync(
      'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs grep -c "console\\." | cut -d: -f2 | paste -sd+ | bc',
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    beforeCount = parseInt(result) || 0;
  } catch (e) {
    }

  const startDir = process.cwd();
  const totalChanges = walkDirectory(startDir);

  // Count remaining console statements
  let afterCount = 0;
  try {
    // const result = execSync(
      'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs grep -c "console\\." | cut -d: -f2 | paste -sd+ | bc',
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    afterCount = parseInt(result) || 0;
  } catch (e) {
    }

  }

if (require.main === module) {
  main();
}

module.exports = { processFile, walkDirectory };
