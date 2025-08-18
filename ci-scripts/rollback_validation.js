#!/usr/bin/env node

/**
 * Rollback Script Validation
 * 
 * Ensures migration PRs include rollback scripts:
 * - Migration PRs must include rollback.sql or rollback migration file
 * - CI fails if migration PRs lack rollback scripts
 * - Validates rollback script format and content
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MIGRATION_PATTERNS = [
  /migration/i,
  /migrate/i,
  /schema.*change/i,
  /database.*change/i,
  /alter.*table/i,
  /create.*table/i,
  /drop.*table/i,
  /add.*column/i,
  /remove.*column/i
];

const ROLLBACK_PATTERNS = [
  /rollback/i,
  /revert/i,
  /undo/i,
  /down/i
];

const MIGRATION_FILE_PATTERNS = [
  /.*migration.*\.sql$/i,
  /.*migration.*\.py$/i,
  /.*migrate.*\.sql$/i,
  /.*migrate.*\.py$/i,
  /.*schema.*\.sql$/i,
  /.*schema.*\.py$/i
];

const ROLLBACK_FILE_PATTERNS = [
  /.*rollback.*\.sql$/i,
  /.*rollback.*\.py$/i,
  /.*revert.*\.sql$/i,
  /.*revert.*\.py$/i,
  /.*undo.*\.sql$/i,
  /.*undo.*\.py$/i,
  /.*down.*\.sql$/i,
  /.*down.*\.py$/i
];

const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '__pycache__', 'venv', '.venv', 'docs/', 'README.md', 'RULES.md',
  'DEPRECATIONS.md', '.github/pull_request_template.md', 'ci-scripts/'
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function isMigrationPR(prDescription, changedFiles) {
  // Check PR description for migration keywords
  const descriptionHasMigration = MIGRATION_PATTERNS.some(pattern => 
    pattern.test(prDescription)
  );
  
  // Check changed files for migration patterns
  const hasMigrationFiles = changedFiles.some(file => 
    MIGRATION_FILE_PATTERNS.some(pattern => pattern.test(file)) ||
    MIGRATION_PATTERNS.some(pattern => pattern.test(file))
  );
  
  return descriptionHasMigration || hasMigrationFiles;
}

function hasRollbackScript(changedFiles) {
  // Check for rollback files
  const hasRollbackFile = changedFiles.some(file => 
    ROLLBACK_FILE_PATTERNS.some(pattern => pattern.test(file))
  );
  
  // Check for rollback content in migration files
  const hasRollbackContent = changedFiles.some(file => {
    if (shouldIgnoreFile(file)) return false;
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      return ROLLBACK_PATTERNS.some(pattern => pattern.test(content));
    } catch (err) {
      return false;
    }
  });
  
  return hasRollbackFile || hasRollbackContent;
}

function validateRollbackScript(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for basic rollback content
    if (!ROLLBACK_PATTERNS.some(pattern => pattern.test(content))) {
      issues.push('No rollback keywords found in file');
    }
    
    // Check for SQL rollback statements
    const sqlRollbackPatterns = [
      /DROP\s+TABLE/i,
      /ALTER\s+TABLE.*DROP/i,
      /DELETE\s+FROM/i,
      /ROLLBACK/i,
      /REVERT/i
    ];
    
    const hasSqlRollback = sqlRollbackPatterns.some(pattern => pattern.test(content));
    if (!hasSqlRollback && filePath.endsWith('.sql')) {
      issues.push('SQL rollback file should contain DROP, ALTER, DELETE, or ROLLBACK statements');
    }
    
    // Check for Python rollback functions
    const pythonRollbackPatterns = [
      /def.*rollback/i,
      /def.*revert/i,
      /def.*down/i,
      /def.*undo/i
    ];
    
    const hasPythonRollback = pythonRollbackPatterns.some(pattern => pattern.test(content));
    if (!hasPythonRollback && filePath.endsWith('.py')) {
      issues.push('Python rollback file should contain rollback/revert/down/undo functions');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  } catch (err) {
    return {
      isValid: false,
      issues: [`Could not read file: ${err.message}`]
    };
  }
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

function getPRDescription() {
  try {
    if (process.env.GITHUB_EVENT_PATH) {
      const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      return eventData.pull_request?.body || '';
    }
  } catch (err) {
    console.warn('Could not read PR description from GitHub event');
  }
  
  return '';
}

function analyzeMigrationPR(changedFiles, prDescription) {
  const isMigration = isMigrationPR(prDescription, changedFiles);
  const hasRollback = hasRollbackScript(changedFiles);
  
  const rollbackFiles = changedFiles.filter(file => 
    ROLLBACK_FILE_PATTERNS.some(pattern => pattern.test(file))
  );
  
  const rollbackValidations = rollbackFiles.map(file => ({
    file,
    validation: validateRollbackScript(file)
  }));
  
  return {
    isMigration,
    hasRollback,
    rollbackFiles,
    rollbackValidations
  };
}

function generateReport(analysis) {
  console.log('\n🔍 Rollback Script Validation Report');
  console.log('====================================\n');
  
  console.log(`📊 Analysis:`);
  console.log(`   • Is migration PR: ${analysis.isMigration ? 'Yes' : 'No'}`);
  console.log(`   • Has rollback script: ${analysis.hasRollback ? 'Yes' : 'No'}`);
  console.log(`   • Rollback files found: ${analysis.rollbackFiles.length}\n`);
  
  if (!analysis.isMigration) {
    console.log('✅ Not a migration PR - rollback validation not required');
    return true;
  }
  
  if (!analysis.hasRollback) {
    console.log('❌ Migration PR detected but no rollback script found');
    console.log('');
    console.log('💡 How to Fix:');
    console.log('--------------');
    console.log('1. Create a rollback.sql file with reverse operations');
    console.log('2. Or add rollback functions to migration Python files');
    console.log('3. Include DROP, ALTER, DELETE, or ROLLBACK statements');
    console.log('4. Test rollback script in staging environment');
    console.log('5. Update PR template checkbox: "Rollback tested in staging"');
    return false;
  }
  
  // Validate rollback files
  const invalidRollbacks = analysis.rollbackValidations.filter(v => !v.validation.isValid);
  
  if (invalidRollbacks.length > 0) {
    console.log('❌ Invalid Rollback Scripts:');
    console.log('------------------------------');
    invalidRollbacks.forEach(rollback => {
      console.log(`📁 ${rollback.file}:`);
      rollback.validation.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
      console.log('');
    });
  }
  
  if (analysis.rollbackValidations.length > 0) {
    console.log('✅ Valid Rollback Scripts:');
    console.log('---------------------------');
    analysis.rollbackValidations.forEach(rollback => {
      if (rollback.validation.isValid) {
        console.log(`📁 ${rollback.file} - Valid`);
      }
    });
    console.log('');
  }
  
  // Recommendations
  console.log('💡 Best Practices:');
  console.log('------------------');
  console.log('1. Test rollback scripts in staging before merging');
  console.log('2. Include both forward and backward migrations');
  console.log('3. Document rollback procedures in PR description');
  console.log('4. Ensure rollback scripts are idempotent');
  console.log('5. Consider data preservation during rollbacks');
  
  return invalidRollbacks.length === 0;
}

function main() {
  console.log('🔍 Running Rollback Script Validation...\n');
  
  try {
    const changedFiles = getChangedFiles();
    const prDescription = getPRDescription();
    
    const analysis = analyzeMigrationPR(changedFiles, prDescription);
    const success = generateReport(analysis);
    
    if (!success) {
      console.log('\n❌ Rollback validation failed');
      console.log('Please add proper rollback scripts before merging');
      process.exit(1);
    } else {
      console.log('\n✅ Rollback validation passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running rollback validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  isMigrationPR, 
  hasRollbackScript, 
  validateRollbackScript, 
  analyzeMigrationPR, 
  generateReport 
};
