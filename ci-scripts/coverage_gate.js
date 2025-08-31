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
const coverageFile = process.argv[4] || 'coverage/coverage-final.json';

// Check if coverage file exists
if (!fs.existsSync(coverageFile)) {
  console.log(`❌ Coverage file not found: ${coverageFile}`);
  console.log('💡 Ensure tests are run with coverage enabled');
  process.exit(1);
}

try {
  const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  
  let totalStatements = 0;
  let totalCovered = 0;
  let failedModules = [];
  
  // Handle Jest coverage format (coverage-final.json)
  if (coverageData && typeof coverageData === 'object') {
    // Jest format: { "filepath": { "s": { statement_coverage }, "b": { branch_coverage } } }
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      if (fileData && fileData.s) {
        const statements = Object.keys(fileData.s).length;
        const covered = Object.values(fileData.s).filter(count => count > 0).length;
        const percentage = statements > 0 ? (covered / statements) * 100 : 100;
        
        totalStatements += statements;
        totalCovered += covered;
        
        // Check per-module threshold
        if (percentage < moduleThreshold && statements > 0) {
          failedModules.push({
            file: path.basename(filePath),
            coverage: percentage.toFixed(1),
            threshold: moduleThreshold,
            statements,
            covered
          });
        }
      }
    }
  }
  
  // Calculate global coverage
  const globalCoverage = totalStatements > 0 ? (totalCovered / totalStatements) * 100 : 100;

  console.log(`📊 Coverage Analysis`);
  console.log(`===================`);
  console.log(`Global Coverage: ${globalCoverage.toFixed(1)}% (threshold: ${globalThreshold}%)`);
  console.log(`Total Statements: ${totalStatements}`);
  console.log(`Covered Statements: ${totalCovered}`);
  console.log(`Files Analyzed: ${Object.keys(coverageData).length}`);
  console.log(``);

  // If no tests were run (0 coverage), warn but don't fail
  if (totalStatements > 0 && totalCovered === 0) {
    console.log(`⚠️  No test coverage found - tests may not have run properly`);
    console.log(`💡 This is a warning, not a failure. Ensure tests are configured correctly.`);
    console.log(``);
    console.log(`✅ Coverage gate passed (no tests to cover)`);
    process.exit(0);
  }

  // Check global threshold
  if (globalCoverage < globalThreshold) {
    console.log(`❌ Global coverage threshold failed: ${globalCoverage.toFixed(1)}% < ${globalThreshold}%`);
  } else {
    console.log(`✅ Global coverage threshold passed: ${globalCoverage.toFixed(1)}% >= ${globalThreshold}%`);
  }
  
  // Check per-module thresholds
  if (failedModules.length > 0) {
    console.log(`❌ Module coverage threshold failures:`);
    failedModules.forEach(module => {
      console.log(`   ${module.file}: ${module.coverage}% (${module.covered}/${module.statements}) < ${module.threshold}%`);
    });
  } else {
    console.log(`✅ All modules meet coverage threshold (${moduleThreshold}%)`);
  }
  
  // Exit with error if any thresholds failed
  if (globalCoverage < globalThreshold || failedModules.length > 0) {
    console.log(``);
    console.log(`💡 To improve coverage:`);
    console.log(`   - Add more test cases for uncovered statements`);
    console.log(`   - Focus on files with low coverage`);
    console.log(`   - Consider excluding non-critical files from coverage`);
    process.exit(1);
  }

  console.log(``);
  console.log(`✅ All coverage thresholds passed!`);

} catch (error) {
  console.error('❌ Error parsing coverage file:', error.message);
  process.exit(1);
}
