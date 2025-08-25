#!/usr/bin/env node

/**
 * Apply Logging Standards
 * =======================
 * 
 * This script applies the unified logging system to existing scripts
 * by replacing console.log statements with structured logging and
 * adding progress tracking capabilities.
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger } = require('./utils/logger');

// Scripts to update with logging standards
const SCRIPTS_TO_UPDATE = [
  'validate-env-unified.js',
  'deploy-setup.js',
  'deploy-validate.js',
  'setup-supabase-storage.js',
  'validate-css.js',
  'remove-console-logs.js',
  'health-monitor.js',
  'check-environment.js',
  'clear-cache.js',
  'fix-font-css.js',
  'setup-env.js',
  'replace-original-images.js',
  'cleanup-unused-vars.js',
  'cleanup-remaining-vars.js',
  'update-hours-cron.js',
  'setup-monitoring.js',
  'check-auth.js',
  'rotate-logs.js',
  'aggregate-metrics.js'
];

// Logging import statement
const LOGGER_IMPORT = `
const { defaultLogger } = require('./utils/logger');
`;

// Console replacement patterns
const CONSOLE_REPLACEMENTS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'defaultLogger.info(',
    description: 'console.log → defaultLogger.info'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'defaultLogger.error(',
    description: 'console.error → defaultLogger.error'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'defaultLogger.warn(',
    description: 'console.warn → defaultLogger.warn'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'defaultLogger.info(',
    description: 'console.info → defaultLogger.info'
  }
];

// Progress tracking patterns
const PROGRESS_PATTERNS = [
  {
    pattern: /for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*(\w+)\.length;\s*i\+\+\)/g,
    replacement: (match, arrayName) => {
      return `defaultLogger.startProgress(${arrayName}.length, 'Processing ${arrayName}');
for (let i = 0; i < ${arrayName}.length; i++) {
  defaultLogger.updateProgress(i + 1, \`Processing \${${arrayName}[i]}\`);`;
    },
    description: 'Add progress tracking to for loops'
  },
  {
    pattern: /(\w+)\.forEach\s*\(\s*\([^)]*\)\s*=>\s*\{/g,
    replacement: (match, arrayName) => {
      return `defaultLogger.startProgress(${arrayName}.length, 'Processing ${arrayName}');
let progressCounter = 0;
${arrayName}.forEach((item, index) => {
  progressCounter++;
  defaultLogger.updateProgress(progressCounter, \`Processing item \${index + 1}\`);`;
    },
    description: 'Add progress tracking to forEach loops'
  }
];

// Section header patterns
const SECTION_PATTERNS = [
  {
    pattern: /console\.log\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    replacement: (match, title) => {
      if (title.includes('===') || title.includes('---')) {
        return `defaultLogger.section('${title.replace(/[=-]/g, '').trim()}')`;
      }
      return match;
    },
    description: 'Convert section headers to structured logging'
  }
];

/**
 * Check if file already has logging standards
 */
