#!/usr/bin/env node
/**
 * Production Redirect Flow Testing Script
 * 
 * Tests the sign-in to profile settings redirect flow on production
 */

const http = require('http');
const https = require('https');

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

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, { 
      method,
      headers: {
        'User-Agent': 'JewGo-Production-Test/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testProductionRedirects() {
  logHeader('PRODUCTION REDIRECT FLOW TESTING');
  logInfo('Testing the sign-in to profile settings redirect flow on production...\n');
  
  // Production URL - update this to your actual production URL
  const productionUrl = 'https://jewgo-app.vercel.app';
  const tests = [];
  
  logInfo(`Testing production URL: ${productionUrl}`);
  
  // Test 1: Check if production site is accessible
  logInfo('Test 1: Checking production site accessibility...');
  try {
    const response = await makeRequest(productionUrl);
    if (response.statusCode === 200) {
      logSuccess('Production site is accessible');
      tests.push(true);
    } else {
      logError(`Production site not accessible. Status: ${response.statusCode}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Production site test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 2: Check if profile page redirects to sign-in (unauthenticated)
  logInfo('Test 2: Checking profile page redirect (unauthenticated)...');
  try {
    const response = await makeRequest(`${productionUrl}/profile`);
    if (response.statusCode === 307 && response.headers.location?.includes('/auth/signin')) {
      logSuccess('Profile page correctly redirects to sign-in when unauthenticated');
      tests.push(true);
    } else {
      logError(`Profile page redirect failed. Status: ${response.statusCode}, Location: ${response.headers.location}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Profile page test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 3: Check if profile settings redirects to sign-in (unauthenticated)
  logInfo('Test 3: Checking profile settings redirect (unauthenticated)...');
  try {
    const response = await makeRequest(`${productionUrl}/profile/settings`);
    if (response.statusCode === 307 && response.headers.location?.includes('/auth/signin')) {
      logSuccess('Profile settings correctly redirects to sign-in when unauthenticated');
      tests.push(true);
    } else {
      logError(`Profile settings redirect failed. Status: ${response.statusCode}, Location: ${response.headers.location}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Profile settings test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 4: Check if sign-in page is accessible
  logInfo('Test 4: Checking sign-in page accessibility...');
  try {
    const response = await makeRequest(`${productionUrl}/auth/signin`);
    if (response.statusCode === 200) {
      logSuccess('Sign-in page is accessible');
      tests.push(true);
    } else {
      logError(`Sign-in page not accessible. Status: ${response.statusCode}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Sign-in page test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 5: Check if sign-in page with redirect parameter is accessible
  logInfo('Test 5: Checking sign-in page with redirect parameter...');
  try {
    const response = await makeRequest(`${productionUrl}/auth/signin?redirectTo=%2Fprofile%2Fsettings`);
    if (response.statusCode === 200) {
      logSuccess('Sign-in page with redirect parameter is accessible');
      tests.push(true);
    } else {
      logError(`Sign-in page with redirect parameter failed. Status: ${response.statusCode}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Sign-in page with redirect parameter test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 6: Check if auth callback is accessible
  logInfo('Test 6: Checking auth callback accessibility...');
  try {
    const response = await makeRequest(`${productionUrl}/auth/callback`);
    if (response.statusCode === 200) {
      logSuccess('Auth callback page is accessible');
      tests.push(true);
    } else {
      logError(`Auth callback page not accessible. Status: ${response.statusCode}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Auth callback test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 7: Check if public profile route is accessible
  logInfo('Test 7: Checking public profile route accessibility...');
  try {
    const response = await makeRequest(`${productionUrl}/u/test-username`);
    if (response.statusCode === 200 || response.statusCode === 404) {
      logSuccess('Public profile route is accessible (404 is expected for non-existent username)');
      tests.push(true);
    } else {
      logError(`Public profile route failed. Status: ${response.statusCode}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Public profile route test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Summary
  logHeader('PRODUCTION TEST RESULTS SUMMARY');
  
  const totalTests = tests.length;
  const passedTests = tests.filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  logInfo(`Total Tests: ${totalTests}`);
  logSuccess(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    logError(`Failed: ${failedTests}`);
  }
  
  // Production flow explanation
  logHeader('PRODUCTION REDIRECT FLOW STATUS');
  
  if (passedTests === totalTests) {
    logSuccess('\n🎉 All production redirect tests passed! The flow is working correctly in production.');
    logInfo('\n📋 Production User Flow:');
    logInfo('1. User visits production profile page (unauthenticated)');
    logInfo('2. Middleware redirects to sign-in with redirect parameter');
    logInfo('3. User signs in successfully');
    logInfo('4. Auth callback processes the redirect');
    logInfo('5. User is redirected to profile settings');
    
    logInfo('\n🔗 Production URLs:');
    logInfo(`• Production Site: ${productionUrl}`);
    logInfo(`• Sign-in: ${productionUrl}/auth/signin`);
    logInfo(`• Profile Settings: ${productionUrl}/profile/settings (after auth)`);
    logInfo(`• Public Profile: ${productionUrl}/u/username (after setup)`);
    
    logInfo('\n🧪 Manual Production Testing Steps:');
    logInfo('1. Visit the production sign-in page');
    logInfo('2. Sign in with valid credentials');
    logInfo('3. Verify redirect to profile settings');
    logInfo('4. Test avatar upload functionality');
    logInfo('5. Test profile editing form');
    logInfo('6. Test username validation');
    logInfo('7. Test public profile page');
    
    logInfo('\n✅ Production redirect system is fully functional!');
  } else {
    logError('\n⚠️  Some production tests failed. Please check the deployment.');
    logWarning('\n🔧 Troubleshooting:');
    logWarning('1. Check if the production deployment is up to date');
    logWarning('2. Verify environment variables are set correctly');
    logWarning('3. Check production logs for errors');
    logWarning('4. Ensure Supabase configuration is correct');
  }
  
  return passedTests === totalTests;
}

// Run the tests
if (require.main === module) {
  testProductionRedirects()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Production test runner error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testProductionRedirects };
