# Logging Standards Guide

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
```javascript
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
```

### Progress Tracking
```javascript
// Start progress tracking
defaultLogger.startProgress(100, 'Processing files');

// Update progress
for (let i = 0; i < files.length; i++) {
  defaultLogger.updateProgress(i + 1, `Processing ${files[i]}`);
  // Process file...
}

// Complete progress
defaultLogger.completeProgress('All files processed successfully');
```

### Performance Monitoring
```javascript
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
```

### Section and Subsection Logging
```javascript
// Create section headers
defaultLogger.section('Database Migration');
defaultLogger.subsection('User Table');

// Log within sections
defaultLogger.info('Creating user table...');
defaultLogger.success('User table created successfully');
```

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General information messages
- **WARNING**: Non-critical issues
- **ERROR**: Error conditions
- **CRITICAL**: Critical errors that require immediate attention

### Configuration
Logging can be configured via `logging-config.json`:
```json
{
  "enabled": true,
  "level": "INFO",
  "enableConsole": true,
  "enableFile": true,
  "logFile": "logs/scripts.log",
  "enableProgress": true,
  "enableTiming": true
}
```

### Metrics and Reporting
```javascript
// Get logging metrics
const metrics = defaultLogger.getMetrics();

// Generate logging report
const report = defaultLogger.generateReport();

// Reset metrics
defaultLogger.resetMetrics();
```

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
```bash
node scripts/apply-logging-standards.js
```
