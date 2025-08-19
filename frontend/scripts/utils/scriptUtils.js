/**
 * Unified Script Utilities
 * ========================
 * 
 * Centralized script utility functions to eliminate code duplication.
 * This module consolidates all script utility logic that was previously duplicated.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Log a message with optional color
 */
function log(message, color = 'reset') {
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

/**
 * Log a section header
 */
function logSection(title) {
  log(`\n${  '='.repeat(50)}`, 'cyan');
  log(title, 'bold');
  log('='.repeat(50), 'cyan');
}

/**
 * Log a subsection header
 */
function logSubsection(title) {
  log(`\n${  '-'.repeat(30)}`, 'cyan');
  log(title, 'cyan');
  log('-'.repeat(30), 'cyan');
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) {return '0 Bytes';}
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
}

/**
 * Find files recursively in a directory
 */
function findFiles(dir, pattern = null) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (stat.isFile()) {
          if (!pattern || pattern.test(item)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      log(`Error reading directory ${currentDir}: ${error.message}`, 'red');
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Process files with a callback function
 */
function processFiles(files, processor, options = {}) {
  const { 
    onProgress = null, 
    onError = null, 
    batchSize = 10,
    showProgress = true 
  } = options;
  
  const results = [];
  let processed = 0;
  const total = files.length;
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    for (const file of batch) {
      try {
        const result = processor(file);
        results.push({ file, result, success: true });
      } catch (error) {
        const errorResult = { file, error: error.message, success: false };
        results.push(errorResult);
        
        if (onError) {
          onError(errorResult);
        } else {
          log(`Error processing ${file}: ${error.message}`, 'red');
        }
      }
      
      processed++;
      
      if (showProgress && onProgress) {
        onProgress(processed, total);
      }
    }
  }
  
  return results;
}

/**
 * Aggregate metrics from results
 */
function aggregateMetrics(results, metrics = ['size', 'count']) {
  const aggregated = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalSize: 0,
    averageSize: 0
  };
  
  if (metrics.includes('size')) {
    const successfulResults = results.filter(r => r.success && r.result && typeof r.result.size === 'number');
    aggregated.totalSize = successfulResults.reduce((sum, r) => sum + r.result.size, 0);
    aggregated.averageSize = successfulResults.length > 0 ? aggregated.totalSize / successfulResults.length : 0;
  }
  
  return aggregated;
}

/**
 * Create a progress bar
 */
function createProgressBar(current, total, width = 30) {
  const percentage = total > 0 ? (current / total) : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentText = Math.round(percentage * 100);
  
  return `[${bar}] ${percentText}% (${current}/${total})`;
}

/**
 * Validate file path exists
 */
function validatePath(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Get file extension
 */
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file is an image
 */
function isImageFile(filePath) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
  return imageExtensions.includes(getFileExtension(filePath));
}

/**
 * Check if file is a JavaScript file
 */
function isJavaScriptFile(filePath) {
  const jsExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  return jsExtensions.includes(getFileExtension(filePath));
}

/**
 * Check if file is a CSS file
 */
function isCssFile(filePath) {
  const cssExtensions = ['.css', '.scss', '.sass', '.less'];
  return cssExtensions.includes(getFileExtension(filePath));
}

/**
 * Create backup of a file
 */
function createBackup(filePath) {
  try {
    const backupPath = `${filePath  }.backup`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    log(`Failed to create backup for ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Restore file from backup
 */
function restoreFromBackup(filePath) {
  try {
    const backupPath = `${filePath  }.backup`;
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath);
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  } catch (error) {
    log(`Failed to restore ${filePath} from backup: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Measure execution time of a function
 */
function measureTime(fn, label = 'Operation') {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  const duration = end - start;
  
  log(`${label} completed in ${duration}ms`, 'green');
  return { result, duration };
}

/**
 * Retry a function with exponential backoff
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  log,
  logSection,
  logSubsection,
  getFileSize,
  formatBytes,
  findFiles,
  processFiles,
  aggregateMetrics,
  createProgressBar,
  validatePath,
  getFileExtension,
  isImageFile,
  isJavaScriptFile,
  isCssFile,
  createBackup,
  restoreFromBackup,
  measureTime,
  retry,
  colors
};
