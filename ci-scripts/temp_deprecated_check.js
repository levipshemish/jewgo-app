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
      
              // Check for DEPRECATED markers (skip examples and documentation comments)
        if (line.includes('// DEPRECATED:') && !line.includes('Example') && !line.includes('* - New // DEPRECATED:')) {
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

  }
  
  return files;
}

// Find and process all relevant files
const files = findFiles(targetDir, FILE_EXTENSIONS);

files.forEach(processFile);

// Report findings

if (findings.temporary.valid.length > 0) {

  findings.temporary.valid.forEach(item => {

  });
}

if (findings.temporary.expired.length > 0) {
  console.log('\n❌ EXPIRED TEMPORARY code (must be cleaned up):');
  findings.temporary.expired.forEach(item => {

  });
}

if (findings.temporary.missingDeadlines.length > 0) {

  findings.temporary.missingDeadlines.forEach(item => {

  });
}

if (findings.deprecated.valid.length > 0) {

  findings.deprecated.valid.forEach(item => {

  });
}

if (findings.deprecated.expired.length > 0) {
  console.log('\n❌ EXPIRED DEPRECATED code (must be removed):');
  findings.deprecated.expired.forEach(item => {

  });
}

if (findings.deprecated.missingDeadlines.length > 0) {

  findings.deprecated.missingDeadlines.forEach(item => {

  });
}

// Summary and exit

const totalExpired = findings.temporary.expired.length + findings.deprecated.expired.length;
const totalMissing = findings.temporary.missingDeadlines.length + findings.deprecated.missingDeadlines.length;

if (totalExpired > 0) {

  process.exit(1);
}

if (totalMissing > 0) {

  console.log('💡 Add proper ISO date deadlines (YYYY-MM-DD)');
}

if (totalExpired === 0 && totalMissing === 0) {

}
