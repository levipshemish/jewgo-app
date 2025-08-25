
const { defaultLogger } = require('./utils/logger');

#!/usr/bin/env node

/**
 * rotate-logs
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category utility
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node rotate-logs.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node rotate-logs.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
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

  
  config.logs.forEach(logConfig => {
    if (wrapSyncWithErrorHandling(() => fs.existsSync)(logConfig.path)) {
      const stats = wrapSyncWithErrorHandling(() => fs.statSync)(logConfig.path);
      const sizeInMB = stats.size / (1024 * 1024);
      
      if (sizeInMB > parseInt(logConfig.maxSize)) {
        // Rotate log file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${logConfig.path}.${timestamp}`;
        
        fs.renameSync(logConfig.path, rotatedPath);
        }
    }
  });
}

rotateLogs();
