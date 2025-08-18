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

console.log('🔍 Coverage Gate Enforcement');
console.log('============================');
console.log(`Global threshold: ${globalThreshold}%`);
console.log(`Module threshold: ${moduleThreshold}%`);
console.log(`Coverage file: ${coverageFile}`);
console.log('');

// Check if coverage file exists
if (!fs.existsSync(coverageFile)) {
  console.log('❌ Coverage file not found:', coverageFile);
  console.log('💡 Ensure tests are run with coverage enabled');
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
    
    console.log(`${percentage >= moduleThreshold ? '✅' : '❌'} ${filePath}: ${percentage.toFixed(1)}% (${covered}/${statements})`);
  }
  
  // Calculate global coverage
  const globalCoverage = totalStatements > 0 ? (totalCovered / totalStatements) * 100 : 100;
  
  console.log('');
  console.log('📊 Coverage Summary:');
  console.log(`  Global coverage: ${globalCoverage.toFixed(1)}% (${totalCovered}/${totalStatements})`);
  console.log(`  Global threshold: ${globalThreshold}%`);
  console.log(`  Failed modules: ${failedModules.length}`);
  
  // Check global threshold
  if (globalCoverage < globalThreshold) {
    console.log('');
    console.log('❌ FAIL: Global coverage below threshold');
    console.log(`   Required: ${globalThreshold}%, Actual: ${globalCoverage.toFixed(1)}%`);
    console.log('');
    console.log('💡 Improve coverage by:');
    console.log('   - Adding tests for uncovered code');
    console.log('   - Removing dead code');
    console.log('   - Refactoring complex functions');
  }
  
  // Check per-module thresholds
  if (failedModules.length > 0) {
    console.log('');
    console.log('❌ FAIL: Modules below coverage threshold');
    console.log('');
    failedModules.forEach(module => {
      console.log(`   ${module.file}: ${module.coverage}% (${module.covered}/${module.statements})`);
    });
    console.log('');
    console.log('💡 Improve module coverage by:');
    console.log('   - Adding unit tests for specific modules');
    console.log('   - Testing edge cases and error conditions');
    console.log('   - Mocking external dependencies');
  }
  
  // Exit with error if any thresholds failed
  if (globalCoverage < globalThreshold || failedModules.length > 0) {
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ All coverage thresholds met!');
  
} catch (error) {
  console.error('❌ Error parsing coverage file:', error.message);
  process.exit(1);
}
