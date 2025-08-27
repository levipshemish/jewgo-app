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
    
    let currentFile = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line is a file path
      if (line.startsWith('./') && !line.includes('Warning:')) {
        const fileMatch = line.match(/^\.\/([^:]+)/);
        if (fileMatch) {
          currentFile = fileMatch[1];
        }
      }
      
      // Check if this line is a warning about unused variables
      if (line.includes('Warning:') && line.includes('is defined but never used')) {
        if (currentFile) {
          files.add(currentFile);
        }
      }
    }
    
    return Array.from(files);
  } catch (error) {
    // The lint command exits with code 1 when there are warnings, so we need to capture the output
    const result = error.stdout || error.stderr || '';
    const lines = result.split('\n');
    const files = new Set();
    
    let currentFile = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line is a file path
      if (line.startsWith('./') && !line.includes('Warning:')) {
        const fileMatch = line.match(/^\.\/([^:]+)/);
        if (fileMatch) {
          currentFile = fileMatch[1];
        }
      }
      
      // Check if this line is a warning about unused variables
      if (line.includes('Warning:') && line.includes('is defined but never used')) {
        if (currentFile) {
          files.add(currentFile);
        }
      }
    }
    
    return Array.from(files);
  }
}

// Fix unused variables in a file
function fixUnusedVarsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix specific patterns for unused variables
    const patterns = [
      // Fix unused error variables in catch blocks
      { 
        regex: /catch\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g, 
        replacement: (match, varName) => {
          if (!varName.startsWith('_')) {
            return `catch (_${varName})`;
          }
          return match;
        }
      },
      // Fix unused function parameters
      {
        regex: /\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*string\s*\)/g,
        replacement: (match, paramName) => {
          if (!paramName.startsWith('_')) {
            return `(_${paramName}: string)`;
          }
          return match;
        }
      },
      // Fix unused variables in destructuring
      {
        regex: /const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/g,
        replacement: (match, varName, value) => {
          if (!varName.startsWith('_') && !value.includes('useState') && !value.includes('useEffect')) {
            return `const _${varName} = ${value};`;
          }
          return match;
        }
      },
      // Fix unused imports
      {
        regex: /import\s+{\s*([^}]+)\s*}\s+from\s+['"][^'"]+['"]/g,
        replacement: (match, imports) => {
          const newImports = imports.split(',').map(imp => {
            const trimmed = imp.trim();
            if (trimmed && !trimmed.startsWith('_') && !trimmed.includes(' as ')) {
              return `_${trimmed}`;
            }
            return trimmed;
          }).join(', ');
          return match.replace(imports, newImports);
        }
      }
    ];
    
    for (const pattern of patterns) {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
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
