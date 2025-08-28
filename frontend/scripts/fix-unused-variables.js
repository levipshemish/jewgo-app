#!/usr/bin/env node

/**
 * Script to help identify and fix unused variables systematically
 * This script analyzes ESLint output and provides actionable fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runLint() {
  try {
    const output = execSync('npm run lint 2>&1', { encoding: 'utf8' });
    return output;
  } catch (error) {
    return error.stdout || error.stderr || error.message;
  }
}

function parseLintOutput(output) {
  const lines = output.split('\n');
  const issues = [];
  
  for (const line of lines) {
    // Match ESLint error/warning lines
    const match = line.match(/^\.\/([^:]+):(\d+):(\d+)\s+(Error|Warning):\s+(.+)$/);
    if (match) {
      const [, file, lineNum, col, type, message] = match;
      issues.push({
        file: file.replace(/^\.\//, ''),
        line: parseInt(lineNum),
        column: parseInt(col),
        type,
        message
      });
    }
  }
  
  return issues;
}

function categorizeIssues(issues) {
  const categories = {
    missingReact: [],
    missingTypes: [],
    unusedVariables: [],
    variableShadowing: [],
    other: []
  };
  
  for (const issue of issues) {
    if (issue.message.includes("'React' is not defined")) {
      categories.missingReact.push(issue);
    } else if (issue.message.includes("'NodeJS' is not defined") || 
               issue.message.includes("'google' is not defined") ||
               issue.message.includes("'RequestInit' is not defined")) {
      categories.missingTypes.push(issue);
    } else if (issue.message.includes("is defined but never used")) {
      categories.unusedVariables.push(issue);
    } else if (issue.message.includes("is already declared")) {
      categories.variableShadowing.push(issue);
    } else {
      categories.other.push(issue);
    }
  }
  
  return categories;
}

function generateFixSuggestions(categories) {
  const suggestions = [];
  
  // Missing React imports
  if (categories.missingReact.length > 0) {
    const files = [...new Set(categories.missingReact.map(i => i.file))];
    suggestions.push({
      type: 'Missing React Imports',
      count: categories.missingReact.length,
      files,
      fix: `Add "import React from 'react';" to the top of these files: ${files.join(', ')}`
    });
  }
  
  // Missing type definitions
  if (categories.missingTypes.length > 0) {
    const nodejsFiles = categories.missingTypes.filter(i => i.message.includes("'NodeJS'")).map(i => i.file);
    const googleFiles = categories.missingTypes.filter(i => i.message.includes("'google'")).map(i => i.file);
    
    if (nodejsFiles.length > 0) {
      suggestions.push({
        type: 'Missing NodeJS Types',
        count: nodejsFiles.length,
        files: [...new Set(nodejsFiles)],
        fix: `Add "/// <reference types=\"node\" />" to the top of these files: ${[...new Set(nodejsFiles)].join(', ')}`
      });
    }
    
    if (googleFiles.length > 0) {
      suggestions.push({
        type: 'Missing Google Maps Types',
        count: googleFiles.length,
        files: [...new Set(googleFiles)],
        fix: `Add "/// <reference types=\"@types/google.maps\" />" to the top of these files: ${[...new Set(googleFiles)].join(', ')}`
      });
    }
  }
  
  // Unused variables
  if (categories.unusedVariables.length > 0) {
    suggestions.push({
      type: 'Unused Variables',
      count: categories.unusedVariables.length,
      files: [...new Set(categories.unusedVariables.map(i => i.file))],
      fix: 'Prefix unused variables with "_" or remove them completely'
    });
  }
  
  // Variable shadowing
  if (categories.variableShadowing.length > 0) {
    suggestions.push({
      type: 'Variable Shadowing',
      count: categories.variableShadowing.length,
      files: [...new Set(categories.variableShadowing.map(i => i.file))],
      fix: 'Rename shadowed variables to avoid conflicts'
    });
  }
  
  return suggestions;
}

function main() {
  log('🔍 Analyzing ESLint issues...', 'blue');
  
  const lintOutput = runLint();
  const issues = parseLintOutput(lintOutput);
  const categories = categorizeIssues(issues);
  const suggestions = generateFixSuggestions(categories);
  
  log(`\n📊 Found ${issues.length} total issues:`, 'cyan');
  log(`  • Missing React imports: ${categories.missingReact.length}`, 'yellow');
  log(`  • Missing type definitions: ${categories.missingTypes.length}`, 'yellow');
  log(`  • Unused variables: ${categories.unusedVariables.length}`, 'yellow');
  log(`  • Variable shadowing: ${categories.variableShadowing.length}`, 'yellow');
  log(`  • Other issues: ${categories.other.length}`, 'yellow');
  
  if (suggestions.length > 0) {
    log('\n💡 Fix Suggestions:', 'green');
    suggestions.forEach((suggestion, index) => {
      log(`\n${index + 1}. ${suggestion.type} (${suggestion.count} issues):`, 'magenta');
      log(`   ${suggestion.fix}`, 'cyan');
      if (suggestion.files.length <= 5) {
        log(`   Files: ${suggestion.files.join(', ')}`, 'yellow');
      } else {
        log(`   Files: ${suggestion.files.slice(0, 5).join(', ')}... and ${suggestion.files.length - 5} more`, 'yellow');
      }
    });
  }
  
  // Priority recommendations
  log('\n🎯 Priority Fix Order:', 'green');
  log('1. Fix missing React imports (prevents compilation errors)', 'cyan');
  log('2. Fix missing type definitions (prevents type errors)', 'cyan');
  log('3. Fix variable shadowing (prevents runtime issues)', 'cyan');
  log('4. Fix unused variables (improves code quality)', 'cyan');
  
  log('\n✅ Run "./scripts/lint-fix.sh" to auto-fix some issues', 'green');
  log('📝 Use "npm run lint:fix" for more auto-fixable issues', 'green');
}

if (require.main === module) {
  main();
}

module.exports = { runLint, parseLintOutput, categorizeIssues, generateFixSuggestions };
