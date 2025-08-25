#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * ============================
 * 
 * This script monitors and analyzes performance impacts of the cleanup process
 * by measuring various metrics including build times, script execution times,
 * memory usage, and system performance.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category monitoring
 * 
 * @dependencies Node.js, fs, path, child_process
 * @requires Performance monitoring tools and metrics collection
 * 
 * @usage node performance-monitor.js [options]
 * @options --build-test, --script-test, --memory-test, --full-test, --compare
 * 
 * @example
 * node performance-monitor.js --full-test --compare
 * 
 * @returns Performance metrics and comparison data
 * @throws Performance monitoring errors and system issues
 * 
 * @see Performance monitoring documentation
 * @see System performance guidelines
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { defaultLogger } = require('./utils/logger');
const { defaultErrorHandler } = require('./utils/errorHandler');

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

// Performance monitoring configuration
const CONFIG = {
  // Test configurations
  tests: {
    build: {
      command: 'npm run build',
      timeout: 300000, // 5 minutes
      description: 'Production build performance test'
    },
    dev: {
      command: 'npm run dev',
      timeout: 60000, // 1 minute
      description: 'Development server startup test'
    },
    lint: {
      command: 'npm run lint',
      timeout: 60000, // 1 minute
      description: 'Linting performance test'
    },
    typecheck: {
      command: 'npm run typecheck',
      timeout: 120000, // 2 minutes
      description: 'Type checking performance test'
    }
  },
  
  // Script performance tests
  scripts: [
    'validate-env-unified.js',
    'deploy-setup.js',
    'health-monitor.js',
    'setup-supabase-storage.js',
    'validate-css.js'
  ],
  
  // Performance thresholds
  thresholds: {
    buildTime: 180000, // 3 minutes
    devStartup: 30000, // 30 seconds
    lintTime: 30000, // 30 seconds
    typecheckTime: 60000, // 1 minute
    memoryUsage: 500 * 1024 * 1024, // 500MB
    scriptExecution: 10000 // 10 seconds
  },
  
  // Output files
  output: {
    metrics: 'performance-metrics.json',
    report: 'performance-report.md',
    comparison: 'performance-comparison.json'
  }
};

// Performance metrics storage
let metrics = {
  timestamp: new Date().toISOString(),
  tests: {},
  scripts: {},
  system: {},
  summary: {}
};

/**
 * Get system information
 */
function getSystemInfo() {
  try {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      uptime: os.uptime(),
      loadAverage: os.loadavg()
    };
  } catch (error) {
    defaultLogger.error('Failed to get system info:', error.message);
    return {};
  }
}

/**
 * Measure execution time of a command
 */
async function measureExecutionTime(command, description, timeout = 60000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    defaultLogger.info(`Starting ${description}...`);
    
    const child = spawn(command.split(' ')[0], command.split(' ').slice(1), {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        error: 'Timeout exceeded',
        executionTime: timeout,
        memoryUsage: process.memoryUsage(),
        output: output,
        error: errorOutput
      });
    }, timeout);
    
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      const result = {
        success: code === 0,
        executionTime: endTime - startTime,
        memoryUsage: {
          start: startMemory,
          end: endMemory,
          delta: {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external
          }
        },
        output: output,
        error: errorOutput,
        exitCode: code
      };
      
      defaultLogger.success(`${description} completed in ${result.executionTime}ms`);
      resolve(result);
    });
    
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage()
      });
    });
  });
}

/**
 * Test build performance
 */
async function testBuildPerformance() {
  defaultLogger.section('Build Performance Test');
  
  const result = await measureExecutionTime(
    CONFIG.tests.build.command,
    CONFIG.tests.build.description,
    CONFIG.tests.build.timeout
  );
  
  metrics.tests.build = {
    ...result,
    threshold: CONFIG.thresholds.buildTime,
    passed: result.success && result.executionTime <= CONFIG.thresholds.buildTime
  };
  
  return result;
}

/**
 * Test development server startup
 */
