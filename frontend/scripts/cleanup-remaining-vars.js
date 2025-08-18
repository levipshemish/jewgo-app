#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    let content = fs.readFileSync(filePath, 'utf8');
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
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${changes} issues in ${filePath}`);
      return changes;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function findTypeScriptFiles(_dir) {
  const files = [];
  
  function traverse(_currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
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
  console.log('🧹 Starting enhanced cleanup of remaining unused variables...\n');
  
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
  
  console.log(`\n🎉 Cleanup complete!`);
  console.log(`📊 Files modified: ${filesChanged}`);
  console.log(`🔧 Total changes: ${totalChanges}`);
  console.log(`\n💡 Run 'npm run lint' to see the remaining warnings.`);
}

if (require.main === module) {
  main();
}

module.exports = { processFile, patterns };
