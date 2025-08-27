#!/usr/bin/env node

/**
 * Script to automatically fix unused variables in the frontend codebase
 * This script removes unused imports and variables to clean up ESLint warnings
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const FIXABLE_PATTERNS = [
  // Unused imports
  /import\s+{([^}]+)}\s+from\s+['"][^'"]+['"]/g,
  /import\s+(\w+)\s+from\s+['"][^'"]+['"]/g,
  
  // Unused variables
  /const\s+(\w+)\s*=\s*[^;]+;/g,
  /let\s+(\w+)\s*=\s*[^;]+;/g,
  /var\s+(\w+)\s*=\s*[^;]+;/g,
  
  // Unused function parameters
  /function\s+\w+\s*\(([^)]+)\)/g,
  /\(\s*([^)]+)\s*\)\s*=>/g,
];

// Patterns to ignore (variables that should not be removed)
const IGNORE_PATTERNS = [
  /^_/, // Variables starting with underscore
  /^React$/, // React import
  /^useState$/, // React hooks
  /^useEffect$/, // React hooks
  /^useCallback$/, // React hooks
  /^useMemo$/, // React hooks
  /^useRef$/, // React hooks
  /^useContext$/, // React hooks
  /^useReducer$/, // React hooks
  /^useLayoutEffect$/, // React hooks
  /^useImperativeHandle$/, // React hooks
  /^useDebugValue$/, // React hooks
  /^useDeferredValue$/, // React hooks
  /^useTransition$/, // React hooks
  /^useId$/, // React hooks
  /^useSyncExternalStore$/, // React hooks
  /^useInsertionEffect$/, // React hooks
];

function shouldIgnoreVariable(varName) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(varName));
}

function extractUnusedVariables(filePath) {
  try {
    // Run ESLint to get unused variable warnings
    const result = execSync(`cd ${FRONTEND_DIR} && npx eslint "${filePath}" --format=json`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const eslintOutput = JSON.parse(result);
    const unusedVars = [];
    
    eslintOutput.forEach(file => {
      file.messages.forEach(message => {
        if (message.ruleId === '@typescript-eslint/no-unused-vars') {
          unusedVars.push({
            line: message.line,
            column: message.column,
            message: message.message,
            variable: extractVariableName(message.message)
          });
        }
      });
    });
    
    return unusedVars;
  } catch (error) {
    // ESLint might fail, return empty array
    return [];
  }
}

function extractVariableName(message) {
  const match = message.match(/'([^']+)'/);
  return match ? match[1] : null;
}

function fixUnusedVariables(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const unusedVars = extractUnusedVariables(filePath);
  
  let modified = false;
  const newLines = [...lines];
  
  // Sort by line number in descending order to avoid line number shifts
  unusedVars.sort((a, b) => b.line - a.line);
  
  unusedVars.forEach(unusedVar => {
    const lineIndex = unusedVar.line - 1;
    const line = newLines[lineIndex];
    
    if (!line) return;
    
    // Skip if variable should be ignored
    if (shouldIgnoreVariable(unusedVar.variable)) {
      return;
    }
    
    // Handle different types of unused variables
    if (line.includes('import') && line.includes('from')) {
      // Handle unused imports
      const newLine = removeUnusedImport(line, unusedVar.variable);
      if (newLine !== line) {
        newLines[lineIndex] = newLine;
        modified = true;
      }
    } else if (line.includes('const') || line.includes('let') || line.includes('var')) {
      // Handle unused variable declarations
      const newLine = removeUnusedVariable(line, unusedVar.variable);
      if (newLine !== line) {
        newLines[lineIndex] = newLine;
        modified = true;
      }
    } else if (line.includes('function') || line.includes('=>')) {
      // Handle unused function parameters
      const newLine = removeUnusedParameter(line, unusedVar.variable);
      if (newLine !== line) {
        newLines[lineIndex] = newLine;
        modified = true;
      }
    }
  });
  
  if (modified) {
    // Remove empty import lines
    const cleanedLines = newLines.filter((line, index) => {
      if (line.trim() === '' && index > 0) {
        const prevLine = newLines[index - 1];
        return !(prevLine.includes('import') && prevLine.trim() === '');
      }
      return true;
    });
    
    fs.writeFileSync(filePath, cleanedLines.join('\n'));
    console.log(`Fixed unused variables in: ${filePath}`);
  }
}

function removeUnusedImport(line, variable) {
  // Handle destructured imports
  if (line.includes('{') && line.includes('}')) {
    const importMatch = line.match(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const imports = importMatch[1].split(',').map(imp => imp.trim());
      const filteredImports = imports.filter(imp => {
        const varName = imp.split(' as ')[0].trim();
        return varName !== variable;
      });
      
      if (filteredImports.length === 0) {
        return ''; // Remove entire import line
      } else if (filteredImports.length !== imports.length) {
        return line.replace(importMatch[1], filteredImports.join(', '));
      }
    }
  } else {
    // Handle default imports
    const importMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch && importMatch[1] === variable) {
      return ''; // Remove entire import line
    }
  }
  
  return line;
}

function removeUnusedVariable(line, variable) {
  // Handle destructured assignments
  if (line.includes('{') && line.includes('}')) {
    const destructureMatch = line.match(/(const|let|var)\s+{([^}]+)}\s*=/);
    if (destructureMatch) {
      const variables = destructureMatch[2].split(',').map(v => v.trim());
      const filteredVars = variables.filter(v => {
        const varName = v.split(':')[0].trim();
        return varName !== variable;
      });
      
      if (filteredVars.length === 0) {
        return ''; // Remove entire line
      } else if (filteredVars.length !== variables.length) {
        return line.replace(destructureMatch[2], filteredVars.join(', '));
      }
    }
  } else {
    // Handle simple variable assignments
    const varMatch = line.match(new RegExp(`(const|let|var)\\s+${variable}\\s*=`));
    if (varMatch) {
      return ''; // Remove entire line
    }
  }
  
  return line;
}

function removeUnusedParameter(line, variable) {
  // Handle function parameters
  if (line.includes('function')) {
    const funcMatch = line.match(/function\s+\w+\s*\(([^)]+)\)/);
    if (funcMatch) {
      const params = funcMatch[1].split(',').map(p => p.trim());
      const filteredParams = params.filter(p => {
        const paramName = p.split('=')[0].trim();
        return paramName !== variable;
      });
      
      if (filteredParams.length !== params.length) {
        return line.replace(funcMatch[1], filteredParams.join(', '));
      }
    }
  } else if (line.includes('=>')) {
    // Handle arrow function parameters
    const arrowMatch = line.match(/\(\s*([^)]+)\s*\)\s*=>/);
    if (arrowMatch) {
      const params = arrowMatch[1].split(',').map(p => p.trim());
      const filteredParams = params.filter(p => {
        const paramName = p.split('=')[0].trim();
        return paramName !== variable;
      });
      
      if (filteredParams.length !== params.length) {
        return line.replace(arrowMatch[1], filteredParams.join(', '));
      }
    }
  }
  
  return line;
}

function findTypeScriptFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

function main() {
  console.log('🔍 Finding TypeScript files...');
  const files = findTypeScriptFiles(FRONTEND_DIR);
  console.log(`Found ${files.length} TypeScript files`);
  
  let fixedCount = 0;
  
  files.forEach(file => {
    try {
      const relativePath = path.relative(FRONTEND_DIR, file);
      console.log(`Processing: ${relativePath}`);
      
      const beforeCount = extractUnusedVariables(file).length;
      fixUnusedVariables(file);
      const afterCount = extractUnusedVariables(file).length;
      
      if (afterCount < beforeCount) {
        fixedCount += (beforeCount - afterCount);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Fixed ${fixedCount} unused variables`);
  console.log('🎉 Frontend cleanup completed!');
}

if (require.main === module) {
  main();
}

module.exports = {
  fixUnusedVariables,
  extractUnusedVariables,
  findTypeScriptFiles
};
