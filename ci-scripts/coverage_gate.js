#!/usr/bin/env node

/**
 * Coverage Gate Enforcement
 * 
 * Enforces both global and per-module coverage thresholds:
 * - Global coverage: ≥ 80% (FE + BE combined)
 * - Per-module coverage: ≥ 70% (individual modules)
 * 
 * Supports both JSON and XML coverage reports:
 * - Jest: --coverage-reporters=json --coverage-reporters=xml
 * - Pytest: --cov-report=json --cov-report=xml
 * 
 * Usage: node coverage_gate.js [global-threshold] [module-threshold] [coverage-file]
 */

const fs = require('fs');
const path = require('path');

// Default thresholds
const DEFAULT_GLOBAL_THRESHOLD = 80;
const DEFAULT_MODULE_THRESHOLD = 70;

// Parse command line arguments
const globalThreshold = parseInt(process.argv[2]) || DEFAULT_GLOBAL_THRESHOLD;
const moduleThreshold = parseInt(process.argv[3]) || DEFAULT_MODULE_THRESHOLD;
const coverageFile = process.argv[4] || 'coverage/coverage-summary.json';

// Check if coverage file exists
if (!fs.existsSync(coverageFile)) {

  process.exit(1);
}

try {
  const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  
  let totalStatements = 0;
  let totalCovered = 0;
  let failedModules = [];
  
  // Process each file/module
  for (const [filePath, stats] of Object.entries(coverageData)) {
    const statements = stats.statements.total;
    const covered = stats.statements.covered;
    const percentage = statements > 0 ? (covered / statements) * 100 : 100;
    
    totalStatements += statements;
    totalCovered += covered;
    
    // Check per-module threshold
    if (percentage < moduleThreshold && statements > 0) {
      failedModules.push({
        file: filePath,
        coverage: percentage.toFixed(1),
        threshold: moduleThreshold,
        statements,
        covered
      });
    }

  }
  
  // Calculate global coverage
  const globalCoverage = totalStatements > 0 ? (totalCovered / totalStatements) * 100 : 100;

  // Check global threshold
  if (globalCoverage < globalThreshold) {

  }
  
  // Check per-module thresholds
  if (failedModules.length > 0) {

    failedModules.forEach(module => {

    });

  }
  
  // Exit with error if any thresholds failed
  if (globalCoverage < globalThreshold || failedModules.length > 0) {
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error parsing coverage file:', error.message);
  process.exit(1);
}
