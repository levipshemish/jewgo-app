#!/usr/bin/env node

/**
 * remove-console-logs
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category deployment
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node remove-console-logs.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node remove-console-logs.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
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
    replacement: '$1// // defaultLogger.error(',
    description: 'Comment out console.error statements'
  }
];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}

function shouldExcludeDirectory(dirPath) {
  const dirName = path.basename(dirPath);
  return EXCLUDED_DIRS.includes(dirName);
}

function processFile(filePath) {
  try {
    let content = wrapSyncWithErrorHandling(() => fs.readFileSync)(filePath, 'utf8');
    let originalContent = content;
    let changesCount = 0;

    defaultLogger.startProgress(CONSOLE_PATTERNS.length, 'Processing CONSOLE_PATTERNS');
let progressCounter = 0;
CONSOLE_PATTERNS.forEach((item, index) => {
  progressCounter++;
  defaultLogger.updateProgress(progressCounter, `Processing item ${index + 1}`);
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changesCount += matches.length;
      }
    });

    if (content !== originalContent) {
      wrapSyncWithErrorHandling(() => fs.writeFileSync)(filePath, content, 'utf8');
      return changesCount;
    }

    return 0;
  } catch (error) {
    defaultLogger.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function walkDirectory(dir) {
  const files = wrapSyncWithErrorHandling(() => fs.readdirSync)(dir);
  let totalChanges = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = wrapSyncWithErrorHandling(() => fs.statSync)(fullPath);

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
    const result = execSync(
      'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs grep -c "console\\." | cut -d: -f2 | paste -sd+ | bc',
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    beforeCount = parseInt(result) || 0;
  } catch (e) {
    defaultLogger.info('Could not count console statements before processing');
  }

  const startDir = process.cwd();
  const totalChanges = walkDirectory(startDir);

  // Count remaining console statements
  let afterCount = 0;
  try {
    const result = execSync(
      'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs grep -c "console\\." | cut -d: -f2 | paste -sd+ | bc',
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    afterCount = parseInt(result) || 0;
  } catch (e) {
    defaultLogger.info('Could not count console statements after processing');
  }

  defaultLogger.info(`✅ Console log removal complete!`);
  defaultLogger.info(`📊 Before: ${beforeCount} console statements`);
  defaultLogger.info(`📊 After: ${afterCount} console statements`);
  defaultLogger.info(`📊 Removed: ${beforeCount - afterCount} console statements`);
}


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


module.exports = { processFile, walkDirectory };
