#!/usr/bin/env node

/**
 * Apply Error Handling System
 * ===========================
 * 
 * This script applies the unified error handling system to existing scripts
 * by adding error handling imports and wrapping functions with error handling.
 */

const fs = require('fs');
const path = require('path');
const { defaultErrorHandler } = require('./utils/errorHandler');

// Scripts to update with error handling
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

// Error handling import statement
const ERROR_HANDLER_IMPORT = `
const { defaultErrorHandler } = require('./utils/errorHandler');
`;

// Error handling wrapper function
const ERROR_WRAPPER_FUNCTION = `
/**
 * Wrap function with error handling
 */
function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}
`;

// Main function wrapper template
const MAIN_FUNCTION_WRAPPER = `
// Wrap main function with error handling
const mainWithErrorHandling = wrapWithErrorHandling(main, {
  script: __filename,
  operation: 'main'
});

// Execute with error handling
if (require.main === module) {
  mainWithErrorHandling().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}
`;

/**
 * Check if file already has error handling
 */
function hasErrorHandling(content) {
  return content.includes('defaultErrorHandler') || 
         content.includes('wrapWithErrorHandling') ||
         content.includes('wrapSyncWithErrorHandling');
}

/**
 * Add error handling import to file
 */
function addErrorHandlerImport(content) {
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
    
    return beforeRequire + requireStatement + ERROR_HANDLER_IMPORT + restOfContent;
  } else {
    // Add at the beginning if no require statements
    return ERROR_HANDLER_IMPORT + '\n' + content;
  }
}

/**
 * Add error handling wrapper functions
 */
function addErrorWrapperFunctions(content) {
  // Add after imports and before the main code
  const importEndIndex = content.lastIndexOf('require(');
  if (importEndIndex !== -1) {
    const requireEndIndex = content.indexOf(';', importEndIndex) + 1;
    const beforeImports = content.substring(0, requireEndIndex);
    const afterImports = content.substring(requireEndIndex);
    
    return beforeImports + ERROR_WRAPPER_FUNCTION + afterImports;
  }
  
  return ERROR_WRAPPER_FUNCTION + '\n' + content;
}

/**
 * Wrap main function with error handling
 */
