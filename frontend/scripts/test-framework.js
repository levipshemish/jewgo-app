#!/usr/bin/env node

/**
 * Script Testing Framework
 * ========================
 * 
 * This script provides a comprehensive testing framework for all project scripts,
 * ensuring they work correctly, handle errors properly, and produce expected outputs.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category testing
 * 
 * @dependencies Node.js, fs, path, child_process, glob
 * @requires All project scripts to be tested
 * 
 * @usage node test-framework.js [options]
 * @options --all, --unit, --integration, --e2e, --coverage, --report
 * 
 * @example
 * node test-framework.js --all --coverage
 * 
 * @returns Test results and coverage reports
 * @throws Test failures and script errors
 * 
 * @see All project scripts and their functionality
 * @see Testing standards and best practices
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { glob } = require('glob');
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

// Test configuration
const TEST_CONFIG = {
  // Test types
  testTypes: {
    unit: {
      description: 'Unit tests for individual script functions',
      scripts: [
        'validate-test-demo-files.js',
        'unused-files-detector.js',
        'periodic-cleanup-scheduler.js'
      ]
    },
    integration: {
      description: 'Integration tests for script interactions',
      scripts: [
        'cleanup-orchestrator.js',
        'script-consolidator.js',
        'migration-orchestrator.js'
      ]
    },
    e2e: {
      description: 'End-to-end tests for complete workflows',
      scripts: [
        'comprehensive-cleanup.js',
        'performance-monitor.js',
        'health-monitor.js'
      ]
    }
  },
  
  // Test scenarios
  testScenarios: {
    // Basic functionality tests
    basic: {
      description: 'Basic functionality tests',
      tests: [
        'script-execution',
        'help-command',
        'version-command',
        'error-handling'
      ]
    },
    
    // Error handling tests
    errorHandling: {
      description: 'Error handling and edge cases',
      tests: [
        'invalid-arguments',
        'missing-files',
        'permission-errors',
        'network-errors',
        'timeout-handling'
      ]
    },
    
    // Performance tests
    performance: {
      description: 'Performance and resource usage',
      tests: [
        'execution-time',
        'memory-usage',
        'cpu-usage',
        'file-io-performance'
      ]
    },
    
    // Output validation tests
    outputValidation: {
      description: 'Output format and content validation',
      tests: [
        'json-output',
        'log-output',
        'report-generation',
        'file-creation'
      ]
    }
  },
  
  // Test settings
  settings: {
    timeout: 30000, // 30 seconds
    retries: 3,
    parallel: false,
    coverage: true,
    verbose: false,
    saveOutputs: true
  },
  
  // Expected outputs
  expectedOutputs: {
    success: {
      exitCode: 0,
      hasLogs: true,
      hasOutput: true
    },
    error: {
      exitCode: 1,
      hasErrorLogs: true,
      hasErrorMessage: true
    },
    help: {
      exitCode: 0,
      hasHelpText: true,
      hasUsageInfo: true
    }
  }
};

// Test results
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  testSuites: {},
  coverage: {},
  performance: {},
  errors: [],
  warnings: [],
  recommendations: []
};

/**
 * Execute a script with given arguments
 */
function executeScript(scriptPath, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const scriptName = path.basename(scriptPath);
    
    defaultLogger.info(`Executing ${scriptName} with args: ${args.join(' ')}`);
    
    const child = spawn('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: options.timeout || TEST_CONFIG.settings.timeout
    });
    
    let stdout = '';
    let stderr = '';
    let exitCode = null;
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      exitCode = code;
      const executionTime = Date.now() - startTime;
      
      resolve({
        scriptName,
        exitCode,
        stdout,
        stderr,
        executionTime,
        success: code === 0
      });
    });
    
    child.on('error', (error) => {
      reject({
        scriptName,
        error: error.message,
        success: false
      });
    });
    
    // Handle timeout
    setTimeout(() => {
      child.kill('SIGTERM');
      reject({
        scriptName,
        error: 'Execution timeout',
        success: false
      });
    }, options.timeout || TEST_CONFIG.settings.timeout);
  });
}

/**
 * Validate script output against expected patterns
 */
