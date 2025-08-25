#!/usr/bin/env node

/**
 * Test and Demo Files Validation Script
 * =====================================
 * 
 * This script validates that test and demo files follow the established
 * guidelines for file organization, naming conventions, and cleanup practices.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category validation
 * 
 * @dependencies Node.js, fs, path, glob
 * @requires Test and demo file guidelines compliance
 * 
 * @usage node validate-test-demo-files.js [options]
 * @options --strict, --fix, --report, --check-all
 * 
 * @example
 * node validate-test-demo-files.js --strict --report
 * 
 * @returns Validation results and compliance report
 * @throws Validation errors and non-compliance issues
 * 
 * @see Test and demo file guidelines documentation
 * @see File organization and naming conventions
 */

const fs = require('fs');
const path = require('path');
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

// Validation configuration
const VALIDATION_CONFIG = {
  // File patterns to validate
  patterns: {
    // Test files (should be in test directories)
    testFiles: [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ],
    
    // Temporary test files (should be cleaned up)
    tempTestFiles: [
      '**/test-*.js',
      '**/test-*.ts',
      '**/test-*.tsx',
      '**/debug-*.js',
      '**/debug-*.ts',
      '**/debug-*.tsx',
      '**/temp-*.js',
      '**/temp-*.ts',
      '**/temp-*.tsx'
    ],
    
    // Demo files (should be in demo directories)
    demoFiles: [
      '**/demo-*.js',
      '**/demo-*.ts',
      '**/demo-*.tsx',
      '**/example-*.js',
      '**/example-*.ts',
      '**/example-*.tsx'
    ],
    
    // Temporary files (should be cleaned up)
    tempFiles: [
      '**/temp-*.js',
      '**/temp-*.ts',
      '**/temp-*.tsx',
      '**/dev-*.js',
      '**/dev-*.ts',
      '**/dev-*.tsx',
      '**/setup-*.js',
      '**/setup-*.ts',
      '**/setup-*.tsx'
    ]
  },
  
  // Allowed directories for different file types
  allowedDirectories: {
    testFiles: [
      '__tests__',
      'tests',
      'test',
      'cypress',
      'e2e',
      'spec'
    ],
    demoFiles: [
      'docs/demos',
      'examples',
      'prototypes',
      'demos'
    ],
    tempFiles: [
      'temp',
      'tmp',
      'scratch'
    ]
  },
  
  // Prohibited directories
  prohibitedDirectories: [
    'app',
    'components',
    'lib',
    'utils',
    'public'
  ],
  
  // File naming conventions
  namingConventions: {
    // Allowed patterns
    allowed: [
      /^[A-Z][a-zA-Z0-9]*\.(test|spec)\.(js|ts|tsx)$/, // ComponentName.test.tsx
      /^[a-z][a-zA-Z0-9]*\.(test|spec)\.(js|ts|tsx)$/, // utils.test.ts
      /^[A-Z][a-zA-Z0-9]*\.(js|ts|tsx)$/ // ComponentName.tsx
    ],
    
    // Prohibited patterns
    prohibited: [
      /^test-/, // test-ComponentName
      /^debug-/, // debug-ComponentName
      /^temp-/, // temp-ComponentName
      /^demo-/, // demo-ComponentName
      /^example-/, // example-ComponentName
      /^Test[A-Z]/, // TestComponentName
      /^Debug[A-Z]/, // DebugComponentName
      /^Demo[A-Z]/, // DemoComponentName
      /^Example[A-Z]/ // ExampleComponentName
    ]
  }
};

// Validation results
let validationResults = {
  totalFiles: 0,
  compliantFiles: 0,
  nonCompliantFiles: 0,
  errors: [],
  warnings: [],
  recommendations: []
};

/**
 * Check if file is in allowed directory
 */
