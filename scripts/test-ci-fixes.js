#!/usr/bin/env node

/**
 * Test CI/CD Pipeline v2 and MCP Validation Fixes
 * 
 * This script verifies that all the fixes applied to the CI/CD pipeline
 * and MCP validation are working correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Testing CI/CD Pipeline v2 and MCP Validation Fixes\n');

// Test results
const results = {
  frontend: {},
  backend: {},
  mcp: {},
  ci: {}
};

// Helper function to run commands safely
function runCommand(command, cwd = '.') {
  try {
    const output = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test 1: Frontend TypeScript compilation
console.log('1️⃣ Testing Frontend TypeScript compilation...');
const tscResult = runCommand('npm run type-check', 'frontend');
results.frontend.typescript = tscResult.success;
console.log(tscResult.success ? '✅ TypeScript compilation passed' : '❌ TypeScript compilation failed');

// Test 2: Frontend ESLint (should pass with warnings)
console.log('\n2️⃣ Testing Frontend ESLint...');
const lintResult = runCommand('npm run lint', 'frontend');
results.frontend.eslint = lintResult.success;
console.log(lintResult.success ? '✅ ESLint passed (warnings are acceptable)' : '❌ ESLint failed');

// Test 3: Frontend Build
console.log('\n3️⃣ Testing Frontend Build...');
const buildResult = runCommand('npm run build', 'frontend');
results.frontend.build = buildResult.success;
console.log(buildResult.success ? '✅ Frontend build passed' : '❌ Frontend build failed');

// Test 4: Backend Python imports
console.log('\n4️⃣ Testing Backend Python imports...');
const pythonResult = runCommand('python -c "import routes.api_v4; print(\'API v4 import successful\')"', 'backend');
results.backend.imports = pythonResult.success;
console.log(pythonResult.success ? '✅ Backend imports passed' : '❌ Backend imports failed');

// Test 5: Backend Dependencies
console.log('\n5️⃣ Testing Backend Dependencies...');
const depsResult = runCommand('python -c "from dateutil import parser; from playwright.async_api import async_playwright; print(\'Dependencies OK\')"', 'backend');
results.backend.dependencies = depsResult.success;
console.log(depsResult.success ? '✅ Backend dependencies passed' : '❌ Backend dependencies failed');

// Test 6: MCP Tools Build
console.log('\n6️⃣ Testing MCP Tools Build...');
const mcpBuildResult = runCommand('npm run build', 'tools/ci-guard-mcp');
results.mcp.ciGuardBuild = mcpBuildResult.success;
console.log(mcpBuildResult.success ? '✅ CI Guard MCP build passed' : '❌ CI Guard MCP build failed');

const tsMcpBuildResult = runCommand('npm run build', 'tools/ts-next-strict-mcp');
results.mcp.tsBuild = tsMcpBuildResult.success;
console.log(tsMcpBuildResult.success ? '✅ TS Next Strict MCP build passed' : '❌ TS Next Strict MCP build failed');

// Test 7: CI Configuration Files
console.log('\n7️⃣ Testing CI Configuration Files...');
const ciFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/mcp-validation.yml',
  '.github/workflows/premerge-guard.yml'
];

results.ci.configFiles = ciFiles.every(file => fs.existsSync(file));
console.log(results.ci.configFiles ? '✅ CI configuration files exist' : '❌ Missing CI configuration files');

// Test 8: Node.js Version Consistency
console.log('\n8️⃣ Testing Node.js Version Consistency...');
const nodeVersion = process.version;
const isNode22 = nodeVersion.startsWith('v22');
results.ci.nodeVersion = isNode22;
console.log(isNode22 ? '✅ Node.js 22.x detected' : `❌ Expected Node.js 22.x, got ${nodeVersion}`);

// Test 9: Package.json Scripts
console.log('\n9️⃣ Testing Package.json Scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['mcp:build', 'mcp:install'];
results.ci.scripts = requiredScripts.every(script => packageJson.scripts && packageJson.scripts[script]);
console.log(results.ci.scripts ? '✅ Required package.json scripts exist' : '❌ Missing required package.json scripts');

// Test 10: ESLint Fixes Applied
console.log('\n🔟 Testing ESLint Fixes Applied...');
const testFile = 'frontend/app/api/auth.disabled/register/route.ts';
const fileContent = fs.readFileSync(testFile, 'utf8');
const hasFixedVariable = fileContent.includes('_emailError');
results.frontend.eslintFixes = hasFixedVariable;
console.log(hasFixedVariable ? '✅ ESLint fixes applied' : '❌ ESLint fixes not applied');

// Summary
console.log('\n📊 Test Summary');
console.log('==============');

const allTests = [
  { name: 'Frontend TypeScript', result: results.frontend.typescript },
  { name: 'Frontend ESLint', result: results.frontend.eslint },
  { name: 'Frontend Build', result: results.frontend.build },
  { name: 'Backend Imports', result: results.backend.imports },
  { name: 'Backend Dependencies', result: results.backend.dependencies },
  { name: 'MCP CI Guard Build', result: results.mcp.ciGuardBuild },
  { name: 'MCP TS Build', result: results.mcp.tsBuild },
  { name: 'CI Config Files', result: results.ci.configFiles },
  { name: 'Node.js Version', result: results.ci.nodeVersion },
  { name: 'Package.json Scripts', result: results.ci.scripts },
  { name: 'ESLint Fixes', result: results.frontend.eslintFixes }
];

const passedTests = allTests.filter(test => test.result).length;
const totalTests = allTests.length;

allTests.forEach(test => {
  console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All CI/CD Pipeline v2 and MCP Validation fixes are working correctly!');
  console.log('\n📋 Fixed Issues:');
  console.log('• ✅ Missing python-dateutil dependency installed');
  console.log('• ✅ Missing playwright dependency installed');
  console.log('• ✅ ESLint unused variable warnings fixed');
  console.log('• ✅ MCP tools properly built');
  console.log('• ✅ CI pipeline configuration updated');
  console.log('• ✅ Node.js version consistency ensured');
  console.log('• ✅ Backend import errors resolved');
  console.log('• ✅ Frontend build process working');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the issues above.');
  process.exit(1);
}
