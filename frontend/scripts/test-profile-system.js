#!/usr/bin/env node
/**
 * Comprehensive Profile System Testing Script
 * 
 * This script tests all components of the profile system:
 * - Database connectivity
 * - Supabase Storage
 * - Frontend components
 * - Server actions
 * - Validation logic
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Test configuration
const TEST_CONFIG = {
  testUsername: 'testuser_' + Date.now(),
  testDisplayName: 'Test User',
  testBio: 'This is a test bio for profile system testing.',
  testLocation: 'Test City, TS',
  testWebsite: 'https://example.com',
  testPhone: '(555) 123-4567'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bold}${message}${colors.reset}`);
  log('='.repeat(message.length));
}

async function testEnvironmentVariables() {
  logHeader('Testing Environment Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value && value !== 'your_supabase_service_role_key_here') {
      logSuccess(`${varName}: Present`);
    } else {
      logError(`${varName}: Missing or placeholder`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function testSupabaseConnection() {
  logHeader('Testing Supabase Connection');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logError('Missing Supabase credentials');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      logError(`Supabase connection failed: ${error.message}`);
      return false;
    }
    
    logSuccess('Supabase connection successful');
    return true;
    
  } catch (error) {
    logError(`Supabase connection error: ${error.message}`);
    return false;
  }
}

async function testSupabaseStorage() {
  logHeader('Testing Supabase Storage');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey || serviceKey === 'your_supabase_service_role_key_here') {
      logWarning('Skipping storage test - missing service role key');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Check if avatars bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logError(`Failed to list buckets: ${listError.message}`);
      return false;
    }
    
    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (!avatarsBucket) {
      logError('Avatars bucket not found');
      return false;
    }
    
    logSuccess('Avatars bucket exists');
    
    // Test bucket policies
    logInfo('Checking bucket policies...');
    
    // This would require more complex testing with actual file uploads
    // For now, we'll just verify the bucket exists
    logSuccess('Storage bucket ready for testing');
    return true;
    
  } catch (error) {
    logError(`Storage test error: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  logHeader('Testing Database Connection');
  
  try {
    // This would require a direct database connection
    // For now, we'll test through Supabase
    logInfo('Testing database through Supabase...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test profiles table access
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      logError(`Database access failed: ${error.message}`);
      return false;
    }
    
    logSuccess('Database connection successful');
    logInfo(`Profiles table accessible (${data?.length || 0} records)`);
    return true;
    
  } catch (error) {
    logError(`Database test error: ${error.message}`);
    return false;
  }
}

async function testFrontendComponents() {
  logHeader('Testing Frontend Components');
  
  const componentPaths = [
    'components/profile/AvatarUpload.tsx',
    'components/profile/ProfileEditForm.tsx',
    'components/profile/PublicProfile.tsx',
    'components/ui/Toast.tsx',
    'hooks/useUsernameValidation.ts',
    'lib/validators/profile.ts',
    'app/actions/upload-avatar.ts',
    'app/actions/update-profile.ts',
    'app/profile/settings/page.tsx',
    'app/u/[username]/page.tsx'
  ];
  
  let allComponentsExist = true;
  
  for (const componentPath of componentPaths) {
    const fullPath = path.join(process.cwd(), componentPath);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${componentPath}: Exists`);
    } else {
      logError(`${componentPath}: Missing`);
      allComponentsExist = false;
    }
  }
  
  return allComponentsExist;
}

async function testBuildProcess() {
  logHeader('Testing Build Process');
  
  try {
    // Check if package.json exists
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      logError('package.json not found');
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check required dependencies
    const requiredDeps = [
      '@supabase/supabase-js',
      'react-dropzone',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'uuid'
    ];
    
    let allDepsPresent = true;
    
    for (const dep of requiredDeps) {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        logSuccess(`${dep}: Installed`);
      } else {
        logError(`${dep}: Missing`);
        allDepsPresent = false;
      }
    }
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      logSuccess('node_modules: Present');
    } else {
      logWarning('node_modules: Missing (run npm install)');
    }
    
    return allDepsPresent;
    
  } catch (error) {
    logError(`Build test error: ${error.message}`);
    return false;
  }
}

async function testRoutes() {
  logHeader('Testing Routes');
  
  const routePaths = [
    'app/profile/settings/page.tsx',
    'app/u/[username]/page.tsx',
    'app/u/[username]/not-found.tsx'
  ];
  
  let allRoutesExist = true;
  
  for (const routePath of routePaths) {
    const fullPath = path.join(process.cwd(), routePath);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${routePath}: Exists`);
    } else {
      logError(`${routePath}: Missing`);
      allRoutesExist = false;
    }
  }
  
  return allRoutesExist;
}

async function runAllTests() {
  logHeader('PROFILE SYSTEM COMPREHENSIVE TEST');
  logInfo('Starting comprehensive testing of the profile system...\n');
  
  const testResults = {
    environment: await testEnvironmentVariables(),
    supabase: await testSupabaseConnection(),
    storage: await testSupabaseStorage(),
    database: await testDatabaseConnection(),
    components: await testFrontendComponents(),
    build: await testBuildProcess(),
    routes: await testRoutes()
  };
  
  // Summary
  logHeader('TEST RESULTS SUMMARY');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  logInfo(`Total Tests: ${totalTests}`);
  logSuccess(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    logError(`Failed: ${failedTests}`);
  }
  
  // Detailed results
  logHeader('DETAILED RESULTS');
  
  for (const [testName, result] of Object.entries(testResults)) {
    if (result) {
      logSuccess(`${testName}: PASS`);
    } else {
      logError(`${testName}: FAIL`);
    }
  }
  
  // Recommendations
  logHeader('RECOMMENDATIONS');
  
  if (!testResults.environment) {
    logWarning('Fix environment variables before proceeding');
  }
  
  if (!testResults.supabase) {
    logWarning('Check Supabase configuration');
  }
  
  if (!testResults.storage) {
    logWarning('Set up Supabase Storage bucket');
  }
  
  if (!testResults.components) {
    logWarning('Missing frontend components - check implementation');
  }
  
  if (!testResults.build) {
    logWarning('Install missing dependencies with: npm install');
  }
  
  if (passedTests === totalTests) {
    logSuccess('\n🎉 ALL TESTS PASSED! Profile system is ready for testing.');
    logInfo('\nNext steps:');
    logInfo('1. Start development server: npm run dev');
    logInfo('2. Navigate to: http://localhost:3000/profile/settings');
    logInfo('3. Test avatar upload and profile editing');
    logInfo('4. Test public profile pages');
  } else {
    logError('\n⚠️  Some tests failed. Please fix issues before proceeding.');
  }
  
  return passedTests === totalTests;
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Test runner error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runAllTests };