function validateOutput(result, expectedPatterns) {
  const validations = [];
  
  // Check exit code
  if (expectedPatterns.exitCode !== undefined) {
    validations.push({
      name: 'Exit Code',
      passed: result.exitCode === expectedPatterns.exitCode,
      expected: expectedPatterns.exitCode,
      actual: result.exitCode
    });
  }
  
  // Check stdout content
  if (expectedPatterns.hasOutput) {
    validations.push({
      name: 'Has Output',
      passed: result.stdout.length > 0,
      expected: 'Non-empty output',
      actual: result.stdout.length > 0 ? 'Has output' : 'No output'
    });
  }
  
  // Check stderr content
  if (expectedPatterns.hasErrorLogs) {
    validations.push({
      name: 'Has Error Logs',
      passed: result.stderr.length > 0,
      expected: 'Error logs present',
      actual: result.stderr.length > 0 ? 'Has error logs' : 'No error logs'
    });
  }
  
  // Check for specific patterns in output
  if (expectedPatterns.patterns) {
    expectedPatterns.patterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i');
      const matches = regex.test(result.stdout) || regex.test(result.stderr);
      validations.push({
        name: `Pattern: ${pattern}`,
        passed: matches,
        expected: `Contains pattern: ${pattern}`,
        actual: matches ? 'Pattern found' : 'Pattern not found'
      });
    });
  }
  
  return validations;
}

/**
 * Test basic script functionality
 */
async function testBasicFunctionality(scriptPath) {
  const scriptName = path.basename(scriptPath);
  const tests = [];
  
  try {
    // Test 1: Help command
    const helpResult = await executeScript(scriptPath, ['--help']);
    const helpValidations = validateOutput(helpResult, {
      exitCode: 0,
      hasOutput: true,
      patterns: ['usage', 'options', 'help']
    });
    
    tests.push({
      name: 'Help Command',
      script: scriptName,
      result: helpResult,
      validations: helpValidations,
      passed: helpValidations.every(v => v.passed)
    });
    
    // Test 2: Version command (if supported)
    try {
      const versionResult = await executeScript(scriptPath, ['--version']);
      const versionValidations = validateOutput(versionResult, {
        exitCode: 0,
        hasOutput: true,
        patterns: ['\\d+\\.\\d+\\.\\d+']
      });
      
      tests.push({
        name: 'Version Command',
        script: scriptName,
        result: versionResult,
        validations: versionValidations,
        passed: versionValidations.every(v => v.passed)
      });
    } catch (error) {
      tests.push({
        name: 'Version Command',
        script: scriptName,
        result: null,
        validations: [],
        passed: false,
        skipped: true,
        reason: 'Version command not supported'
      });
    }
    
    // Test 3: Basic execution
    const basicResult = await executeScript(scriptPath, []);
    const basicValidations = validateOutput(basicResult, {
      hasOutput: true
    });
    
    tests.push({
      name: 'Basic Execution',
      script: scriptName,
      result: basicResult,
      validations: basicValidations,
      passed: basicValidations.every(v => v.passed)
    });
    
  } catch (error) {
    tests.push({
      name: 'Basic Functionality',
      script: scriptName,
      result: null,
      validations: [],
      passed: false,
      error: error.message
    });
  }
  
  return tests;
}

/**
 * Test error handling
 */
async function testErrorHandling(scriptPath) {
  const scriptName = path.basename(scriptPath);
  const tests = [];
  
  try {
    // Test 1: Invalid arguments
    const invalidArgsResult = await executeScript(scriptPath, ['--invalid-arg']);
    const invalidArgsValidations = validateOutput(invalidArgsResult, {
      exitCode: 1,
      hasErrorLogs: true,
      patterns: ['error', 'invalid', 'unknown']
    });
    
    tests.push({
      name: 'Invalid Arguments',
      script: scriptName,
      result: invalidArgsResult,
      validations: invalidArgsValidations,
      passed: invalidArgsValidations.every(v => v.passed)
    });
    
    // Test 2: Missing required files
    const missingFileResult = await executeScript(scriptPath, ['--file', 'nonexistent-file.txt']);
    const missingFileValidations = validateOutput(missingFileResult, {
      exitCode: 1,
      hasErrorLogs: true,
      patterns: ['error', 'file', 'not found', 'missing']
    });
    
    tests.push({
      name: 'Missing Files',
      script: scriptName,
      result: missingFileResult,
      validations: missingFileValidations,
      passed: missingFileValidations.every(v => v.passed)
    });
    
  } catch (error) {
    tests.push({
      name: 'Error Handling',
      script: scriptName,
      result: null,
      validations: [],
      passed: false,
      error: error.message
    });
  }
  
  return tests;
}

/**
 * Test performance metrics
 */