function wrapMainFunction(content) {
  // Look for main function or if (require.main === module) pattern
  const mainPattern = /if\s*\(\s*require\.main\s*===\s*module\s*\)\s*\{/;
  const mainMatch = content.match(mainPattern);
  
  if (mainMatch) {
    // Replace the existing main execution with wrapped version
    const beforeMain = content.substring(0, mainMatch.index);
    const afterMain = content.substring(mainMatch.index);
    
    // Find the end of the main block
    let braceCount = 0;
    let endIndex = 0;
    for (let i = 0; i < afterMain.length; i++) {
      if (afterMain[i] === '{') braceCount++;
      if (afterMain[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    const mainBlock = afterMain.substring(0, endIndex);
    const afterMainBlock = afterMain.substring(endIndex);
    
    return beforeMain + MAIN_FUNCTION_WRAPPER + afterMainBlock;
  }
  
  return content;
}

/**
 * Add error handling to specific functions
 */
function addFunctionErrorHandling(content) {
  // Common patterns to wrap with error handling
  const patterns = [
    // File operations
    {
      pattern: /fs\.(readFileSync|writeFileSync|existsSync|mkdirSync|rmSync|copyFileSync)/g,
      wrapper: 'wrapSyncWithErrorHandling'
    },
    // Directory operations
    {
      pattern: /fs\.(readdirSync|statSync)/g,
      wrapper: 'wrapSyncWithErrorHandling'
    },
    // Network operations (if any)
    {
      pattern: /https?\.(get|post|request)/g,
      wrapper: 'wrapWithErrorHandling'
    },
    // Process operations
    {
      pattern: /process\.(exit|chdir)/g,
      wrapper: 'wrapSyncWithErrorHandling'
    }
  ];
  
  let updatedContent = content;
  
  patterns.forEach(({ pattern, wrapper }) => {
    updatedContent = updatedContent.replace(pattern, (match) => {
      return `${wrapper}(() => ${match})`;
    });
  });
  
  return updatedContent;
}

/**
 * Update a single script with error handling
 */
function updateScriptWithErrorHandling(scriptPath) {
  try {
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Skip if already has error handling
    if (hasErrorHandling(content)) {
      console.log(`⚠️  ${path.basename(scriptPath)}: Already has error handling`);
      return { updated: false, reason: 'Already has error handling' };
    }
    
    let updatedContent = content;
    
    // Add error handler import
    updatedContent = addErrorHandlerImport(updatedContent);
    
    // Add wrapper functions
    updatedContent = addErrorWrapperFunctions(updatedContent);
    
    // Wrap main function
    updatedContent = wrapMainFunction(updatedContent);
    
    // Add function-specific error handling
    updatedContent = addFunctionErrorHandling(updatedContent);
    
    // Write updated content
    fs.writeFileSync(scriptPath, updatedContent, 'utf8');
    
    console.log(`✅ ${path.basename(scriptPath)}: Error handling applied`);
    return { updated: true };
    
  } catch (error) {
    console.error(`❌ ${path.basename(scriptPath)}: Failed to apply error handling - ${error.message}`);
    return { updated: false, error: error.message };
  }
}

/**
 * Create error handling configuration file
 */
function createErrorHandlingConfig() {
  const configPath = path.join(__dirname, 'error-handling-config.json');
  const config = {
    enabled: true,
    logLevel: 'INFO',
    logToFile: true,
    logFile: 'logs/errors.log',
    maxRetries: 3,
    retryDelay: 1000,
    enableMetrics: true,
    enableRecovery: true,
    recoveryStrategies: {
      network: {
        strategy: 'retry',
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000
      },
      file_system: {
        strategy: 'fallback',
        fallbackActions: ['tryAlternativePath', 'createDirectory', 'skip']
      },
      configuration: {
        strategy: 'exit',
        exitCode: 1,
        message: 'Configuration error - cannot continue'
      },
      permission: {
        strategy: 'exit',
        exitCode: 13,
        message: 'Permission denied - check file/directory permissions'
      }
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

}

/**
 * Create error handling documentation
 */
function createErrorHandlingDocs() {
  const docsPath = path.join(__dirname, 'ERROR_HANDLING_GUIDE.md');
  const docs = `# Error Handling Guide

## Overview
This project uses a unified error handling system that provides consistent error handling across all scripts.

## Features
- **Error Classification**: Automatically categorizes errors (network, file system, configuration, etc.)
- **Structured Logging**: Color-coded console output and file logging
- **Recovery Strategies**: Automatic retry, fallback, and graceful degradation
- **Metrics Tracking**: Error rates, recovery success rates, and performance monitoring
- **Graceful Degradation**: Continue operation despite non-critical errors

## Usage

### Basic Error Handling
\`\`\`javascript
const { defaultErrorHandler } = require('./utils/errorHandler');

// Wrap functions with error handling
const safeFunction = defaultErrorHandler.wrapFunction(myFunction, {
  context: 'myOperation'
});

// Handle errors manually
try {
  // Your code here
} catch (error) {
  const result = await defaultErrorHandler.handleError(error, {
    context: 'myOperation'
  });
}
\`\`\`

### Error Categories
- **NETWORK**: Connection, timeout, and network-related errors
- **FILE_SYSTEM**: File and directory operation errors
- **PERMISSION**: Access and permission-related errors
- **CONFIGURATION**: Environment variable and configuration errors
- **DEPENDENCY**: Module and dependency-related errors
- **TIMEOUT**: Timeout and performance-related errors
- **RESOURCE**: Memory and resource limit errors
- **SECURITY**: Authentication and security-related errors
- **VALIDATION**: Data validation and format errors

### Recovery Strategies
- **RETRY**: Automatically retry failed operations with exponential backoff
- **FALLBACK**: Try alternative approaches when primary method fails
- **SKIP**: Skip non-critical operations that fail
- **EXIT**: Gracefully exit when critical errors occur
- **CONTINUE**: Continue execution despite errors

### Configuration
Error handling can be configured via \`error-handling-config.json\`:
\`\`\`json
{
  "enabled": true,
  "logLevel": "INFO",
  "logToFile": true,
  "maxRetries": 3,
  "enableRecovery": true
}
\`\`\`

### Metrics and Reporting
\`\`\`javascript
// Get error metrics
const metrics = defaultErrorHandler.getMetrics();

// Generate error report
const report = defaultErrorHandler.generateReport();

// Get error history
const history = defaultErrorHandler.getErrorHistory();
\`\`\`

## Best Practices
1. **Always wrap file operations** with error handling
2. **Use appropriate recovery strategies** for different error types
3. **Provide meaningful context** when handling errors
4. **Monitor error metrics** to identify patterns
5. **Test error scenarios** to ensure proper recovery
6. **Log errors appropriately** for debugging and monitoring

## Integration
The error handling system is automatically applied to all scripts in this project.
To manually apply error handling to a new script, run:
\`\`\`bash
node scripts/apply-error-handling.js
\`\`\`
`;

  fs.writeFileSync(docsPath, docs);

}

/**
 * Main function
 */
async function main() {


  const results = {
    total: SCRIPTS_TO_UPDATE.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: []
  };
  
  // Update each script
  for (const scriptName of SCRIPTS_TO_UPDATE) {
    const scriptPath = path.join(__dirname, scriptName);
    
    if (!fs.existsSync(scriptPath)) {

      results.skipped++;
      results.details.push({ script: scriptName, status: 'skipped', reason: 'File not found' });
      continue;
    }
    
    const result = updateScriptWithErrorHandling(scriptPath);
    results.details.push({ script: scriptName, ...result });
    
    if (result.updated) {
      results.updated++;
    } else if (result.error) {
      results.failed++;
    } else {
      results.skipped++;
    }
  }
  
  // Create configuration and documentation
  createErrorHandlingConfig();
  createErrorHandlingDocs();
  
  // Summary






  if (results.failed > 0) {

    results.details
      .filter(d => d.error)
      .forEach(d => console.log(`  - ${d.script}: ${d.error}`));
  }


}

// Execute with error handling
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  updateScriptWithErrorHandling,
  createErrorHandlingConfig,
  createErrorHandlingDocs
};
