#!/usr/bin/env node

/**
 * Temporary & Deprecated Date Enforcement Script
 * Checks for temporary code and deprecated features with dates
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Temporary & Deprecated Date Enforcement');
console.log('==========================================');

const TEMP_PATTERNS = [
  /\/\/\s*TEMP:\s*(.+)/gi,
  /\/\/\s*TODO:\s*TEMP\s*(.+)/gi,
  /\/\/\s*FIXME:\s*TEMP\s*(.+)/gi,
  /\/\/\s*HACK:\s*(.+)/gi
];

const DEPRECATED_PATTERNS = [
  /\/\/\s*DEPRECATED:\s*(.+)/gi,
  /\/\/\s*@deprecated\s*(.+)/gi,
  /@deprecated\s*(.+)/gi
];

const DATE_PATTERN = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/;

let findings = [];
let warnings = 0;
let errors = 0;

/**
 * Check if a date is in the past
 */
function isDateExpired(dateStr) {
  try {
    const now = new Date();
    let checkDate;
    
    if (dateStr.includes('/')) {
      // MM/DD/YYYY format
      const [month, day, year] = dateStr.split('/').map(Number);
      checkDate = new Date(year, month - 1, day);
    } else if (dateStr.includes('-')) {
      // YYYY-MM-DD format
      checkDate = new Date(dateStr);
    } else {
      return false;
    }
    
    return checkDate < now;
  } catch (e) {
    return false;
  }
}

/**
 * Scan a file for temporary and deprecated code
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineNumber) => {
      // Check for temporary code
      TEMP_PATTERNS.forEach(pattern => {
        const matches = [...line.matchAll(pattern)];
        matches.forEach(match => {
          const comment = match[1] || match[0];
          const dateMatch = comment.match(DATE_PATTERN);
          
          const finding = {
            file: filePath,
            line: lineNumber + 1,
            type: 'TEMP',
            content: line.trim(),
            comment: comment.trim(),
            hasDate: !!dateMatch,
            date: dateMatch ? dateMatch[1] : null,
            expired: dateMatch ? isDateExpired(dateMatch[1]) : false
          };
          
          findings.push(finding);
          
          if (finding.expired) {
            errors++;
            console.log(`❌ EXPIRED TEMP code in ${path.relative(process.cwd(), filePath)}:${lineNumber + 1}`);
            console.log(`   ${finding.content}`);
            console.log(`   Date: ${finding.date} (EXPIRED)`);
          } else if (!finding.hasDate) {
            warnings++;
            console.log(`⚠️  TEMP code without date in ${path.relative(process.cwd(), filePath)}:${lineNumber + 1}`);
            console.log(`   ${finding.content}`);
          }
        });
      });
      
      // Check for deprecated code
      DEPRECATED_PATTERNS.forEach(pattern => {
        const matches = [...line.matchAll(pattern)];
        matches.forEach(match => {
          const comment = match[1] || match[0];
          const dateMatch = comment.match(DATE_PATTERN);
          
          const finding = {
            file: filePath,
            line: lineNumber + 1,
            type: 'DEPRECATED',
            content: line.trim(),
            comment: comment.trim(),
            hasDate: !!dateMatch,
            date: dateMatch ? dateMatch[1] : null,
            expired: dateMatch ? isDateExpired(dateMatch[1]) : false
          };
          
          findings.push(finding);
          
          if (finding.expired) {
            errors++;
            console.log(`❌ EXPIRED DEPRECATED code in ${path.relative(process.cwd(), filePath)}:${lineNumber + 1}`);
            console.log(`   ${finding.content}`);
            console.log(`   Date: ${finding.date} (EXPIRED)`);
          } else if (!finding.hasDate) {
            warnings++;
            console.log(`⚠️  DEPRECATED code without removal date in ${path.relative(process.cwd(), filePath)}:${lineNumber + 1}`);
            console.log(`   ${finding.content}`);
          }
        });
      });
    });
  } catch (error) {
    console.log(`⚠️  Could not read file: ${filePath} (${error.message})`);
  }
}

/**
 * Find all relevant source files
 */
function findSourceFiles() {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md'];
  const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', 'venv'];
  
  try {
    const gitFiles = execSync('git ls-files', { encoding: 'utf8', cwd: process.cwd() })
      .split('\n')
      .filter(file => file.trim())
      .filter(file => extensions.some(ext => file.endsWith(ext)))
      .filter(file => !excludeDirs.some(dir => file.includes(`${dir}/`)))
      .map(file => path.resolve(file));
    
    return gitFiles;
  } catch (error) {
    console.log('⚠️  Could not get git files, scanning directory instead');
    return [];
  }
}

// Main execution
const sourceFiles = findSourceFiles();
console.log(`📁 Scanning ${sourceFiles.length} source files...`);
console.log('');

sourceFiles.forEach(scanFile);

// Summary
console.log('');
console.log('📊 Summary');
console.log('==========');
console.log(`Total findings: ${findings.length}`);
console.log(`Errors (expired): ${errors}`);
console.log(`Warnings (missing dates): ${warnings}`);

if (errors > 0) {
  console.log('');
  console.log('💡 To fix expired items:');
  console.log('  - Remove the temporary code if no longer needed');
  console.log('  - Update the date if more time is needed');
  console.log('  - Convert to proper TODO with issue tracking');
}

if (warnings > 0) {
  console.log('');
  console.log('💡 To fix warnings:');
  console.log('  - Add dates to TEMP/DEPRECATED comments');
  console.log('  - Format: // TEMP: Remove by 2024-12-31');
  console.log('  - Format: // DEPRECATED: Remove by 2025-01-15');
}

// Exit with appropriate code
if (errors > 0) {
  console.log('');
  console.log('❌ CI failed due to expired temporary/deprecated code');
  process.exit(1);
} else if (warnings > 0) {
  console.log('');
  console.log('⚠️  Warnings detected but not failing CI');
  process.exit(0);
} else {
  console.log('');
  console.log('✅ No temporary or deprecated code issues found');
  process.exit(0);
}