async function testDevServerPerformance() {
  defaultLogger.section('Development Server Performance Test');
  
  const result = await measureExecutionTime(
    CONFIG.tests.dev.command,
    CONFIG.tests.dev.description,
    CONFIG.tests.dev.timeout
  );
  
  metrics.tests.dev = {
    ...result,
    threshold: CONFIG.thresholds.devStartup,
    passed: result.success && result.executionTime <= CONFIG.thresholds.devStartup
  };
  
  return result;
}

/**
 * Test linting performance
 */
async function testLintPerformance() {
  defaultLogger.section('Linting Performance Test');
  
  const result = await measureExecutionTime(
    CONFIG.tests.lint.command,
    CONFIG.tests.lint.description,
    CONFIG.tests.lint.timeout
  );
  
  metrics.tests.lint = {
    ...result,
    threshold: CONFIG.thresholds.lintTime,
    passed: result.success && result.executionTime <= CONFIG.thresholds.lintTime
  };
  
  return result;
}

/**
 * Test type checking performance
 */
async function testTypecheckPerformance() {
  defaultLogger.section('Type Checking Performance Test');
  
  const result = await measureExecutionTime(
    CONFIG.tests.typecheck.command,
    CONFIG.tests.typecheck.description,
    CONFIG.tests.typecheck.timeout
  );
  
  metrics.tests.typecheck = {
    ...result,
    threshold: CONFIG.thresholds.typecheckTime,
    passed: result.success && result.executionTime <= CONFIG.thresholds.typecheckTime
  };
  
  return result;
}

/**
 * Test script performance
 */
async function testScriptPerformance() {
  defaultLogger.section('Script Performance Tests');
  
  const results = {};
  
  for (const script of CONFIG.scripts) {
    const scriptPath = path.join(__dirname, script);
    
    if (!fs.existsSync(scriptPath)) {
      defaultLogger.warning(`Script not found: ${script}`);
      continue;
    }
    
    defaultLogger.info(`Testing script: ${script}`);
    
    const result = await measureExecutionTime(
      `node ${scriptPath} --help`,
      `Script: ${script}`,
      CONFIG.thresholds.scriptExecution
    );
    
    results[script] = {
      ...result,
      threshold: CONFIG.thresholds.scriptExecution,
      passed: result.success && result.executionTime <= CONFIG.thresholds.scriptExecution
    };
  }
  
  metrics.scripts = results;
  return results;
}

/**
 * Analyze file system performance
 */
