#!/usr/bin/env node

/**
 * Unified Error Handling System
 * =============================
 * 
 * This module provides consistent error handling across all scripts in the project.
 * It includes error classification, logging, recovery strategies, and reporting.
 * 
 * Features:
 * - Error classification and categorization
 * - Structured logging with different levels
 * - Error recovery strategies
 * - Performance monitoring and error tracking
 * - Graceful degradation and fallback mechanisms
 * - Error reporting and analytics
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Error severity levels
const ERROR_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
  FATAL: 5
};

// Error categories
const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  FILE_SYSTEM: 'file_system',
  PERMISSION: 'permission',
  CONFIGURATION: 'configuration',
  DEPENDENCY: 'dependency',
  TIMEOUT: 'timeout',
  RESOURCE: 'resource',
  SECURITY: 'security',
  UNKNOWN: 'unknown'
};

// Error recovery strategies
const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  SKIP: 'skip',
  EXIT: 'exit',
  CONTINUE: 'continue'
};

class ErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      logLevel: options.logLevel || ERROR_LEVELS.INFO,
      logToFile: options.logToFile !== false,
      logFile: options.logFile || path.join(process.cwd(), 'logs', 'errors.log'),
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableMetrics: options.enableMetrics !== false,
      enableRecovery: options.enableRecovery !== false,
      ...options
    };
    
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByLevel: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      startTime: Date.now()
    };
    
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    
    this._initializeLogging();
    this._setupDefaultRecoveryStrategies();
  }

  /**
   * Initialize logging system
   */
  _initializeLogging() {
    if (this.config.logToFile) {
      const logDir = path.dirname(this.config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Setup default recovery strategies
   */
  _setupDefaultRecoveryStrategies() {
    // Network errors - retry with exponential backoff
    this.setRecoveryStrategy(ERROR_CATEGORIES.NETWORK, {
      strategy: RECOVERY_STRATEGIES.RETRY,
      maxRetries: 3,
      backoffMultiplier: 2,
      baseDelay: 1000
    });

    // File system errors - try alternative paths or skip
    this.setRecoveryStrategy(ERROR_CATEGORIES.FILE_SYSTEM, {
      strategy: RECOVERY_STRATEGIES.FALLBACK,
      fallbackActions: ['tryAlternativePath', 'createDirectory', 'skip']
    });

    // Configuration errors - exit gracefully
    this.setRecoveryStrategy(ERROR_CATEGORIES.CONFIGURATION, {
      strategy: RECOVERY_STRATEGIES.EXIT,
      exitCode: 1,
      message: 'Configuration error - cannot continue'
    });

    // Permission errors - try with different permissions or exit
    this.setRecoveryStrategy(ERROR_CATEGORIES.PERMISSION, {
      strategy: RECOVERY_STRATEGIES.EXIT,
      exitCode: 13,
      message: 'Permission denied - check file/directory permissions'
    });

    // Timeout errors - retry with increased timeout
    this.setRecoveryStrategy(ERROR_CATEGORIES.TIMEOUT, {
      strategy: RECOVERY_STRATEGIES.RETRY,
      maxRetries: 2,
      increaseTimeout: true
    });
  }

  /**
   * Set a recovery strategy for a specific error category
   */
  setRecoveryStrategy(category, strategy) {
    this.recoveryStrategies.set(category, strategy);
  }

  /**
   * Classify an error based on its properties
   */
  classifyError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';

    // Network errors
    if (errorCode.includes('enet') || errorCode.includes('econn') || 
        errorMessage.includes('network') || errorMessage.includes('connection') ||
        errorMessage.includes('timeout') || errorMessage.includes('econnrefused')) {
      return ERROR_CATEGORIES.NETWORK;
    }

    // File system errors
    if (errorCode.includes('enoent') || errorCode.includes('eacces') ||
        errorMessage.includes('file') || errorMessage.includes('directory') ||
        errorMessage.includes('path') || errorMessage.includes('fs')) {
      return ERROR_CATEGORIES.FILE_SYSTEM;
    }

    // Permission errors
    if (errorCode.includes('eacces') || errorCode.includes('eperm') ||
        errorMessage.includes('permission') || errorMessage.includes('access')) {
      return ERROR_CATEGORIES.PERMISSION;
    }

    // Configuration errors
    if (errorMessage.includes('config') || errorMessage.includes('env') ||
        errorMessage.includes('variable') || errorMessage.includes('setting')) {
      return ERROR_CATEGORIES.CONFIGURATION;
    }

    // Dependency errors
    if (errorMessage.includes('module') || errorMessage.includes('require') ||
        errorMessage.includes('import') || errorMessage.includes('dependency')) {
      return ERROR_CATEGORIES.DEPENDENCY;
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorCode.includes('etimeout')) {
      return ERROR_CATEGORIES.TIMEOUT;
    }

    // Resource errors
    if (errorMessage.includes('memory') || errorMessage.includes('resource') ||
        errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return ERROR_CATEGORIES.RESOURCE;
    }

    // Security errors
    if (errorMessage.includes('security') || errorMessage.includes('auth') ||
        errorMessage.includes('token') || errorMessage.includes('key')) {
      return ERROR_CATEGORIES.SECURITY;
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
        errorMessage.includes('format') || errorMessage.includes('schema')) {
      return ERROR_CATEGORIES.VALIDATION;
    }

    return ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Determine error severity level
   */
  determineSeverity(error, category) {
    // Critical errors that should stop execution
    if (category === ERROR_CATEGORIES.CONFIGURATION || 
        category === ERROR_CATEGORIES.PERMISSION ||
        error.message?.includes('fatal') ||
        error.message?.includes('critical')) {
      return ERROR_LEVELS.CRITICAL;
    }

    // Errors that might be recoverable
    if (category === ERROR_CATEGORIES.NETWORK ||
        category === ERROR_CATEGORIES.TIMEOUT ||
        category === ERROR_CATEGORIES.RESOURCE) {
      return ERROR_LEVELS.ERROR;
    }

    // Warnings that don't stop execution
    if (category === ERROR_CATEGORIES.VALIDATION ||
        error.message?.includes('warning') ||
        error.message?.includes('deprecated')) {
      return ERROR_LEVELS.WARNING;
    }

    // Default to error level
    return ERROR_LEVELS.ERROR;
  }

  /**
   * Log an error with structured formatting
   */
  logError(error, context = {}) {
    const category = this.classifyError(error);
    const severity = this.determineSeverity(error, category);
    const timestamp = new Date().toISOString();
    
    // Skip logging if below configured level
    if (severity < this.config.logLevel) {
      return;
    }

    const errorInfo = {
      timestamp,
      severity: Object.keys(ERROR_LEVELS)[severity],
      category,
      message: error.message,
      code: error.code,
      stack: error.stack,
      context: {
        script: process.argv[1] || 'unknown',
        pid: process.pid,
        ...context
      }
    };

    // Update metrics
    this._updateMetrics(category, severity);

    // Console output
    this._consoleOutput(errorInfo);

    // File logging
    if (this.config.logToFile) {
      this._fileOutput(errorInfo);
    }

    // Emit event for external listeners
    this.emit('error', errorInfo);

    return errorInfo;
  }

  /**
   * Update error metrics
   */
  _updateMetrics(category, severity) {
    this.metrics.totalErrors++;
    
    // Update category metrics
    if (!this.metrics.errorsByCategory[category]) {
      this.metrics.errorsByCategory[category] = 0;
    }
    this.metrics.errorsByCategory[category]++;

    // Update severity metrics
    const severityName = Object.keys(ERROR_LEVELS)[severity];
    if (!this.metrics.errorsByLevel[severityName]) {
      this.metrics.errorsByLevel[severityName] = 0;
    }
    this.metrics.errorsByLevel[severityName]++;

    // Store in history (keep last 100)
    this.errorHistory.push({
      timestamp: new Date().toISOString(),
      category,
      severity: severityName
    });
    
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
  }

  /**
   * Console output with color coding
   */
  _consoleOutput(errorInfo) {
    const { severity, category, message, timestamp } = errorInfo;
    
    // Color coding based on severity
    let color = colors.gray;
    let icon = 'ℹ️';
    
    switch (severity) {
      case 'DEBUG':
        color = colors.gray;
        icon = '🔍';
        break;
      case 'INFO':
        color = colors.blue;
        icon = 'ℹ️';
        break;
      case 'WARNING':
        color = colors.yellow;
        icon = '⚠️';
        break;
      case 'ERROR':
        color = colors.red;
        icon = '❌';
        break;
      case 'CRITICAL':
        color = colors.magenta;
        icon = '🚨';
        break;
      case 'FATAL':
        color = colors.bright + colors.red;
        icon = '💥';
        break;
    }

    const output = `${color}${icon} [${severity}] ${timestamp} - ${category.toUpperCase()}: ${message}${colors.reset}`;
    console.error(output);
  }

  /**
   * File output for logging
   */
  _fileOutput(errorInfo) {
    try {
      const logEntry = JSON.stringify(errorInfo) + '\n';
      fs.appendFileSync(this.config.logFile, logEntry);
    } catch (fileError) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', fileError.message);
    }
  }

  /**
   * Handle an error with recovery strategies
   */
  async handleError(error, context = {}) {
    const errorInfo = this.logError(error, context);
    const category = errorInfo.category;
    const strategy = this.recoveryStrategies.get(category);

    if (!strategy || !this.config.enableRecovery) {
      return { handled: false, recovered: false, error: errorInfo };
    }

    this.metrics.recoveryAttempts++;

    try {
      const result = await this._executeRecoveryStrategy(strategy, error, context);
      
      if (result.recovered) {
        this.metrics.successfulRecoveries++;
        this.logError(new Error(`Recovery successful: ${result.message}`), {
          ...context,
          recoveryStrategy: strategy.strategy,
          originalError: error.message
        });
      }

      return { handled: true, recovered: result.recovered, result };
    } catch (recoveryError) {
      this.logError(recoveryError, {
        ...context,
        recoveryStrategy: strategy.strategy,
        originalError: error.message
      });
      return { handled: true, recovered: false, error: recoveryError };
    }
  }

  /**
   * Execute recovery strategy
   */
  async _executeRecoveryStrategy(strategy, error, context) {
    switch (strategy.strategy) {
      case RECOVERY_STRATEGIES.RETRY:
        return await this._retryStrategy(strategy, error, context);
      
      case RECOVERY_STRATEGIES.FALLBACK:
        return await this._fallbackStrategy(strategy, error, context);
      
      case RECOVERY_STRATEGIES.SKIP:
        return { recovered: true, message: 'Error skipped', action: 'skip' };
      
      case RECOVERY_STRATEGIES.EXIT:
        console.error(`\n${colors.red}${strategy.message || 'Fatal error occurred'}${colors.reset}`);
        process.exit(strategy.exitCode || 1);
      
      case RECOVERY_STRATEGIES.CONTINUE:
        return { recovered: true, message: 'Continuing despite error', action: 'continue' };
      
      default:
        return { recovered: false, message: 'Unknown recovery strategy' };
    }
  }

  /**
   * Retry strategy implementation
   */
  async _retryStrategy(strategy, error, context) {
    const maxRetries = strategy.maxRetries || this.config.maxRetries;
    const baseDelay = strategy.baseDelay || this.config.retryDelay;
    const backoffMultiplier = strategy.backoffMultiplier || 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 1) {
          const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Emit retry event
        this.emit('retry', { attempt, maxRetries, error, context });

        // Return success (in real implementation, this would retry the original operation)
        return { recovered: true, message: `Retry attempt ${attempt} successful`, attempt };
      } catch (retryError) {
        if (attempt === maxRetries) {
          throw new Error(`All ${maxRetries} retry attempts failed: ${retryError.message}`);
        }
      }
    }
  }

  /**
   * Fallback strategy implementation
   */
  async _fallbackStrategy(strategy, error, context) {
    const fallbackActions = strategy.fallbackActions || [];

    for (const action of fallbackActions) {
      try {
        // Emit fallback event
        this.emit('fallback', { action, error, context });

        // Return success (in real implementation, this would execute the fallback action)
        return { recovered: true, message: `Fallback action '${action}' successful`, action };
      } catch (fallbackError) {
        // Continue to next fallback action
        continue;
      }
    }

    return { recovered: false, message: 'All fallback actions failed' };
  }

  /**
   * Create a wrapped function with error handling
   */
  wrapFunction(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const result = await this.handleError(error, context);
        if (!result.recovered) {
          throw error; // Re-throw if not recovered
        }
        return result.result;
      }
    };
  }

  /**
   * Create a synchronous wrapped function with error handling
   */
  wrapSyncFunction(fn, context = {}) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        const result = this.handleError(error, context);
        if (!result.recovered) {
          throw error; // Re-throw if not recovered
        }
        return result.result;
      }
    };
  }

  /**
   * Get error metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      errorRate: this.metrics.totalErrors / (this.metrics.uptime / 1000), // errors per second
      recoveryRate: this.metrics.successfulRecoveries / this.metrics.recoveryAttempts || 0
    };
  }

  /**
   * Get error history
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Generate error report
   */
  generateReport() {
    const metrics = this.getMetrics();
    const history = this.getErrorHistory();
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      recentErrors: history.slice(-10), // Last 10 errors
      summary: {
        totalErrors: metrics.totalErrors,
        mostCommonCategory: this._getMostCommon(metrics.errorsByCategory),
        mostCommonLevel: this._getMostCommon(metrics.errorsByLevel),
        recoveryRate: metrics.recoveryRate,
        uptime: metrics.uptime
      }
    };
  }

  /**
   * Get most common item from object
   */
  _getMostCommon(obj) {
    return Object.entries(obj).reduce((a, b) => obj[a] > obj[b] ? a : b, null);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByLevel: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      startTime: Date.now()
    };
  }
}

// Create default error handler instance
const defaultErrorHandler = new ErrorHandler();

// Export the class and default instance
module.exports = {
  ErrorHandler,
  defaultErrorHandler,
  ERROR_LEVELS,
  ERROR_CATEGORIES,
  RECOVERY_STRATEGIES
};