function isInAllowedDirectory(filePath, allowedDirs) {
  const relativePath = path.relative(process.cwd(), filePath);
  const dirs = relativePath.split(path.sep);
  
  return allowedDirs.some(allowedDir => {
    const allowedParts = allowedDir.split('/');
    for (let i = 0; i <= dirs.length - allowedParts.length; i++) {
      if (allowedParts.every((part, j) => dirs[i + j] === part)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Check if file is in prohibited directory
 */
function isInProhibitedDirectory(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const dirs = relativePath.split(path.sep);
  
  return VALIDATION_CONFIG.prohibitedDirectories.some(prohibitedDir => {
    return dirs.includes(prohibitedDir);
  });
}

/**
 * Validate file naming convention
 */
function validateNamingConvention(fileName) {
  // Check if name matches any prohibited patterns
  const isProhibited = VALIDATION_CONFIG.namingConventions.prohibited.some(pattern => 
    pattern.test(fileName)
  );
  
  if (isProhibited) {
    return {
      valid: false,
      reason: `File name '${fileName}' matches prohibited pattern`
    };
  }
  
  // Check if name matches any allowed patterns
  const isAllowed = VALIDATION_CONFIG.namingConventions.allowed.some(pattern => 
    pattern.test(fileName)
  );
  
  if (isAllowed) {
    return {
      valid: true,
      reason: `File name '${fileName}' follows naming convention`
    };
  }
  
  return {
    valid: false,
    reason: `File name '${fileName}' does not follow naming convention`
  };
}

/**
 * Validate test files
 */
function validateTestFiles(files) {
  defaultLogger.section('Validating Test Files');
  
  for (const file of files) {
    validationResults.totalFiles++;
    
    const fileName = path.basename(file);
    const relativePath = path.relative(process.cwd(), file);
    
    // Check if file is in allowed test directory
    const inAllowedDir = isInAllowedDirectory(file, VALIDATION_CONFIG.allowedDirectories.testFiles);
    const inProhibitedDir = isInProhibitedDirectory(file);
    
    if (inProhibitedDir) {
      validationResults.nonCompliantFiles++;
      validationResults.errors.push({
        file: relativePath,
        type: 'ERROR',
        message: `Test file in prohibited directory: ${relativePath}`,
        recommendation: 'Move to __tests__/ directory'
      });
      continue;
    }
    
    if (!inAllowedDir) {
      validationResults.nonCompliantFiles++;
      validationResults.warnings.push({
        file: relativePath,
        type: 'WARNING',
        message: `Test file not in test directory: ${relativePath}`,
        recommendation: 'Consider moving to __tests__/ directory'
      });
    }
    
    // Validate naming convention
    const namingValidation = validateNamingConvention(fileName);
    if (!namingValidation.valid) {
      validationResults.nonCompliantFiles++;
      validationResults.warnings.push({
        file: relativePath,
        type: 'WARNING',
        message: namingValidation.reason,
        recommendation: 'Use ComponentName.test.tsx format'
      });
    }
    
    if (inAllowedDir && namingValidation.valid) {
      validationResults.compliantFiles++;
    }
  }
}

/**
 * Validate demo files
 */
function validateDemoFiles(files) {
  defaultLogger.section('Validating Demo Files');
  
  for (const file of files) {
    validationResults.totalFiles++;
    
    const fileName = path.basename(file);
    const relativePath = path.relative(process.cwd(), file);
    
    // Check if file is in allowed demo directory
    const inAllowedDir = isInAllowedDirectory(file, VALIDATION_CONFIG.allowedDirectories.demoFiles);
    const inProhibitedDir = isInProhibitedDirectory(file);
    
    if (inProhibitedDir) {
      validationResults.nonCompliantFiles++;
      validationResults.errors.push({
        file: relativePath,
        type: 'ERROR',
        message: `Demo file in prohibited directory: ${relativePath}`,
        recommendation: 'Move to docs/demos/ or examples/ directory'
      });
      continue;
    }
    
    if (!inAllowedDir) {
      validationResults.nonCompliantFiles++;
      validationResults.warnings.push({
        file: relativePath,
        type: 'WARNING',
        message: `Demo file not in demo directory: ${relativePath}`,
        recommendation: 'Consider moving to docs/demos/ or examples/ directory'
      });
    }
    
    // Validate naming convention
    const namingValidation = validateNamingConvention(fileName);
    if (!namingValidation.valid) {
      validationResults.nonCompliantFiles++;
      validationResults.warnings.push({
        file: relativePath,
        type: 'WARNING',
        message: namingValidation.reason,
        recommendation: 'Use DemoName.tsx or ExampleName.tsx format'
      });
    }
    
    if (inAllowedDir && namingValidation.valid) {
      validationResults.compliantFiles++;
    }
  }
}

/**
 * Validate temporary files
 */
function validateTempFiles(files) {
  defaultLogger.section('Validating Temporary Files');
  
  for (const file of files) {
    validationResults.totalFiles++;
    
    const fileName = path.basename(file);
    const relativePath = path.relative(process.cwd(), file);
    
    // Check if file is in allowed temp directory
    const inAllowedDir = isInAllowedDirectory(file, VALIDATION_CONFIG.allowedDirectories.tempFiles);
    const inProhibitedDir = isInProhibitedDirectory(file);
    
    if (inProhibitedDir) {
      validationResults.nonCompliantFiles++;
      validationResults.errors.push({
        file: relativePath,
        type: 'ERROR',
        message: `Temporary file in prohibited directory: ${relativePath}`,
        recommendation: 'Move to temp/ directory or clean up'
      });
      continue;
    }
    
    if (!inAllowedDir) {
      validationResults.nonCompliantFiles++;
      validationResults.warnings.push({
        file: relativePath,
        type: 'WARNING',
        message: `Temporary file not in temp directory: ${relativePath}`,
        recommendation: 'Consider moving to temp/ directory or cleaning up'
      });
    }
    
    // Check for date in filename (good practice for temp files)
    const hasDate = /\d{8}|\d{4}-\d{2}-\d{2}/.test(fileName);
    if (!hasDate) {
      validationResults.warnings.push({
        file: relativePath,
        type: 'WARNING',
        message: `Temporary file without date: ${relativePath}`,
        recommendation: 'Add date to filename (e.g., temp-script-20250825.js)'
      });
    }
    
    if (inAllowedDir && hasDate) {
      validationResults.compliantFiles++;
    }
  }
}

/**
 * Generate validation report
 */
function generateValidationReport() {
  defaultLogger.section('Validation Report');
  
  const complianceRate = validationResults.totalFiles > 0 
    ? ((validationResults.compliantFiles / validationResults.totalFiles) * 100).toFixed(1)
    : 100;
  
  defaultLogger.info(`Total files validated: ${validationResults.totalFiles}`);
  defaultLogger.success(`Compliant files: ${validationResults.compliantFiles}`);
  defaultLogger.error(`Non-compliant files: ${validationResults.nonCompliantFiles}`);
  defaultLogger.info(`Compliance rate: ${complianceRate}%`);
  
  if (validationResults.errors.length > 0) {
    defaultLogger.section('Errors (Must Fix)');
    for (const error of validationResults.errors) {
      defaultLogger.error(`${error.file}: ${error.message}`);
      defaultLogger.info(`  Recommendation: ${error.recommendation}`);
    }
  }
  
  if (validationResults.warnings.length > 0) {
    defaultLogger.section('Warnings (Should Fix)');
    for (const warning of validationResults.warnings) {
      defaultLogger.warning(`${warning.file}: ${warning.message}`);
      defaultLogger.info(`  Recommendation: ${warning.recommendation}`);
    }
  }
  
  if (validationResults.recommendations.length > 0) {
    defaultLogger.section('General Recommendations');
    for (const recommendation of validationResults.recommendations) {
      defaultLogger.info(`- ${recommendation}`);
    }
  }
  
  // Generate recommendations based on findings
  if (validationResults.nonCompliantFiles > 0) {
    validationResults.recommendations.push(
      'Review and reorganize test/demo files according to guidelines',
      'Consider running automated cleanup scripts',
      'Update team documentation on file organization'
    );
  }
  
  if (validationResults.errors.length > 0) {
    validationResults.recommendations.push(
      'Fix all errors before committing changes',
      'Review file placement and naming conventions'
    );
  }
  
  return {
    complianceRate: parseFloat(complianceRate),
    totalFiles: validationResults.totalFiles,
    compliantFiles: validationResults.compliantFiles,
    nonCompliantFiles: validationResults.nonCompliantFiles,
    errors: validationResults.errors,
    warnings: validationResults.warnings,
    recommendations: validationResults.recommendations
  };
}

/**
 * Save validation report to file
 */
function saveValidationReport(report) {
  try {
    const reportFile = path.join(process.cwd(), 'validation-report.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      ...report
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    defaultLogger.success(`Validation report saved to: ${reportFile}`);
    
    return reportFile;
  } catch (error) {
    defaultLogger.error('Failed to save validation report:', error.message);
    return null;
  }
}

/**
 * Main validation function
 */
async function validateTestDemoFiles() {
  defaultLogger.section('Test and Demo Files Validation');
  
  try {
    // Find all files matching patterns
    const testFiles = await glob(VALIDATION_CONFIG.patterns.testFiles, { ignore: ['node_modules/**', '.git/**', 'sandbox/**', '**/node_modules/**', '**/sandbox/**'] });
    const tempTestFiles = await glob(VALIDATION_CONFIG.patterns.tempTestFiles, { ignore: ['node_modules/**', '.git/**', 'sandbox/**', '__tests__/**', 'tests/**', 'test/**', 'cypress/**', '**/node_modules/**', '**/sandbox/**'] });
    const demoFiles = await glob(VALIDATION_CONFIG.patterns.demoFiles, { ignore: ['node_modules/**', '.git/**', 'sandbox/**', 'docs/demos/**', 'examples/**', 'prototypes/**', '**/node_modules/**', '**/sandbox/**'] });
    const tempFiles = await glob(VALIDATION_CONFIG.patterns.tempFiles, { ignore: ['node_modules/**', '.git/**', 'sandbox/**', 'temp/**', 'tmp/**', 'scratch/**', '**/node_modules/**', '**/sandbox/**'] });
    
    defaultLogger.info(`Found ${testFiles.length} test files`);
    defaultLogger.info(`Found ${tempTestFiles.length} temporary test files`);
    defaultLogger.info(`Found ${demoFiles.length} demo files`);
    defaultLogger.info(`Found ${tempFiles.length} temporary files`);
    
    // Validate each category
    validateTestFiles(testFiles);
    validateTempFiles(tempTestFiles);
    validateDemoFiles(demoFiles);
    validateTempFiles(tempFiles);
    
    // Generate and display report
    const report = generateValidationReport();
    
    // Save report if requested
    if (process.argv.includes('--report')) {
      saveValidationReport(report);
    }
    
    // Exit with error code if there are errors
    if (validationResults.errors.length > 0) {
      process.exit(1);
    }
    
    return report;
  } catch (error) {
    defaultLogger.error('Validation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    strict: args.includes('--strict'),
    fix: args.includes('--fix'),
    report: args.includes('--report'),
    checkAll: args.includes('--check-all')
  };
  
  try {
    const report = await validateTestDemoFiles();
    
    if (options.strict && report.complianceRate < 100) {
      defaultLogger.error('Strict mode: Compliance rate must be 100%');
      process.exit(1);
    }
    
    if (report.complianceRate === 100) {
      defaultLogger.success('✅ All files comply with test/demo file guidelines');
    } else {
      defaultLogger.warning(`⚠️  ${report.nonCompliantFiles} files need attention`);
    }
  } catch (error) {
    defaultLogger.error('Validation script failed:', error.message);
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
  validateTestDemoFiles,
  generateValidationReport,
  saveValidationReport,
  VALIDATION_CONFIG
};
