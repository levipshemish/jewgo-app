#!/usr/bin/env node

/**
 * Duplication Prevention Enforcement
 * 
 * Scans PR diff for duplicate symbols:
 * - Detects duplicate function/class/interface names
 * - Allows override only if `// INTENTIONAL DUP` present with justification
 * - Fails CI if duplicates found without proper marking
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '__pycache__', 'venv', '.venv', 'docs/', 'README.md', 'RULES.md',
  'DEPRECATIONS.md', '.github/pull_request_template.md', 'ci-scripts/'
];

// Symbol patterns to detect
const SYMBOL_PATTERNS = {
  javascript: [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(?:export\s+)?class\s+(\w+)/g,
    /(?:export\s+)?interface\s+(\w+)/g,
    /(?:export\s+)?type\s+(\w+)/g,
    /(?:export\s+)?const\s+(\w+)\s*=/g,
    /(?:export\s+)?let\s+(\w+)\s*=/g,
    /(?:export\s+)?var\s+(\w+)\s*=/g
  ],
  python: [
    /def\s+(\w+)/g,
    /class\s+(\w+)/g,
    /async\s+def\s+(\w+)/g
  ]
};

// Intentional duplication markers
const INTENTIONAL_DUP_PATTERNS = [
  /\/\/\s*INTENTIONAL\s+DUP/i,
  /#\s*INTENTIONAL\s+DUP/i,
  /\/\*\s*INTENTIONAL\s+DUP/i
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) return 'javascript';
  if (['.py'].includes(ext)) return 'python';
  return null;
}

function extractSymbols(content, filePath) {
  const fileType = getFileType(filePath);
  if (!fileType) return [];
  
  const patterns = SYMBOL_PATTERNS[fileType];
  const symbols = [];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const symbolName = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      symbols.push({
        name: symbolName,
        line: lineNumber,
        file: filePath,
        type: fileType,
        fullMatch: match[0]
      });
    }
  });
  
  return symbols;
}

function checkIntentionalDup(content) {
  return INTENTIONAL_DUP_PATTERNS.some(pattern => pattern.test(content));
}

function getPRDiff() {
  try {
    // Get the diff for the current PR
    const diff = execSync('git diff HEAD~1', { encoding: 'utf8' });
    return diff;
  } catch (error) {
    console.warn('Could not get git diff, using fallback method');
    return '';
  }
}

function parseDiff(diff) {
  const files = [];
  const lines = diff.split('\n');
  let currentFile = null;
  
  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      const filePath = line.substring(6);
      if (!shouldIgnoreFile(filePath)) {
        currentFile = filePath;
        files.push({ path: filePath, additions: [] });
      }
    } else if (line.startsWith('+') && currentFile && !line.startsWith('+++')) {
      const addition = line.substring(1);
      const lastFile = files[files.length - 1];
      if (lastFile && lastFile.path === currentFile) {
        lastFile.additions.push(addition);
      }
    }
  }
  
  return files;
}

function analyzeDuplication(diffFiles) {
  const allSymbols = [];
  const newSymbols = [];
  const duplicates = [];
  
  // First, get all existing symbols in the repo
  try {
    const allFiles = execSync('find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.py" -type f', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file && !shouldIgnoreFile(file));
    
    allFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const symbols = extractSymbols(content, file);
        allSymbols.push(...symbols);
      } catch (err) {
        // Ignore files that can't be read
      }
    });
  } catch (err) {
    console.warn('Could not scan all files for existing symbols');
  }
  
  // Analyze new/changed files from diff
  diffFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const symbols = extractSymbols(content, file.path);
      const hasIntentionalDup = checkIntentionalDup(content);
      
      symbols.forEach(symbol => {
        newSymbols.push({
          ...symbol,
          hasIntentionalDup
        });
        
        // Check for duplicates
        const existingSymbols = allSymbols.filter(s => 
          s.name === symbol.name && s.file !== symbol.file
        );
        
        if (existingSymbols.length > 0) {
          duplicates.push({
            newSymbol: symbol,
            existingSymbols,
            hasIntentionalDup
          });
        }
      });
    } catch (err) {
      console.warn(`Could not analyze ${file.path}: ${err.message}`);
    }
  });
  
  return { newSymbols, duplicates };
}

function validateDuplication(duplicates) {
  const issues = [];
  
  duplicates.forEach(duplicate => {
    if (!duplicate.hasIntentionalDup) {
      issues.push({
        type: 'unintentional_duplicate',
        symbol: duplicate.newSymbol,
        existing: duplicate.existingSymbols,
        message: `Duplicate symbol "${duplicate.newSymbol.name}" found without INTENTIONAL DUP marker`
      });
    } else {
      issues.push({
        type: 'intentional_duplicate',
        symbol: duplicate.newSymbol,
        existing: duplicate.existingSymbols,
        message: `Intentional duplicate "${duplicate.newSymbol.name}" - ensure this is justified`
      });
    }
  });
  
  return issues;
}

function generateReport(newSymbols, duplicates, issues) {
  console.log('\n🔍 Duplication Prevention Report');
  console.log('================================\n');
  
  console.log(`📊 Analysis:`);
  console.log(`   • New symbols found: ${newSymbols.length}`);
  console.log(`   • Duplicates detected: ${duplicates.length}`);
  console.log(`   • Issues found: ${issues.length}\n`);
  
  if (issues.length === 0) {
    console.log('✅ No duplication issues detected');
    return true;
  }
  
  const unintentionalDups = issues.filter(issue => issue.type === 'unintentional_duplicate');
  const intentionalDups = issues.filter(issue => issue.type === 'intentional_duplicate');
  
  if (unintentionalDups.length > 0) {
    console.log('❌ Unintentional Duplicates:');
    console.log('------------------------------');
    unintentionalDups.forEach(issue => {
      console.log(`📁 ${issue.symbol.file}:${issue.symbol.line}`);
      console.log(`   Symbol: ${issue.symbol.name} (${issue.symbol.type})`);
      console.log(`   Conflicts with:`);
      issue.existing.forEach(existing => {
        console.log(`     • ${existing.file}:${existing.line}`);
      });
      console.log(`   ⚠️  Add "// INTENTIONAL DUP" with justification if this is intentional`);
      console.log('');
    });
  }
  
  if (intentionalDups.length > 0) {
    console.log('⚠️  Intentional Duplicates:');
    console.log('---------------------------');
    intentionalDups.forEach(issue => {
      console.log(`📁 ${issue.symbol.file}:${issue.symbol.line}`);
      console.log(`   Symbol: ${issue.symbol.name} (${issue.symbol.type})`);
      console.log(`   ✅ Marked as intentional duplicate`);
      console.log('');
    });
  }
  
  // Recommendations
  console.log('💡 How to Fix:');
  console.log('--------------');
  console.log('1. Refactor to reuse existing symbols when possible');
  console.log('2. If duplication is intentional, add:');
  console.log('   // INTENTIONAL DUP: <justification>');
  console.log('3. Consider creating shared utilities/components');
  console.log('4. Document why duplication is necessary');
  
  // Return success if only intentional duplicates
  const hasUnintentionalDups = unintentionalDups.length > 0;
  return !hasUnintentionalDups;
}

function main() {
  console.log('🔍 Running Duplication Prevention Check...\n');
  
  try {
    // Get PR diff
    const diff = getPRDiff();
    const diffFiles = parseDiff(diff);
    
    // Analyze duplication
    const { newSymbols, duplicates } = analyzeDuplication(diffFiles);
    
    // Validate duplication
    const issues = validateDuplication(duplicates);
    
    // Generate report
    const success = generateReport(newSymbols, duplicates, issues);
    
    if (!success) {
      console.log('\n❌ Duplication prevention check failed');
      console.log('Please fix unintentional duplicates before merging');
      process.exit(1);
    } else {
      console.log('\n✅ Duplication prevention check passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running duplication prevention check:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  extractSymbols, 
  analyzeDuplication, 
  validateDuplication, 
  generateReport 
};
