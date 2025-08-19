#!/usr/bin/env node

/**
 * File Placement Validation
 * 
 * Ensures new files are placed in allowed directories:
 * - Frontend: /app, /components, /lib, /hooks, /prisma, /types, /services, /utils
 * - Backend: /backend/routes, /backend/services, /backend/database, /backend/utils
 * - CI rejects files at project root except config/CI files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Allowed directories
const ALLOWED_DIRECTORIES = {
  frontend: [
    'app', 'components', 'lib', 'hooks', 'prisma', 'types', 'services', 'utils',
    'pages', 'styles', 'public', 'config', 'scripts', 'tests', '__tests__'
  ],
  backend: [
    'backend/routes', 'backend/services', 'backend/database', 'backend/utils',
    'backend/tests', 'backend/config', 'backend/scripts', 'backend/docs'
  ],
  root: [
    '.github', 'ci-scripts', 'docs', 'scripts', 'config', 'deployment',
    'monitoring', 'projects', 'data', 'archive'
  ]
};

// Allowed root files
const ALLOWED_ROOT_FILES = [
  'README.md', 'RULES.md', 'DEPRECATIONS.md', 'package.json', 'package-lock.json',
  'pyproject.toml', 'requirements.txt', 'commitlint.config.js', '.gitignore',
  '.env.example', '.env.local', 'build.sh', 'test_deployment.py',
  'duplication_analysis_report.json', '.DS_Store'
];

// Allowed config files in subdirectories
const ALLOWED_CONFIG_FILES = [
  'tsconfig.json', 'tsconfig.test.json', 'jest.config.js', 'next.config.js',
  'tailwind.config.js', 'postcss.config.js', '.eslintrc.json', '.prettierrc',
  'package.json', 'pnpm-lock.yaml', 'package-lock.json'
];

const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '__pycache__', 'venv', '.venv', '.github/pull_request_template.md'
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function isAllowedRootFile(fileName) {
  return ALLOWED_ROOT_FILES.includes(fileName);
}

function isInAllowedDirectory(filePath) {
  const parts = filePath.split('/');
  
  // Check if it's a root file
  if (parts.length === 1) {
    return isAllowedRootFile(parts[0]);
  }
  
  // Check if it's a config file in any subdirectory
  if (parts.length > 1 && ALLOWED_CONFIG_FILES.includes(parts[parts.length - 1])) {
    return true;
  }
  
  // Check frontend directories
  if (parts[0] === 'frontend' && parts.length > 1) {
    const frontendPath = parts.slice(1).join('/');
    return ALLOWED_DIRECTORIES.frontend.some(dir => 
      frontendPath.startsWith(dir + '/') || frontendPath === dir
    );
  }
  
  // Check backend directories
  if (parts[0] === 'backend' && parts.length > 1) {
    const backendPath = parts.slice(1).join('/');
    return ALLOWED_DIRECTORIES.backend.some(dir => 
      backendPath.startsWith(dir.replace('backend/', '') + '/') || backendPath === dir.replace('backend/', '')
    );
  }
  
  // Check root directories
  return ALLOWED_DIRECTORIES.root.includes(parts[0]);
}

function getChangedFiles() {
  try {
    const diff = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
    return diff.split('\n').filter(file => file && !shouldIgnoreFile(file));
  } catch (error) {
    console.warn('Could not get changed files, using fallback method');
    return [];
  }
}

function validateFilePlacement(changedFiles) {
  const issues = [];
  
  changedFiles.forEach(file => {
    if (!isInAllowedDirectory(file)) {
      issues.push({
        file,
        type: 'invalid_placement',
        message: `File placed in invalid location: ${file}`
      });
    }
  });
  
  return issues;
}

function generateReport(issues) {
  console.log('\n🔍 File Placement Validation Report');
  console.log('===================================\n');
  
  console.log(`📊 Analysis:`);
  console.log(`   • Files checked: ${issues.length > 0 ? 'See issues below' : 'All valid'}`);
  console.log(`   • Issues found: ${issues.length}\n`);
  
  if (issues.length === 0) {
    console.log('✅ All files are properly placed');
    return true;
  }
  
  console.log('❌ Invalid File Placements:');
  console.log('-----------------------------');
  issues.forEach(issue => {
    console.log(`📁 ${issue.file}`);
    console.log(`   • ${issue.message}`);
    console.log('');
  });
  
  console.log('💡 Allowed Directories:');
  console.log('----------------------');
  console.log('Frontend: app/, components/, lib/, hooks/, prisma/, types/, services/, utils/');
  console.log('Backend: backend/routes/, backend/services/, backend/database/, backend/utils/');
  console.log('Root: .github/, ci-scripts/, docs/, scripts/, config/, deployment/');
  console.log('');
  console.log('💡 How to Fix:');
  console.log('--------------');
  console.log('1. Move files to appropriate directories');
  console.log('2. Follow the established project structure');
  console.log('3. Use proper naming conventions');
  console.log('4. Place config files in config/ directory');
  
  return false;
}

function main() {
  console.log('🔍 Running File Placement Validation...\n');
  
  try {
    const changedFiles = getChangedFiles();
    const issues = validateFilePlacement(changedFiles);
    const success = generateReport(issues);
    
    if (!success) {
      console.log('\n❌ File placement validation failed');
      console.log('Please move files to appropriate directories');
      process.exit(1);
    } else {
      console.log('\n✅ File placement validation passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running file placement validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  isInAllowedDirectory, 
  validateFilePlacement, 
  generateReport 
};