function hasLoggingStandards(content) {
  return content.includes('defaultLogger') || 
         content.includes('require(\'./utils/logger\')') ||
         content.includes('startProgress') ||
         content.includes('updateProgress');
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // Find the first require statement
  const requireMatch = content.match(/^const\s+\w+\s*=\s*require\s*\(/m);
  
  if (requireMatch) {
    // Add after the first require
    const insertIndex = content.indexOf(requireMatch[0]) + requireMatch[0].length;
    const beforeRequire = content.substring(0, insertIndex);
    const afterRequire = content.substring(insertIndex);
    
    // Find the end of the require statement
    const requireEndIndex = afterRequire.indexOf(';') + 1;
    const requireStatement = afterRequire.substring(0, requireEndIndex);
    const restOfContent = afterRequire.substring(requireEndIndex);
    
    return beforeRequire + requireStatement + LOGGER_IMPORT + restOfContent;
  } else {
    // Add at the beginning if no require statements
    return LOGGER_IMPORT + '\n' + content;
  }
}

/**
 * Replace console statements with structured logging
 */
function replaceConsoleStatements(content) {
  let updatedContent = content;
  let replacements = 0;
  
  CONSOLE_REPLACEMENTS.forEach(({ pattern, replacement, description }) => {
    const matches = updatedContent.match(pattern);
    if (matches) {
      updatedContent = updatedContent.replace(pattern, replacement);
      replacements += matches.length;
    }
  });
  
  return { content: updatedContent, replacements };
}

/**
 * Add progress tracking to loops
 */
function addProgressTracking(content) {
  let updatedContent = content;
  let additions = 0;
  
  PROGRESS_PATTERNS.forEach(({ pattern, replacement, description }) => {
    const matches = updatedContent.match(pattern);
    if (matches) {
      updatedContent = updatedContent.replace(pattern, replacement);
      additions += matches.length;
    }
  });
  
  return { content: updatedContent, additions };
}

/**
 * Convert section headers to structured logging
 */
function convertSectionHeaders(content) {
  let updatedContent = content;
  let conversions = 0;
  
  SECTION_PATTERNS.forEach(({ pattern, replacement, description }) => {
    const matches = updatedContent.match(pattern);
    if (matches) {
      updatedContent = updatedContent.replace(pattern, replacement);
      conversions += matches.length;
    }
  });
  
  return { content: updatedContent, conversions };
}

/**
 * Add completion logging to main functions
 */
function addCompletionLogging(content) {
  // Look for main function patterns
  const mainPatterns = [
    /function\s+main\s*\(/g,
    /const\s+main\s*=\s*async\s*\(/g,
    /const\s+main\s*=\s*\(/g
  ];
  
  let updatedContent = content;
  let additions = 0;
  
  mainPatterns.forEach(pattern => {
    const matches = updatedContent.match(pattern);
    if (matches) {
      // Add completion logging at the end of main function
      const mainEndPattern = /(\}\s*$)/;
      if (mainEndPattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(mainEndPattern, 
          '  defaultLogger.success("Script completed successfully");\n$1');
        additions++;
      }
    }
  });
  
  return { content: updatedContent, additions };
}

/**
 * Add error handling with logging
 */
function addErrorLogging(content) {
  // Look for try-catch blocks and add logging
  const tryCatchPattern = /try\s*\{([^}]+)\}\s*catch\s*\(([^)]+)\)\s*\{/g;
  
  let updatedContent = content;
  let additions = 0;
  
  updatedContent = updatedContent.replace(tryCatchPattern, (match, tryBlock, errorVar) => {
    additions++;
    return `try {${tryBlock}} catch (${errorVar}) {
  defaultLogger.error(\`Script failed: \${${errorVar}.message}\`, { error: ${errorVar} });
  throw ${errorVar};`;
  });
  
  return { content: updatedContent, additions };
}

/**
 * Update a single script with logging standards
 */
function updateScriptWithLogging(scriptPath) {
  try {
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Skip if already has logging standards
    if (hasLoggingStandards(content)) {
      defaultLogger.warn(`${path.basename(scriptPath)}: Already has logging standards`);
      return { updated: false, reason: 'Already has logging standards' };
    }
    
    let updatedContent = content;
    let totalChanges = 0;
    
    // Add logger import
    updatedContent = addLoggerImport(updatedContent);
    totalChanges++;
    
    // Replace console statements
    const consoleResult = replaceConsoleStatements(updatedContent);
    updatedContent = consoleResult.content;
    totalChanges += consoleResult.replacements;
    
    // Add progress tracking
    const progressResult = addProgressTracking(updatedContent);
    updatedContent = progressResult.content;
    totalChanges += progressResult.additions;
    
    // Convert section headers
    const sectionResult = convertSectionHeaders(updatedContent);
    updatedContent = sectionResult.content;
    totalChanges += sectionResult.conversions;
    
    // Add completion logging
    const completionResult = addCompletionLogging(updatedContent);
    updatedContent = completionResult.content;
    totalChanges += completionResult.additions;
    
    // Add error logging
    const errorResult = addErrorLogging(updatedContent);
    updatedContent = errorResult.content;
    totalChanges += errorResult.additions;
    
    // Write updated content
    fs.writeFileSync(scriptPath, updatedContent, 'utf8');
    
    defaultLogger.success(`${path.basename(scriptPath)}: Logging standards applied (${totalChanges} changes)`);
    return { updated: true, changes: totalChanges };
    
  } catch (error) {
    defaultLogger.error(`${path.basename(scriptPath)}: Failed to apply logging standards - ${error.message}`);
    return { updated: false, error: error.message };
  }
}

/**
 * Create logging configuration file
 */
function createLoggingConfig() {
  const configPath = path.join(__dirname, 'logging-config.json');
  const config = {
    enabled: true,
    level: 'INFO',
    enableConsole: true,
    enableFile: true,
    logFile: 'logs/scripts.log',
    enableJson: false,
    jsonFile: 'logs/scripts.json',
    maxFileSize: 10485760, // 10MB
    maxFiles: 5,
    enableProgress: true,
    enableTiming: true,
    enableMetrics: true,
    environments: {
      development: {
        level: 'DEBUG',
        enableFile: false,
        enableProgress: true
      },
      production: {
        level: 'INFO',
        enableFile: true,
        enableJson: true,
        enableProgress: false
      }
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  defaultLogger.info(`Created logging configuration: ${configPath}`);
}

/**
 * Create logging documentation
 */
function createLoggingDocs() {
  const docsPath = path.join(__dirname, 'LOGGING_STANDARDS_GUIDE.md');
  const docs = `# Logging Standards Guide

## Overview
This project uses a unified logging system that provides structured logging, progress tracking, and performance monitoring across all scripts.

## Features
- **Structured Logging**: Consistent log levels and formatting
- **Progress Tracking**: Real-time progress updates for long-running operations
- **Performance Monitoring**: Automatic timing and metrics collection
- **Multiple Output Formats**: Console, file, and JSON logging
- **Color-coded Output**: Easy-to-read console output with icons
- **Log Rotation**: Automatic log file management

## Usage

### Basic Logging
\`\`\`javascript
const { defaultLogger } = require('./utils/logger');

// Different log levels
defaultLogger.debug('Debug information');
defaultLogger.info('General information');
defaultLogger.warn('Warning message');
defaultLogger.error('Error message');
defaultLogger.critical('Critical error');

// Success and failure logging
defaultLogger.success('Operation completed successfully');
defaultLogger.failure('Operation failed');
defaultLogger.warning('Warning about operation');
\`\`\`

### Progress Tracking
\`\`\`javascript
// Start progress tracking
defaultLogger.startProgress(100, 'Processing files');

// Update progress
for (let i = 0; i < files.length; i++) {
  defaultLogger.updateProgress(i + 1, \`Processing \${files[i]}\`);
  // Process file...
}

// Complete progress
defaultLogger.completeProgress('All files processed successfully');
\`\`\`

### Performance Monitoring
\`\`\`javascript
// Track operation timing
defaultLogger.startTimer('fileProcessing');
// ... perform operation
defaultLogger.endTimer('fileProcessing');

// Track operations with automatic timing
const result = defaultLogger.trackOperation('databaseQuery', () => {
  return database.query('SELECT * FROM users');
});

// Track async operations
const result = await defaultLogger.trackAsyncOperation('apiCall', async () => {
  return await fetch('/api/data');
});
\`\`\`

### Section and Subsection Logging
\`\`\`javascript
// Create section headers
defaultLogger.section('Database Migration');
defaultLogger.subsection('User Table');

// Log within sections
defaultLogger.info('Creating user table...');
defaultLogger.success('User table created successfully');
\`\`\`

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General information messages
- **WARNING**: Non-critical issues
- **ERROR**: Error conditions
- **CRITICAL**: Critical errors that require immediate attention

### Configuration
Logging can be configured via \`logging-config.json\`:
\`\`\`json
{
  "enabled": true,
  "level": "INFO",
  "enableConsole": true,
  "enableFile": true,
  "logFile": "logs/scripts.log",
  "enableProgress": true,
  "enableTiming": true
}
\`\`\`

### Metrics and Reporting
\`\`\`javascript
// Get logging metrics
const metrics = defaultLogger.getMetrics();

// Generate logging report
const report = defaultLogger.generateReport();

// Reset metrics
defaultLogger.resetMetrics();
\`\`\`

## Best Practices
1. **Use appropriate log levels** for different types of messages
2. **Include context** in log messages for better debugging
3. **Track progress** for long-running operations
4. **Monitor performance** of critical operations
5. **Use structured logging** instead of console.log
6. **Configure logging appropriately** for different environments

## Integration
The logging system is automatically applied to all scripts in this project.
To manually apply logging standards to a new script, run:
\`\`\`bash
node scripts/apply-logging-standards.js
\`\`\`
`;

  fs.writeFileSync(docsPath, docs);
  defaultLogger.info(`Created logging documentation: ${docsPath}`);
}

/**
 * Main function
 */
async function main() {
  defaultLogger.section('Applying Logging Standards');
  
  const results = {
    total: SCRIPTS_TO_UPDATE.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    totalChanges: 0,
    details: []
  };
  
  defaultLogger.startProgress(results.total, 'Updating scripts with logging standards');
  
  // Update each script
  for (let i = 0; i < SCRIPTS_TO_UPDATE.length; i++) {
    const scriptName = SCRIPTS_TO_UPDATE[i];
    const scriptPath = path.join(__dirname, scriptName);
    
    defaultLogger.updateProgress(i + 1, `Processing ${scriptName}`);
    
    if (!fs.existsSync(scriptPath)) {
      defaultLogger.warning(`${scriptName}: File not found`);
      results.skipped++;
      results.details.push({ script: scriptName, status: 'skipped', reason: 'File not found' });
      continue;
    }
    
    const result = updateScriptWithLogging(scriptPath);
    results.details.push({ script: scriptName, ...result });
    
    if (result.updated) {
      results.updated++;
      results.totalChanges += result.changes || 0;
    } else if (result.error) {
      results.failed++;
    } else {
      results.skipped++;
    }
  }
  
  defaultLogger.completeProgress('Logging standards application completed');
  
  // Create configuration and documentation
  createLoggingConfig();
  createLoggingDocs();
  
  // Summary
  defaultLogger.section('Logging Standards Application Summary');
  defaultLogger.info(`Total scripts: ${results.total}`);
  defaultLogger.success(`Updated: ${results.updated}`);
  defaultLogger.warning(`Skipped: ${results.skipped}`);
  defaultLogger.error(`Failed: ${results.failed}`);
  defaultLogger.info(`Total changes applied: ${results.totalChanges}`);
  
  if (results.failed > 0) {
    defaultLogger.subsection('Failed Updates');
    results.details
      .filter(d => d.error)
      .forEach(d => defaultLogger.error(`${d.script}: ${d.error}`));
  }
  
  defaultLogger.success('Logging standards system applied successfully!');
  defaultLogger.info('See LOGGING_STANDARDS_GUIDE.md for usage instructions');
}

// Execute with error handling
if (require.main === module) {
  main().catch(error => {
    defaultLogger.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  updateScriptWithLogging,
  createLoggingConfig,
  createLoggingDocs
};