function analyzeFileSystemPerformance() {
  defaultLogger.section('File System Performance Analysis');
  
  const analysis = {
    totalFiles: 0,
    totalSize: 0,
    scriptFiles: 0,
    scriptSize: 0,
    nodeModulesSize: 0,
    buildOutputSize: 0
  };
  
  try {
    // Count total files and size
    const countFiles = (dir) => {
      const files = fs.readdirSync(dir);
      let count = 0;
      let size = 0;
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git') {
            const subResult = countFiles(filePath);
            count += subResult.count;
            size += subResult.size;
          }
        } else {
          count++;
          size += stat.size;
        }
      }
      
      return { count, size };
    };
    
    const rootResult = countFiles(process.cwd());
    analysis.totalFiles = rootResult.count;
    analysis.totalSize = rootResult.size;
    
    // Count script files
    const scriptsDir = path.join(process.cwd(), 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scriptResult = countFiles(scriptsDir);
      analysis.scriptFiles = scriptResult.count;
      analysis.scriptSize = scriptResult.size;
    }
    
    // Check node_modules size
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      const nodeModulesResult = countFiles(nodeModulesPath);
      analysis.nodeModulesSize = nodeModulesResult.size;
    }
    
    // Check build output size
    const buildPath = path.join(process.cwd(), '.next');
    if (fs.existsSync(buildPath)) {
      const buildResult = countFiles(buildPath);
      analysis.buildOutputSize = buildResult.size;
    }
    
    defaultLogger.success(`File system analysis completed`);
    defaultLogger.info(`Total files: ${analysis.totalFiles}`);
    defaultLogger.info(`Total size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);
    defaultLogger.info(`Script files: ${analysis.scriptFiles}`);
    defaultLogger.info(`Script size: ${(analysis.scriptSize / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    defaultLogger.error('File system analysis failed:', error.message);
  }
  
  metrics.system.fileSystem = analysis;
  return analysis;
}

/**
 * Generate performance summary
 */
function generatePerformanceSummary() {
  defaultLogger.section('Performance Summary');
  
  const summary = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    memoryUsage: {
      average: 0,
      peak: 0
    },
    recommendations: []
  };
  
  // Analyze test results
  const testResults = Object.values(metrics.tests);
  summary.totalTests = testResults.length;
  summary.passedTests = testResults.filter(test => test.passed).length;
  summary.failedTests = summary.totalTests - summary.passedTests;
  
  // Calculate execution times
  const executionTimes = testResults.map(test => test.executionTime);
  summary.totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0);
  summary.averageExecutionTime = summary.totalTests > 0 ? summary.totalExecutionTime / summary.totalTests : 0;
  
  // Analyze memory usage
  const memoryUsages = testResults.map(test => test.memoryUsage?.end?.heapUsed || 0);
  summary.memoryUsage.average = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
  summary.memoryUsage.peak = Math.max(...memoryUsages);
  
  // Generate recommendations
  if (summary.failedTests > 0) {
    summary.recommendations.push('Some performance tests failed - investigate performance issues');
  }
  
  if (summary.averageExecutionTime > 60000) {
    summary.recommendations.push('Average execution time is high - consider optimization');
  }
  
  if (summary.memoryUsage.peak > CONFIG.thresholds.memoryUsage) {
    summary.recommendations.push('Memory usage is high - investigate memory leaks');
  }
  
  // Log summary
  defaultLogger.info(`Total tests: ${summary.totalTests}`);
  defaultLogger.success(`Passed tests: ${summary.passedTests}`);
  defaultLogger.error(`Failed tests: ${summary.failedTests}`);
  defaultLogger.info(`Average execution time: ${summary.averageExecutionTime.toFixed(2)}ms`);
  defaultLogger.info(`Total execution time: ${summary.totalExecutionTime.toFixed(2)}ms`);
  defaultLogger.info(`Average memory usage: ${(summary.memoryUsage.average / 1024 / 1024).toFixed(2)} MB`);
  defaultLogger.info(`Peak memory usage: ${(summary.memoryUsage.peak / 1024 / 1024).toFixed(2)} MB`);
  
  if (summary.recommendations.length > 0) {
    defaultLogger.subsection('Recommendations');
    summary.recommendations.forEach(rec => defaultLogger.warning(rec));
  }
  
  metrics.summary = summary;
  return summary;
}

/**
 * Save performance metrics
 */
