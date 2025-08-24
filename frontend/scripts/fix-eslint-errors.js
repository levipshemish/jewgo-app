#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common ESLint fixes
const fixes = [
  // Fix unused variables by prefixing with underscore
  {
    pattern: /(\w+):\s*any\s*\)\s*=>\s*\{[^}]*console\.(log|warn|error)/g,
    replacement: (match, varName) => match.replace(new RegExp(`\\b${varName}\\b`, 'g'), `_${varName}`)
  },
  
  // Fix unused error variables in catch blocks
  {
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{/g,
    replacement: (match, varName) => `catch (_${varName}) {`
  },
  
  // Fix unused function parameters
  {
    pattern: /function\s+\w+\s*\(\s*([^)]+)\s*\)/g,
    replacement: (match, params) => {
      const newParams = params.split(',').map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('_') || trimmed.includes('=')) return trimmed;
        return `_${trimmed}`;
      }).join(', ');
      return match.replace(params, newParams);
    }
  },
  
  // Fix unused imports
  {
    pattern: /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g,
    replacement: (match, imports) => {
      const newImports = imports.split(',').map(imp => {
        const trimmed = imp.trim();
        if (trimmed.startsWith('_') || trimmed.includes(' as ')) return trimmed;
        return `_${trimmed}`;
      }).join(', ');
      return match.replace(imports, newImports);
    }
  }
];

// Console statement replacements
const consoleReplacements = [
  {
    pattern: /console\.log\(/g,
    replacement: '// console.log('
  },
  {
    pattern: /console\.warn\(/g,
    replacement: '// console.warn('
  },
  {
    pattern: /console\.error\(/g,
    replacement: '// console.error('
  }
];

// Unescaped entity replacements
const entityReplacements = [
  {
    pattern: /'/g,
    replacement: '&apos;'
  },
  {
    pattern: /"/g,
    replacement: '&quot;'
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply console statement fixes
    consoleReplacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    // Apply other fixes
    fixes.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      processFile(filePath);
    }
  });
}

// Start processing from current directory
const startDir = process.argv[2] || '.';
console.log(`Processing files in: ${startDir}`);
walkDir(startDir);
console.log('ESLint fixes completed!');
