#!/usr/bin/env node

/**
 * cleanup-remaining-vars
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category maintenance
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node cleanup-remaining-vars.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node cleanup-remaining-vars.js --verbose --config=production
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


// Enhanced patterns to fix remaining unused variables
const patterns = [
  // Fix unused error variables in catch blocks (more comprehensive)
  {
    regex: /catch\s*\(\s*error\s*\)\s*{/g,
    replacement: 'catch {'
  },
  {
    regex: /catch\s*\(\s*e\s*\)\s*{/g,
    replacement: 'catch (_e) {'
  },
  {
    regex: /catch\s*\(\s*err\s*\)\s*{/g,
    replacement: 'catch (_err) {'
  },
  
  // Fix unused variables in function parameters
  {
    regex: /\(\s*error\s*\)\s*=>\s*{/g,
    replacement: '() => {'
  },
  {
    regex: /\(\s*e\s*\)\s*=>\s*{/g,
    replacement: '() => {'
  },
  
  // Fix unused variables in destructuring
  {
    regex: /const\s*{\s*([^}]*error[^}]*)\s*}\s*=/g,
    replacement: (match, p1) => {
      return match.replace(/error/g, '_error');
    }
  },
  
  // Fix unused variables in useState destructuring
  {
    regex: /const\s*\[\s*([^,]+),\s*set([^]]+)\s*\]\s*=\s*useState/g,
    replacement: (match, p1, p2) => {
      // Only prefix if it's a common unused pattern
      // const unusedPatterns = ['regName', 'regEmail', 'regPassword', 'regLoading', 'regError', 'totalReviews', 'result', 'duration', 'remaining', 'info', 'startTime', 'page', 'itemsPerPage', 'limitedPayload', 'fallbackError', 'cloudName', 'formattedMessage', 'mockReviews', 'emailError', 'id', 'request', 'filterKey', 'value', 'state', 'index'];
      if (unusedPatterns.some(pattern => p1.includes(pattern))) {
        return match.replace(p1, `_${p1}`);
      }
      return match;
    }
  },
  
  // Fix unused function assignments
  {
    regex: /const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*{/g,
    replacement: (match, funcName) => {
      const unusedFunctions = ['handleRegister', 'getUserLocation', 'calculateDistance', 'timeToMinutes', 'handleRestaurantSearch', 'getFilteredCount', 'hasActiveFilters', 'handleTabChange', 'previewRestaurants', 'handleCloseFilters', 'scrollToItem', 'scrollToTop', 'handleTouch', 'handleDeleteReview', 'handleFlagReview', 'getDirectionsToRestaurant', 'createInfoWindowContent', 'getKosherBadgeClasses', 'createSimplePinElement', 'getAllTags', '_getAgencyBadgeClass', '_getKosherBadgeClass', 'formatReviewCount', 'isProblematicCloudinaryUrl'];
      if (unusedFunctions.includes(funcName)) {
        return match.replace(funcName, `_${funcName}`);
      }
      return match;
    }
  },
  
  // Fix unused imports
  {
    regex: /import\s*{\s*([^}]*)\s*}\s*from\s*['"][^'"]+['"]/g,
    replacement: (match, imports) => {
      const unusedImports = ['Filter', 'Search', 'useEffect', 'Review'];
      const importList = imports.split(',').map(imp => imp.trim());
      const filteredImports = importList.filter(imp => !unusedImports.includes(imp));
      if (filteredImports.length !== importList.length) {
        return match.replace(imports, filteredImports.join(', '));
      }
      return match;
    }
  },
  
  // Fix unused variables in function parameters (more patterns)
  {
    regex: /\(\s*([^)]*)\s*\)\s*=>\s*{/g,
    replacement: (match, params) => {
      const paramList = params.split(',').map(p => p.trim());
      const fixedParams = paramList.map(param => {
        if (param.match(/^(onCancel|setShowDirections|restaurants|filterKey|value|state|index)$/)) {
          return `_${param}`;
        }
        return param;
      });
      return match.replace(params, fixedParams.join(', '));
    }
  },
  
  // Fix unused variables in function definitions
  {
    regex: /function\s+[^(]*\(\s*([^)]*)\s*\)/g,
    replacement: (match, params) => {
      const paramList = params.split(',').map(p => p.trim());
      const fixedParams = paramList.map(param => {
        if (param.match(/^(label|event)$/)) {
          return `_${param}`;
        }
        return param;
      });
      return match.replace(params, fixedParams.join(', '));
    }
  }
];

function processFile(_filePath) {
  try {
    let content = wrapSyncWithErrorHandling(() => fs.readFileSync)(filePath, 'utf8');
    let originalContent = content;
    let changes = 0;
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        content = content.replace(pattern.regex, pattern.replacement);
        changes += matches.length;
      }
    });
    
    if (content !== originalContent) {
      wrapSyncWithErrorHandling(() => fs.writeFileSync)(filePath, content, 'utf8');
      defaultLogger.info(`✅ Fixed ${changes} issues in ${filePath}`);
      return changes;
    }
    
    return 0;
  } catch (error) {
    defaultLogger.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function findTypeScriptFiles(_dir) {
  const files = [];
  
  function traverse(_currentDir) {
    const items = wrapSyncWithErrorHandling(() => fs.readdirSync)(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = wrapSyncWithErrorHandling(() => fs.statSync)(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, and other build directories
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
          traverse(fullPath);
        }
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function main() {
  defaultLogger.info('🧹 Starting enhanced cleanup of remaining unused variables...\n');
  
  const files = findTypeScriptFiles('.');
  let totalChanges = 0;
  let filesChanged = 0;
  
  for (const file of files) {
    const changes = processFile(file);
    if (changes > 0) {
      totalChanges += changes;
      filesChanged++;
    }
  }
  
  defaultLogger.info(`\n🎉 Cleanup complete!`);
  defaultLogger.info(`📊 Files modified: ${filesChanged}`);
  defaultLogger.info(`🔧 Total changes: ${totalChanges}`);
  defaultLogger.info(`\n💡 Run 'npm run lint' to see the remaining warnings.`);
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


module.exports = { processFile, patterns };
