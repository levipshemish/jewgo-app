#!/usr/bin/env node

/**
 * Unified Logging System
 * ======================
 * 
 * This module provides standardized logging across all scripts in the project.
 * It includes structured logging, progress tracking, performance monitoring,
 * and various output formats for different use cases.
 * 
 * Features:
 * - Structured logging with different levels
 * - Progress tracking and reporting
 * - Performance monitoring and timing
 * - Multiple output formats (console, file, JSON)
 * - Color-coded output for better readability
 * - Log rotation and management
 * - Integration with error handling system
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
};

// Log level names for display
const LOG_LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARNING',
  3: 'ERROR',
  4: 'CRITICAL'
};

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
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

// Icons for different log levels
const levelIcons = {
  DEBUG: '🔍',
  INFO: 'ℹ️',
  WARNING: '⚠️',
  ERROR: '❌',
  CRITICAL: '🚨'
};

class Logger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      level: options.level || LOG_LEVELS.INFO,
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile || false,
      logFile: options.logFile || path.join(process.cwd(), 'logs', 'scripts.log'),
      enableJson: options.enableJson || false,
      jsonFile: options.jsonFile || path.join(process.cwd(), 'logs', 'scripts.json'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 5,
      enableProgress: options.enableProgress !== false,
      enableTiming: options.enableTiming !== false,
      enableMetrics: options.enableMetrics !== false,
      ...options
    };
    
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {},
      startTime: Date.now(),
      performance: {
        operations: {},
        timings: {}
      }
    };
    
    this.progress = {
      current: 0,
      total: 0,
      startTime: null,
      operations: []
    };
    
    this.timers = new Map();
    this.operationStack = [];
    
    this._initializeLogging();
  }

  /**
   * Initialize logging system
   */
  _initializeLogging() {
    if (this.config.enableFile) {
      const logDir = path.dirname(this.config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
    
    if (this.config.enableJson) {
      const jsonDir = path.dirname(this.config.jsonFile);
      if (!fs.existsSync(jsonDir)) {
        fs.mkdirSync(jsonDir, { recursive: true });
      }
    }
  }

  /**
   * Log a message with the specified level
   */
  log(level, message, data = {}) {
    const levelNum = typeof level === 'string' ? LOG_LEVELS[level.toUpperCase()] : level;
    
    // Skip if below configured level
    if (levelNum < this.config.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[levelNum];
    const icon = levelIcons[levelName];
    
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      data: {
        script: process.argv[1] || 'unknown',
        pid: process.pid,
        operation: this.operationStack[this.operationStack.length - 1] || 'main',
        ...data
      }
    };

    // Update metrics
    this._updateMetrics(levelName);

    // Console output
    if (this.config.enableConsole) {
      this._consoleOutput(logEntry);
    }

    // File output
    if (this.config.enableFile) {
      this._fileOutput(logEntry);
    }

    // JSON output
    if (this.config.enableJson) {
      this._jsonOutput(logEntry);
    }

    // Emit event for external listeners
    this.emit('log', logEntry);

    return logEntry;
  }

  /**
   * Update logging metrics
   */
  _updateMetrics(levelName) {
    this.metrics.totalLogs++;
    
    if (!this.metrics.logsByLevel[levelName]) {
      this.metrics.logsByLevel[levelName] = 0;
    }
    this.metrics.logsByLevel[levelName]++;
  }

  /**
   * Console output with color coding
   */
  _consoleOutput(logEntry) {
    const { level, message, timestamp } = logEntry;
    
    // Color coding based on level
    let color = colors.gray;
    
    switch (level) {
      case 'DEBUG':
        color = colors.gray;
        break;
      case 'INFO':
        color = colors.blue;
        break;
      case 'WARNING':
        color = colors.yellow;
        break;
      case 'ERROR':
        color = colors.red;
        break;
      case 'CRITICAL':
        color = colors.bright + colors.red;
        break;
    }

    const icon = levelIcons[level];
    const timeStr = timestamp.split('T')[1].split('.')[0]; // HH:MM:SS format
    
    const output = `${color}${icon} [${level}] ${timeStr} - ${message}${colors.reset}`;
    console.log(output);
  }

  /**
   * File output for logging
   */
  _fileOutput(logEntry) {
    try {
      const logLine = `${logEntry.timestamp} [${logEntry.level}] ${logEntry.message}\n`;
      fs.appendFileSync(this.config.logFile, logLine);
      
      // Check file size and rotate if needed
      this._rotateLogFile();
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * JSON output for structured logging
   */
  _jsonOutput(logEntry) {
    try {
      const jsonLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.config.jsonFile, jsonLine);
    } catch (error) {
      console.error('Failed to write to JSON log file:', error.message);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  _rotateLogFile() {
    try {
      const stats = fs.statSync(this.config.logFile);
      if (stats.size > this.config.maxFileSize) {
        // Rotate existing files
        for (let i = this.config.maxFiles - 1; i > 0; i--) {
          const oldFile = `${this.config.logFile}.${i}`;
          const newFile = `${this.config.logFile}.${i + 1}`;
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }
        
        // Move current log file
        fs.renameSync(this.config.logFile, `${this.config.logFile}.1`);
        
        // Create new log file
        fs.writeFileSync(this.config.logFile, '');
      }
    } catch (error) {
      // Ignore rotation errors
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message, data = {}) {
    return this.log(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data = {}) {
    return this.log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data = {}) {
    return this.log(LOG_LEVELS.WARNING, message, data);
  }

  error(message, data = {}) {
    return this.log(LOG_LEVELS.ERROR, message, data);
  }

  critical(message, data = {}) {
    return this.log(LOG_LEVELS.CRITICAL, message, data);
  }

  /**
   * Progress tracking methods
   */
  startProgress(total, description = 'Operation') {
    if (!this.config.enableProgress) return;
    
    this.progress = {
      current: 0,
      total,
      startTime: Date.now(),
      description,
      operations: []
    };
    
    this.info(`Starting ${description}`, { total, progress: true });
  }

  updateProgress(current, message = '') {
    if (!this.config.enableProgress) return;
    
    this.progress.current = current;
    const percentage = Math.round((current / this.progress.total) * 100);
    const elapsed = Date.now() - this.progress.startTime;
    const estimated = current > 0 ? (elapsed / current) * this.progress.total : 0;
    const remaining = Math.max(0, estimated - elapsed);
    
    const progressMessage = `${this.progress.description}: ${current}/${this.progress.total} (${percentage}%)`;
    const timeMessage = `Elapsed: ${this._formatDuration(elapsed)}, Remaining: ${this._formatDuration(remaining)}`;
    
    this.info(`${progressMessage} - ${timeMessage}`, { 
      current, 
      total: this.progress.total, 
      percentage,
      elapsed,
      remaining,
      progress: true 
    });
    
    if (message) {
      this.info(message, { progress: true });
    }
  }

  completeProgress(message = '') {
    if (!this.config.enableProgress) return;
    
    const elapsed = Date.now() - this.progress.startTime;
    const finalMessage = message || `${this.progress.description} completed`;
    
    this.info(`${finalMessage} in ${this._formatDuration(elapsed)}`, {
      total: this.progress.total,
      elapsed,
      progress: true,
      completed: true
    });
    
    this.progress = { current: 0, total: 0, startTime: null, operations: [] };
  }

  /**
   * Timing methods
   */
  startTimer(name) {
    if (!this.config.enableTiming) return;
    
    this.timers.set(name, Date.now());
    this.operationStack.push(name);
    
    this.debug(`Timer started: ${name}`, { timer: name, action: 'start' });
  }

  endTimer(name) {
    if (!this.config.enableTiming) return;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn(`Timer not found: ${name}`);
      return;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    
    // Remove from operation stack
    const stackIndex = this.operationStack.indexOf(name);
    if (stackIndex !== -1) {
      this.operationStack.splice(stackIndex, 1);
    }
    
    // Update performance metrics
    if (!this.metrics.performance.operations[name]) {
      this.metrics.performance.operations[name] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
    }
    
    const operation = this.metrics.performance.operations[name];
    operation.count++;
    operation.totalTime += duration;
    operation.averageTime = operation.totalTime / operation.count;
    operation.minTime = Math.min(operation.minTime, duration);
    operation.maxTime = Math.max(operation.maxTime, duration);
    
    this.debug(`Timer ended: ${name} (${this._formatDuration(duration)})`, {
      timer: name,
      duration,
      action: 'end',
      performance: operation
    });
  }

  /**
   * Section and subsection logging
   */
  section(title) {
    const separator = '='.repeat(50);
    this.info(`${separator}`);
    this.info(`  ${title}`);
    this.info(`${separator}`);
  }

  subsection(title) {
    const separator = '-'.repeat(30);
    this.info(`${separator}`);
    this.info(`  ${title}`);
    this.info(`${separator}`);
  }

  /**
   * Success and error logging with icons
   */
  success(message, data = {}) {
    return this.info(`✅ ${message}`, { ...data, type: 'success' });
  }

  failure(message, data = {}) {
    return this.error(`❌ ${message}`, { ...data, type: 'failure' });
  }

  warning(message, data = {}) {
    return this.warn(`⚠️  ${message}`, { ...data, type: 'warning' });
  }

  /**
   * Performance monitoring
   */
  trackOperation(name, operation) {
    if (!this.config.enableMetrics) return operation();
    
    this.startTimer(name);
    try {
      const result = operation();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  async trackAsyncOperation(name, operation) {
    if (!this.config.enableMetrics) return operation();
    
    this.startTimer(name);
    try {
      const result = await operation();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Get logging metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      logRate: this.metrics.totalLogs / ((Date.now() - this.metrics.startTime) / 1000), // logs per second
      performance: this.metrics.performance
    };
  }

  /**
   * Generate logging report
   */
  generateReport() {
    const metrics = this.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalLogs: metrics.totalLogs,
        mostCommonLevel: this._getMostCommon(metrics.logsByLevel),
        logRate: metrics.logRate,
        uptime: metrics.uptime,
        performance: Object.keys(metrics.performance.operations).length
      }
    };
  }

  /**
   * Format duration in human readable format
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
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
      totalLogs: 0,
      logsByLevel: {},
      startTime: Date.now(),
      performance: {
        operations: {},
        timings: {}
      }
    };
    this.timers.clear();
    this.operationStack = [];
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export the class and default instance
module.exports = {
  Logger,
  defaultLogger,
  LOG_LEVELS,
  LOG_LEVEL_NAMES
};