function savePerformanceMetrics() {
  try {
    fs.writeFileSync(CONFIG.output.metrics, JSON.stringify(metrics, null, 2));
    defaultLogger.success(`Performance metrics saved to ${CONFIG.output.metrics}`);
  } catch (error) {
    defaultLogger.error('Failed to save performance metrics:', error.message);
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  const report = `# Performance Monitoring Report

## Overview
Performance monitoring report generated on ${new Date().toISOString()}

## System Information
- Platform: ${metrics.system.platform || 'Unknown'}
- Architecture: ${metrics.system.arch || 'Unknown'}
- CPUs: ${metrics.system.cpus || 'Unknown'}
- Memory: ${metrics.system.memory ? `${(metrics.system.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB total` : 'Unknown'}

## Test Results

### Build Performance
- Success: ${metrics.tests.build?.success ? 'Yes' : 'No'}
- Execution Time: ${metrics.tests.build?.executionTime || 0}ms
- Threshold: ${CONFIG.thresholds.buildTime}ms
- Status: ${metrics.tests.build?.passed ? 'PASSED' : 'FAILED'}

### Development Server Performance
- Success: ${metrics.tests.dev?.success ? 'Yes' : 'No'}
- Execution Time: ${metrics.tests.dev?.executionTime || 0}ms
- Threshold: ${CONFIG.thresholds.devStartup}ms
- Status: ${metrics.tests.dev?.passed ? 'PASSED' : 'FAILED'}

### Linting Performance
- Success: ${metrics.tests.lint?.success ? 'Yes' : 'No'}
- Execution Time: ${metrics.tests.lint?.executionTime || 0}ms
- Threshold: ${CONFIG.thresholds.lintTime}ms
- Status: ${metrics.tests.lint?.passed ? 'PASSED' : 'FAILED'}

### Type Checking Performance
- Success: ${metrics.tests.typecheck?.success ? 'Yes' : 'No'}
- Execution Time: ${metrics.tests.typecheck?.executionTime || 0}ms
- Threshold: ${CONFIG.thresholds.typecheckTime}ms
- Status: ${metrics.tests.typecheck?.passed ? 'PASSED' : 'FAILED'}

## Script Performance

${Object.entries(metrics.scripts || {}).map(([script, result]) => `
### ${script}
- Success: ${result.success ? 'Yes' : 'No'}
- Execution Time: ${result.executionTime}ms
- Threshold: ${CONFIG.thresholds.scriptExecution}ms
- Status: ${result.passed ? 'PASSED' : 'FAILED'}
`).join('')}

## File System Analysis
- Total Files: ${metrics.system.fileSystem?.totalFiles || 0}
- Total Size: ${metrics.system.fileSystem?.totalSize ? `${(metrics.system.fileSystem.totalSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
- Script Files: ${metrics.system.fileSystem?.scriptFiles || 0}
- Script Size: ${metrics.system.fileSystem?.scriptSize ? `${(metrics.system.fileSystem.scriptSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}

## Summary
- Total Tests: ${metrics.summary?.totalTests || 0}
- Passed Tests: ${metrics.summary?.passedTests || 0}
- Failed Tests: ${metrics.summary?.failedTests || 0}
- Average Execution Time: ${metrics.summary?.averageExecutionTime ? `${metrics.summary.averageExecutionTime.toFixed(2)}ms` : 'Unknown'}
- Peak Memory Usage: ${metrics.summary?.memoryUsage?.peak ? `${(metrics.summary.memoryUsage.peak / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}

## Recommendations
${(metrics.summary?.recommendations || []).map(rec => `- ${rec}`).join('\n')}

## Conclusion
${metrics.summary?.failedTests > 0 ? 'Performance issues detected. Review recommendations above.' : 'All performance tests passed. System is performing well.'}
`;

  try {
    fs.writeFileSync(CONFIG.output.report, report);
    defaultLogger.success(`Performance report saved to ${CONFIG.output.report}`);
  } catch (error) {
    defaultLogger.error('Failed to save performance report:', error.message);
  }
}

/**
 * Main performance monitoring function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    buildTest: args.includes('--build-test'),
    scriptTest: args.includes('--script-test'),
    memoryTest: args.includes('--memory-test'),
    fullTest: args.includes('--full-test'),
    compare: args.includes('--compare')
  };
  
  defaultLogger.section('Performance Monitoring');
  defaultLogger.info('Starting comprehensive performance analysis...');
  
  // Get system information
  metrics.system = getSystemInfo();
  
  try {
    // Run performance tests based on options
    if (options.fullTest || options.buildTest) {
      await testBuildPerformance();
    }
    
    if (options.fullTest || options.memoryTest) {
      await testDevServerPerformance();
      await testLintPerformance();
      await testTypecheckPerformance();
    }
    
    if (options.fullTest || options.scriptTest) {
      await testScriptPerformance();
    }
    
    // Always run file system analysis
    analyzeFileSystemPerformance();
    
    // Generate summary and reports
    generatePerformanceSummary();
    savePerformanceMetrics();
    generatePerformanceReport();
    
    defaultLogger.success('Performance monitoring completed successfully!');
    defaultLogger.info(`Check ${CONFIG.output.report} for detailed results`);
    
  } catch (error) {
    defaultLogger.error('Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

// Execute with error handling
if (require.main === module) {
  main().catch(error => {
    defaultLogger.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testBuildPerformance,
  testDevServerPerformance,
  testLintPerformance,
  testTypecheckPerformance,
  testScriptPerformance,
  analyzeFileSystemPerformance,
  generatePerformanceSummary
};
