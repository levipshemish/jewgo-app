#!/usr/bin/env node
/**
 * Debug Redirect Issue Script
 * 
 * Helps debug why redirects change the URL but don't update the page content
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

function makeRequest(url, method = 'GET', followRedirects = true) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, { 
      method,
      headers: {
        'User-Agent': 'JewGo-Debug-Test/1.0'
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
          data: data,
          url: url
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

async function debugRedirectIssue() {
  logHeader('DEBUGGING REDIRECT ISSUE');
  logInfo('Investigating why redirects change URL but not page content...\n');
  
  const baseUrl = 'http://localhost:3002';
  const tests = [];
  
  // Test 1: Check if profile page redirects properly
  logInfo('Test 1: Checking profile page redirect behavior...');
  try {
    const response = await makeRequest(`${baseUrl}/profile`);
    logInfo(`Status: ${response.statusCode}`);
    logInfo(`Location: ${response.headers.location}`);
    logInfo(`Content-Type: ${response.headers['content-type']}`);
    
    if (response.statusCode === 307 && response.headers.location?.includes('/auth/signin')) {
      logSuccess('Profile page correctly redirects to sign-in');
      tests.push(true);
    } else {
      logError(`Profile page redirect failed. Status: ${response.statusCode}, Location: ${response.headers.location}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Profile page test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 2: Check sign-in page content
  logInfo('Test 2: Checking sign-in page content...');
  try {
    const response = await makeRequest(`${baseUrl}/auth/signin`);
    logInfo(`Status: ${response.statusCode}`);
    logInfo(`Content-Type: ${response.headers['content-type']}`);
    logInfo(`Content Length: ${response.data.length} characters`);
    
    // Check if the page contains expected content
    const hasSignInForm = response.data.includes('Sign in to JewGo');
    const hasEmailField = response.data.includes('email');
    const hasPasswordField = response.data.includes('password');
    
    if (response.statusCode === 200 && hasSignInForm) {
      logSuccess('Sign-in page loads correctly with form');
      tests.push(true);
    } else {
      logError(`Sign-in page content issue. Has form: ${hasSignInForm}, Has email: ${hasEmailField}, Has password: ${hasPasswordField}`);
      tests.push(false);
    }
  } catch (error) {
    logError(`Sign-in page test failed: ${error.message}`);
    tests.push(false);
  }
  
  // Test 3: Check profile settings page (should redirect if not authenticated)
  logInfo('Test 3: Checking profile settings page...');
  try {
    const response = await makeRequest(`${baseUrl}/profile/settings`);
    logInfo(`Status: ${response.statusCode}`);
    logInfo(`Location: ${response.headers.location}`);
    
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
  
  // Test 4: Check if there are any JavaScript errors in the response
  logInfo('Test 4: Checking for JavaScript errors in responses...');
  try {
    const signInResponse = await makeRequest(`${baseUrl}/auth/signin`);
    const hasScriptErrors = signInResponse.data.includes('error') || signInResponse.data.includes('Error');
    
    if (!hasScriptErrors) {
      logSuccess('No obvious JavaScript errors found in sign-in page');
      tests.push(true);
    } else {
      logWarning('Potential JavaScript errors found in sign-in page');
      tests.push(true); // Not necessarily a failure
    }
  } catch (error) {
    logError(`JavaScript error check failed: ${error.message}`);
    tests.push(false);
  }
  
  // Summary
  logHeader('DEBUG RESULTS SUMMARY');
  
  const totalTests = tests.length;
  const passedTests = tests.filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  logInfo(`Total Tests: ${totalTests}`);
  logSuccess(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    logError(`Failed: ${failedTests}`);
  }
  
  // Analysis and recommendations
  logHeader('ANALYSIS AND RECOMMENDATIONS');
  
  if (passedTests === totalTests) {
    logSuccess('\n🎉 All basic tests passed! The issue might be client-side.');
    logInfo('\n🔧 Potential Issues:');
    logInfo('1. Client-side routing not working properly');
    logInfo('2. React component not re-rendering after URL change');
    logInfo('3. Middleware redirect vs client-side redirect conflict');
    logInfo('4. Browser cache issues');
    
    logInfo('\n🧪 Debugging Steps:');
    logInfo('1. Open browser developer tools');
    logInfo('2. Check Console tab for JavaScript errors');
    logInfo('3. Check Network tab for failed requests');
    logInfo('4. Try hard refresh (Ctrl+F5 or Cmd+Shift+R)');
    logInfo('5. Clear browser cache and cookies');
    logInfo('6. Test in incognito/private mode');
    
    logInfo('\n🔍 Specific Checks:');
    logInfo('• Is the sign-in form visible after redirect?');
    logInfo('• Are there any console errors?');
    logInfo('• Does the page content change when you manually navigate?');
    logInfo('• Is the authentication state being properly managed?');
  } else {
    logError('\n⚠️  Some tests failed. Check server-side issues first.');
  }
  
  return passedTests === totalTests;
}

// Run the debug
if (require.main === module) {
  debugRedirectIssue()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Debug runner error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { debugRedirectIssue };
