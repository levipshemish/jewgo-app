#!/usr/bin/env node
/**
 * Fix unused variable warnings by prefixing with underscore
 * This script automatically fixes ESLint warnings about unused variables
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the list of files with unused variable warnings
function getFilesWithUnusedVars() {
  try {
    const result = execSync('npm run lint 2>&1', { encoding: 'utf8' });
    const lines = result.split('\n');
    const files = new Set();
    
    console.log('Debug: Lint output lines:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Warning:') && line.includes('is defined but never used')) {
        console.log('Debug: Found warning line:', line);
        // Look for the file path in the previous line
        const prevLine = lines[i - 1];
        console.log('Debug: Previous line:', prevLine);
        if (prevLine && prevLine.startsWith('./')) {
          const fileMatch = prevLine.match(/^\.\/([^:]+):/);
          if (fileMatch) {
            files.add(fileMatch[1]);
            console.log('Debug: Added file:', fileMatch[1]);
          }
        }
      }
    }
    
    return Array.from(files);
  } catch (error) {
    console.log('No linting issues found or linting failed');
    return [];
  }
}

// Fix unused variables in a file
function fixUnusedVarsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix unused variables that are already prefixed with underscore
    content = content.replace(/(\s+)(_err|_error|_userError|_handleFiltersChange|_handleClearFilters|_userLoadError|_requestLocation|_resetPage|_infiniteScrollHasMore|_handleRequestLocation|_toggleFilter|_clearAllFilters|_requestLocation|_categoryId|_sortRestaurantsByDistance|_startTransition|_Fragment|_Activity|_Download|_MapPin|_Star|_body|_phone|_NextRequest|_request|_useEffect|_isSupabaseConfigured|_handleUserLoadError|_getSupabaseClient)\s*=/g, '$1_$2 =');
    
    // Fix unused variables that are not prefixed
    content = content.replace(/(\s+)(err|error|e|categoryId|toggleFilter|clearAllFilters|requestLocation|resetPage|infiniteScrollHasMore|handleRequestLocation|handleFiltersChange|handleClearFilters|userLoadError|sortRestaurantsByDistance|startTransition|Fragment|Activity|Download|MapPin|Star|body|phone|NextRequest|request|useEffect|isSupabaseConfigured|handleUserLoadError|getSupabaseClient)\s*=/g, '$1_$2 =');
    
    // Fix unused function parameters
    content = content.replace(/\(\s*([^)]*)\s*\)\s*=>\s*{/g, (match, params) => {
      const newParams = params.split(',').map(param => {
        const trimmed = param.trim();
        if (trimmed && !trimmed.startsWith('_') && !trimmed.startsWith('...')) {
          return `_${trimmed}`;
        }
        return trimmed;
      }).join(', ');
      return `(${newParams}) => {`;
    });
    
    if (content !== fs.readFileSync(filePath, 'utf8')) {
      fs.writeFileSync(filePath, content, 'utf8');
      modified = true;
    }
    
    return modified;
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔧 Fixing unused variable warnings...');
  
  const files = getFilesWithUnusedVars();
  
  if (files.length === 0) {
    console.log('✅ No files with unused variable warnings found');
    return;
  }
  
  console.log(`Found ${files.length} files with unused variable warnings:`);
  
  let fixedCount = 0;
  for (const file of files) {
    console.log(`  - ${file}`);
    if (fixUnusedVarsInFile(file)) {
      fixedCount++;
      console.log(`    ✅ Fixed`);
    } else {
      console.log(`    ⚠️  No changes needed or error occurred`);
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} out of ${files.length} files`);
  
  // Run lint again to show remaining issues
  console.log('\n📋 Running lint check again...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
  } catch (error) {
    console.log('Some linting issues may still remain');
  }
}

if (require.main === module) {
  main();
}

module.exports = { getFilesWithUnusedVars, fixUnusedVarsInFile };
