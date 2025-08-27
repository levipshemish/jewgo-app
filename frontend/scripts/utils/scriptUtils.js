#!/usr/bin/env node

/**
 * Shared Script Utilities
 * 
 * Common utilities used across multiple scripts to reduce duplication
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
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

}

/**
 * Log a section header
 */
function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'bold');
  console.log('='.repeat(50));
}

/**
 * Log a subsection header
 */
function logSubsection(title) {
  console.log('\n' + '-'.repeat(30));
  log(title, 'cyan');
  console.log('-'.repeat(30));
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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Find files with specific extensions in a directory
 */
function findFiles(dir, extensions = [], excludeDirs = ['node_modules', '.next', '.git']) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (extensions.length === 0 || extensions.includes(ext)) {
          files.push({
            path: fullPath,
            name: item,
            size: stat.size,
            extension: ext
          });
        }
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

/**
 * Execute a command and return the result
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      output: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

/**
 * Check if a directory exists
 */
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!directoryExists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get project root directory
 */
function getProjectRoot() {
  return process.cwd();
}

/**
 * Get relative path from project root
 */
function getRelativePath(filePath) {
  return path.relative(getProjectRoot(), filePath);
}

module.exports = {
  colors,
  log,
  logSection,
  logSubsection,
  getFileSize,
  formatBytes,
  findFiles,
  execCommand,
  directoryExists,
  ensureDirectoryExists,
  getProjectRoot,
  getRelativePath
};