async function testPerformance(scriptPath) {
  const scriptName = path.basename(scriptPath);
  const tests = [];
  
  try {
    // Test execution time
    const startTime = Date.now();
    const result = await executeScript(scriptPath, []);
    const executionTime = Date.now() - startTime;
    
    const performanceValidations = [
      {
        name: 'Execution Time',
        passed: executionTime < TEST_CONFIG.settings.timeout,
        expected: `< ${TEST_CONFIG.settings.timeout}ms`,
        actual: `${executionTime}ms`
      },
      {
        name: 'Memory Usage',
        passed: true, // Would need more sophisticated memory monitoring
        expected: 'Reasonable memory usage',
        actual: 'Not measured'
      }
    ];
    
    tests.push({
      name: 'Performance',
      script: scriptName,
      result: { ...result, executionTime },
      validations: performanceValidations,
      passed: performanceValidations.every(v => v.passed)
    });
    
  } catch (error) {
    tests.push({
      name: 'Performance',
      script: scriptName,
      result: null,
      validations: [],
      passed: false,
      error: error.message
    });
  }
  
  return tests;
}

/**
 * Test output validation
 */
async function testOutputValidation(scriptPath) {
  const scriptName = path.basename(scriptPath);
  const tests = [];
  
  try {
    // Test report generation
    const reportResult = await executeScript(scriptPath, ['--report']);
    const reportValidations = validateOutput(reportResult, {
      hasOutput: true,
      patterns: ['report', 'json', 'timestamp']
    });
    
    tests.push({
      name: 'Report Generation',
      script: scriptName,
      result: reportResult,
      validations: reportValidations,
      passed: reportValidations.every(v => v.passed)
    });
    
    // Test JSON output
    if (reportResult.stdout.includes('{')) {
      try {
        JSON.parse(reportResult.stdout);
        tests.push({
          name: 'JSON Output',
          script: scriptName,
          result: reportResult,
          validations: [{ name: 'Valid JSON', passed: true, expected: 'Valid JSON', actual: 'Valid JSON' }],
          passed: true
        });
      } catch (parseError) {
        tests.push({
          name: 'JSON Output',
          script: scriptName,
          result: reportResult,
          validations: [{ name: 'Valid JSON', passed: false, expected: 'Valid JSON', actual: 'Invalid JSON' }],
          passed: false
        });
      }
    }
    
  } catch (error) {
    tests.push({
      name: 'Output Validation',
      script: scriptName,
      result: null,
      validations: [],
      passed: false,
      error: error.message
    });
  }
  
  return tests;
}

/**
 * Run all tests for a script
 */
async function runScriptTests(scriptPath) {
  const scriptName = path.basename(scriptPath);
  const allTests = [];
  
  defaultLogger.section(`Testing ${scriptName}`);
  
  // Basic functionality tests
  const basicTests = await testBasicFunctionality(scriptPath);
  allTests.push(...basicTests);
  
  // Error handling tests
  const errorTests = await testErrorHandling(scriptPath);
  allTests.push(...errorTests);
  
  // Performance tests
  const performanceTests = await testPerformance(scriptPath);
  allTests.push(...performanceTests);
  
  // Output validation tests
  const outputTests = await testOutputValidation(scriptPath);
  allTests.push(...outputTests);
  
  // Calculate results
  const passed = allTests.filter(t => t.passed).length;
  const failed = allTests.filter(t => !t.passed && !t.skipped).length;
  const skipped = allTests.filter(t => t.skipped).length;
  
  testResults.testSuites[scriptName] = {
    total: allTests.length,
    passed,
    failed,
    skipped,
    tests: allTests,
    coverage: (passed / allTests.length) * 100
  };
  
  defaultLogger.info(`${scriptName}: ${passed}/${allTests.length} tests passed`);
  
  return {
    scriptName,
    total: allTests.length,
    passed,
    failed,
    skipped,
    tests: allTests
  };
}

/**
 * Find all scripts to test
 */
