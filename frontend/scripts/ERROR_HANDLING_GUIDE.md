# Error Handling Guide

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
```javascript
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
```

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
Error handling can be configured via `error-handling-config.json`:
```json
{
  "enabled": true,
  "logLevel": "INFO",
  "logToFile": true,
  "maxRetries": 3,
  "enableRecovery": true
}
```

### Metrics and Reporting
```javascript
// Get error metrics
const metrics = defaultErrorHandler.getMetrics();

// Generate error report
const report = defaultErrorHandler.generateReport();

// Get error history
const history = defaultErrorHandler.getErrorHistory();
```

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
```bash
node scripts/apply-error-handling.js
```
