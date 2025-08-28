#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { defaultLogger } = require('./utils/logger');

/**
 * Aggregate Metrics Script
 * 
 * This script aggregates metrics from the logs directory.
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
 * @usage node aggregate-metrics.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node aggregate-metrics.js --verbose --config=production
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


function aggregateMetrics() {
  const metricsFile = path.join(__dirname, '../logs/metrics.json');
  const aggregatedFile = path.join(__dirname, '../logs/aggregated-metrics.json');
  
  if (wrapSyncWithErrorHandling(() => fs.existsSync)(metricsFile)) {
    const metrics = JSON.parse(wrapSyncWithErrorHandling(() => fs.readFileSync)(metricsFile, 'utf8'));
    
    const aggregated = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: metrics.checks,
        totalFailures: metrics.failures,
        availability: metrics.availability,
        avgResponseTime: metrics.responseTimes.length > 0
          ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
          : 0,
      },
      hourly: {
        checks: metrics.checks,
        failures: metrics.failures,
        avgResponseTime: metrics.responseTimes.length > 0
          ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
          : 0,
      },
    };
    
    wrapSyncWithErrorHandling(() => fs.writeFileSync)(aggregatedFile, JSON.stringify(aggregated, null, 2));
    }
}

aggregateMetrics();