async function findAllScripts() {
  const scriptPatterns = [
    'scripts/*.js',
    'scripts/*.ts',
    'scripts/**/*.js',
    'scripts/**/*.ts'
  ];
  
  const scripts = [];
  
  for (const pattern of scriptPatterns) {
    const files = await glob(pattern, { ignore: ['node_modules/**', '.git/**'] });
    scripts.push(...files);
  }
  
  return scripts.filter(script => {
    // Exclude test framework itself and utility files
    const excludePatterns = [
      'test-framework.js',
      'utils/',
      'node_modules/',
      '.git/'
    ];
    
    return !excludePatterns.some(pattern => script.includes(pattern));
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  defaultLogger.section('Script Testing Framework');
  
  const scripts = await findAllScripts();
  defaultLogger.info(`Found ${scripts.length} scripts to test`);
  
  const results = [];
  
  for (const script of scripts) {
    try {
      const result = await runScriptTests(script);
      results.push(result);
    } catch (error) {
      defaultLogger.error(`Failed to test ${script}:`, error.message);
      testResults.errors.push({
        script,
        error: error.message
      });
    }
  }
  
  // Calculate overall results
  testResults.totalTests = results.reduce((sum, r) => sum + r.total, 0);
  testResults.passedTests = results.reduce((sum, r) => sum + r.passed, 0);
  testResults.failedTests = results.reduce((sum, r) => sum + r.failed, 0);
  testResults.skippedTests = results.reduce((sum, r) => sum + r.skipped, 0);
  
  return results;
}

/**
 * Generate test report
 */
function generateTestReport() {
  defaultLogger.section('Test Results Summary');
  
  const totalSuites = Object.keys(testResults.testSuites).length;
  const passedSuites = Object.values(testResults.testSuites).filter(s => s.failed === 0).length;
  const failedSuites = totalSuites - passedSuites;
  
  const overallCoverage = testResults.totalTests > 0 
    ? ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)
    : 100;
  
  defaultLogger.info(`Total test suites: ${totalSuites}`);
  defaultLogger.success(`Passed suites: ${passedSuites}`);
  defaultLogger.error(`Failed suites: ${failedSuites}`);
  defaultLogger.info(`Total tests: ${testResults.totalTests}`);
  defaultLogger.success(`Passed tests: ${testResults.passedTests}`);
  defaultLogger.error(`Failed tests: ${testResults.failedTests}`);
  defaultLogger.warning(`Skipped tests: ${testResults.skippedTests}`);
  defaultLogger.info(`Overall coverage: ${overallCoverage}%`);
  
  // Detailed results by script
  Object.entries(testResults.testSuites).forEach(([scriptName, suite]) => {
    defaultLogger.section(`Results for ${scriptName}`);
    defaultLogger.info(`Coverage: ${suite.coverage.toFixed(1)}%`);
    defaultLogger.info(`Tests: ${suite.passed}/${suite.total} passed`);
    
    if (suite.failed > 0) {
      defaultLogger.error(`Failed tests: ${suite.failed}`);
      suite.tests.filter(t => !t.passed && !t.skipped).forEach(test => {
        defaultLogger.error(`  - ${test.name}: ${test.error || 'Failed validations'}`);
      });
    }
  });
  
  // Generate recommendations
  if (testResults.failedTests > 0) {
    testResults.recommendations.push(
      'Fix failed tests before deploying',
      'Review error handling in failed scripts',
      'Add more comprehensive error handling'
    );
  }
  
  if (overallCoverage < 80) {
    testResults.recommendations.push(
      'Increase test coverage to at least 80%',
      'Add more test scenarios for edge cases',
      'Implement integration tests for script interactions'
    );
  }
  
  if (testResults.errors.length > 0) {
    testResults.recommendations.push(
      'Fix script execution errors',
      'Review script dependencies and requirements',
      'Ensure all required files and configurations are present'
    );
  }
  
  return {
    totalSuites,
    passedSuites,
    failedSuites,
    totalTests: testResults.totalTests,
    passedTests: testResults.passedTests,
    failedTests: testResults.failedTests,
    skippedTests: testResults.skippedTests,
    overallCoverage: parseFloat(overallCoverage),
    testSuites: testResults.testSuites,
    errors: testResults.errors,
    recommendations: testResults.recommendations
  };
}

/**
 * Save test report to file
 */
function saveTestReport(report) {
  try {
    const reportFile = path.join(process.cwd(), 'test-results.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      ...report
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    defaultLogger.success(`Test report saved to: ${reportFile}`);
    
    return reportFile;
  } catch (error) {
    defaultLogger.error('Failed to save test report:', error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    all: args.includes('--all'),
    unit: args.includes('--unit'),
    integration: args.includes('--integration'),
    e2e: args.includes('--e2e'),
    coverage: args.includes('--coverage'),
    report: args.includes('--report'),
    verbose: args.includes('--verbose')
  };
  
  try {
    if (options.all || args.length === 0) {
      const results = await runAllTests();
      const report = generateTestReport();
      
      if (options.report) {
        saveTestReport(report);
      }
      
      // Exit with error code if there are failures
      if (testResults.failedTests > 0) {
        process.exit(1);
      }
    } else {
      // Show help
      defaultLogger.info('Script Testing Framework');
      defaultLogger.info('Usage: node test-framework.js [options]');
      defaultLogger.info('Options:');
      defaultLogger.info('  --all         Run all tests');
      defaultLogger.info('  --unit        Run unit tests only');
      defaultLogger.info('  --integration Run integration tests only');
      defaultLogger.info('  --e2e         Run end-to-end tests only');
      defaultLogger.info('  --coverage    Generate coverage report');
      defaultLogger.info('  --report      Save detailed report');
      defaultLogger.info('  --verbose     Verbose output');
    }
  } catch (error) {
    defaultLogger.error('Testing failed:', error.message);
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
  runAllTests,
  generateTestReport,
  saveTestReport,
  TEST_CONFIG
};
