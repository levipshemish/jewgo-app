#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to fix remaining warnings
const patterns = [
  // Remove unused _error variables in catch blocks
  {
    regex: /catch\s*\(\s*_error\s*\)\s*{/g,
    replacement: 'catch {'
  },
  
  // Remove unused _error variables in function parameters
  {
    regex: /\(\s*_error\s*\)\s*=>\s*{/g,
    replacement: '() => {'
  },
  
  // Remove unused _e variables in function parameters
  {
    regex: /\(\s*_e\s*\)\s*=>\s*{/g,
    replacement: '() => {'
  },
  
  // Remove unused _err variables in function parameters
  {
    regex: /\(\s*_err\s*\)\s*=>\s*{/g,
    replacement: '() => {'
  },
  
  // Remove unused variables in destructuring
  {
    regex: /const\s*{\s*([^}]*_error[^}]*)\s*}\s*=/g,
    replacement: (match, p1) => {
      const cleaned = p1.replace(/_error/g, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '');
      return cleaned ? `const { ${cleaned} } =` : 'const {} =';
    }
  },
  
  // Remove unused variables in destructuring
  {
    regex: /const\s*{\s*([^}]*_e[^}]*)\s*}\s*=/g,
    replacement: (match, p1) => {
      const cleaned = p1.replace(/_e/g, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '');
      return cleaned ? `const { ${cleaned} } =` : 'const {} =';
    }
  },
  
  // Remove unused variables in destructuring
  {
    regex: /const\s*{\s*([^}]*_err[^}]*)\s*}\s*=/g,
    replacement: (match, p1) => {
      const cleaned = p1.replace(/_err/g, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '');
      return cleaned ? `const { ${cleaned} } =` : 'const {} =';
    }
  },
  
  // Remove unused variable assignments
  {
    regex: /const\s+(\w+)\s*=\s*[^;]+;\s*\/\/\s*unused/g,
    replacement: '// const $1 = ...; // unused'
  },
  
  // Remove unused variable assignments (no comment)
  {
    regex: /const\s+(\w+)\s*=\s*[^;]+;\s*(?=\n)/g,
    replacement: (match, varName) => {
      // Only remove if it's a simple assignment that's likely unused
      if (match.includes('result') || match.includes('duration') || match.includes('totalReviews')) {
        return `// ${match.trim()}`;
      }
      return match;
    }
  }
];

// Function to process a file
function processFile(_filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = 0;
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        if (typeof pattern.replacement === 'function') {
          content = content.replace(pattern.regex, pattern.replacement);
        } else {
          content = content.replace(pattern.regex, pattern.replacement);
        }
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

// Function to recursively find TypeScript/JavaScript files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(_currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .next
        if (item !== 'node_modules' && item !== '.next' && !item.startsWith('.')) {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Main execution
console.log('🔧 Starting comprehensive warning cleanup...\n');

const files = findFiles('.');
let totalChanges = 0;
let processedFiles = 0;

files.forEach(file => {
  const changes = processFile(file);
  if (changes > 0) {
    totalChanges += changes;
    processedFiles++;
  }
});

console.log(`\n🎉 Cleanup complete!`);
console.log(`📊 Results:`);
console.log(`   - Files processed: ${processedFiles}`);
console.log(`   - Total changes: ${totalChanges}`);
console.log(`   - Files with changes: ${processedFiles}`);
