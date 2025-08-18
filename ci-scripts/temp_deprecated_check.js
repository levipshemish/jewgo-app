#!/usr/bin/env node

/**
 * Temporary & Deprecated Code Date Enforcement
 * 
 * Parses TEMPORARY and DEPRECATED markers with ISO dates and compares against current date.
 * Enforces cleanup deadlines and removal targets.
 * 
 * Usage: node temp_deprecated_check.js [directory]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEMPORARY_MAX_DAYS = 7;
const DEPRECATED_MAX_DAYS = 30;
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py'];
const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
  '__pycache__', 'venv', '.venv', 'docs/', 'README.md', 'RULES.md', 
  'DEPRECATIONS.md', '.github/pull_request_template.md'
];

// ISO date regex pattern
const ISO_DATE_REGEX = /(\d{4}-\d{2}-\d{2})/;

console.log('📅 Temporary & Deprecated Code Date Enforcement');
console.log('===============================================');

// Parse command line arguments
const targetDir = process.argv[2] || '.';

// Track findings
const findings = {
  temporary: {
    expired: [],
    missingDeadlines: [],
    valid: []
  },
  deprecated: {
    expired: [],
    missingDeadlines: [],
    valid: []
  }
};

// Get current date
const currentDate = new Date();
const currentDateStr = currentDate.toISOString().split('T')[0];

console.log(`Current date: ${currentDateStr}`);
console.log('');

/**
 * Parse ISO date from comment line
 */
function parseISODate(commentLine) {
  const match = commentLine.match(ISO_DATE_REGEX);
  return match ? match[1] : null;
}

/**
 * Calculate days between two ISO dates
 */
function daysBetween(date1Str, date2Str) {
  const date1 = new Date(date1Str);
  const date2 = new Date(date2Str);
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is expired
 */
function isExpired(deadlineStr) {
  return new Date(deadlineStr) < currentDate;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineNum) => {
              // Check for TEMPORARY markers (skip examples in comments)
        if (line.includes('// TEMPORARY:') && !line.includes('Example')) {
          const deadline = parseISODate(line);
          
          if (!deadline) {
            findings.temporary.missingDeadlines.push({
              file: filePath,
              line: lineNum + 1,
              comment: line.trim()
            });
          } else if (isExpired(deadline)) {
            findings.temporary.expired.push({
              file: filePath,
              line: lineNum + 1,
              deadline,
              comment: line.trim()
            });
          } else {
            const daysRemaining = daysBetween(currentDateStr, deadline);
            findings.temporary.valid.push({
              file: filePath,
              line: lineNum + 1,
              deadline,
              daysRemaining,
              comment: line.trim()
            });
          }
        }
      
              // Check for DEPRECATED markers (skip examples in comments)
        if (line.includes('// DEPRECATED:') && !line.includes('Example')) {
          const deadline = parseISODate(line);
          
          if (!deadline) {
            findings.deprecated.missingDeadlines.push({
              file: filePath,
              line: lineNum + 1,
              comment: line.trim()
            });
          } else if (isExpired(deadline)) {
            findings.deprecated.expired.push({
              file: filePath,
              line: lineNum + 1,
              deadline,
              comment: line.trim()
            });
          } else {
            const daysRemaining = daysBetween(currentDateStr, deadline);
            findings.deprecated.valid.push({
              file: filePath,
              line: lineNum + 1,
              deadline,
              daysRemaining,
              comment: line.trim()
            });
          }
        }
    });
  } catch (error) {
    console.log(`⚠️  Could not read file: ${filePath} - ${error.message}`);
  }
}

/**
 * Recursively find files with specified extensions
 */
function findFiles(dir, extensions) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip ignored directories
        if (!IGNORE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
          files.push(...findFiles(fullPath, extensions));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext) && !IGNORE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not read directory: ${dir} - ${error.message}`);
  }
  
  return files;
}

// Find and process all relevant files
const files = findFiles(targetDir, FILE_EXTENSIONS);
console.log(`Scanning ${files.length} files for TEMPORARY and DEPRECATED markers...`);
console.log('');

files.forEach(processFile);

// Report findings
console.log('📊 TEMPORARY Code Analysis');
console.log('---------------------------');
console.log(`Total TEMPORARY markers: ${findings.temporary.valid.length + findings.temporary.expired.length + findings.temporary.missingDeadlines.length}`);
console.log(`Valid (not expired): ${findings.temporary.valid.length}`);
console.log(`Expired: ${findings.temporary.expired.length}`);
console.log(`Missing deadlines: ${findings.temporary.missingDeadlines.length}`);

if (findings.temporary.valid.length > 0) {
  console.log('\n✅ Valid TEMPORARY code:');
  findings.temporary.valid.forEach(item => {
    console.log(`  ${item.file}:${item.line} - expires in ${item.daysRemaining} days (${item.deadline})`);
  });
}

if (findings.temporary.expired.length > 0) {
  console.log('\n❌ EXPIRED TEMPORARY code (must be cleaned up):');
  findings.temporary.expired.forEach(item => {
    console.log(`  ${item.file}:${item.line} - expired on ${item.deadline}`);
  });
}

if (findings.temporary.missingDeadlines.length > 0) {
  console.log('\n⚠️  TEMPORARY code missing deadlines:');
  findings.temporary.missingDeadlines.forEach(item => {
    console.log(`  ${item.file}:${item.line} - add 'Cleanup by: YYYY-MM-DD'`);
  });
}

console.log('\n📊 DEPRECATED Code Analysis');
console.log('---------------------------');
console.log(`Total DEPRECATED markers: ${findings.deprecated.valid.length + findings.deprecated.expired.length + findings.deprecated.missingDeadlines.length}`);
console.log(`Valid (not expired): ${findings.deprecated.valid.length}`);
console.log(`Expired: ${findings.deprecated.expired.length}`);
console.log(`Missing deadlines: ${findings.deprecated.missingDeadlines.length}`);

if (findings.deprecated.valid.length > 0) {
  console.log('\n✅ Valid DEPRECATED code:');
  findings.deprecated.valid.forEach(item => {
    console.log(`  ${item.file}:${item.line} - remove in ${item.daysRemaining} days (${item.deadline})`);
  });
}

if (findings.deprecated.expired.length > 0) {
  console.log('\n❌ EXPIRED DEPRECATED code (must be removed):');
  findings.deprecated.expired.forEach(item => {
    console.log(`  ${item.file}:${item.line} - expired on ${item.deadline}`);
  });
}

if (findings.deprecated.missingDeadlines.length > 0) {
  console.log('\n⚠️  DEPRECATED code missing deadlines:');
  findings.deprecated.missingDeadlines.forEach(item => {
    console.log(`  ${item.file}:${item.line} - add 'Removal target: YYYY-MM-DD'`);
  });
}

// Summary and exit
console.log('\n📋 Summary');
console.log('-----------');

const totalExpired = findings.temporary.expired.length + findings.deprecated.expired.length;
const totalMissing = findings.temporary.missingDeadlines.length + findings.deprecated.missingDeadlines.length;

if (totalExpired > 0) {
  console.log(`❌ FAIL: ${totalExpired} expired items must be cleaned up`);
  console.log('💡 Clean up expired TEMPORARY/DEPRECATED code before merging');
  process.exit(1);
}

if (totalMissing > 0) {
  console.log(`⚠️  WARNING: ${totalMissing} items missing deadlines`);
  console.log('💡 Add proper ISO date deadlines (YYYY-MM-DD)');
}

if (totalExpired === 0 && totalMissing === 0) {
  console.log('✅ All TEMPORARY and DEPRECATED code has valid deadlines');
}
