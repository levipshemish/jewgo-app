#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Files to skip from cleanup
const SKIP_FILES = [
  'node_modules',
  '.next',
  '.git',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
];

// Only remove console.log, console.debug, console.info statements
const CONSOLE_PATTERNS = [
  // Remove console.log statements
  {
    pattern: /^\s*console\.log\([^)]*\);?\s*$/gm,
    replacement: ''
  },
  // Remove console.debug statements
  {
    pattern: /^\s*console\.debug\([^)]*\);?\s*$/gm,
    replacement: ''
  },
  // Remove console.info statements
  {
    pattern: /^\s*console\.info\([^)]*\);?\s*$/gm,
    replacement: ''
  },
  // Remove commented console statements
  {
    pattern: /^\s*\/\/\s*console\.(log|debug|info)\([^)]*\);?\s*$/gm,
    replacement: ''
  }
];

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let hasChanges = false;

    CONSOLE_PATTERNS.forEach(({ pattern, replacement }) => {
      const newContent = modifiedContent.replace(pattern, replacement);
      if (newContent !== modifiedContent) {
        hasChanges = true;
        modifiedContent = newContent;
      }
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ Cleaned: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !shouldSkipFile(filePath)) {
      walkDirectory(filePath);
    } else if (stat.isFile() && (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.jsx'))) {
      processFile(filePath);
    }
  });
}

console.log('🧹 Starting conservative console log cleanup...');
console.log(`📁 Processing: ${FRONTEND_DIR}`);

walkDirectory(FRONTEND_DIR);

console.log('\n🔍 Running lint check...');
try {
  execSync('npm run lint -- --max-warnings=0', { 
    cwd: FRONTEND_DIR, 
    stdio: 'inherit' 
  });
  console.log('✅ Lint check passed!');
} catch (error) {
  console.log('⚠️  Lint check found issues. Please review manually.');
}

console.log('\n✨ Cleanup complete!');
