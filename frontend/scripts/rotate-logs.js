#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { defaultLogger } = require('./utils/logger');

/**
 * Rotate Logs Script
 * 
 * This script rotates log files when they exceed a certain size.
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

// Simple error handler implementation
const defaultErrorHandler = {
  wrapFunction: (fn, context = {}) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error('Error in wrapped function:', error);
        throw error;
      }
    };
  },
  wrapSyncFunction: (fn, context = {}) => {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        console.error('Error in wrapped sync function:', error);
        throw error;
      }
    };
  }
};

function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}

function rotateLogs() {
  const config = {
    logs: [
      { path: path.join(__dirname, '../logs/app.log'), maxSize: 10 },
      { path: path.join(__dirname, '../logs/error.log'), maxSize: 10 }
    ]
  };
  
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
