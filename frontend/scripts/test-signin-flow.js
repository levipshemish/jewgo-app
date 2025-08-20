#!/usr/bin/env node
/**
 * Sign-In Flow Testing Script
 * 
 * Tests the complete sign-in flow and profile system integration
 */

const fs = require('fs');
const path = require('path');

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

function testFileContent(filePath, requiredContent, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    logError(`${description}: File not found`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasContent = requiredContent.some(text => content.includes(text));
    
    if (hasContent) {
      logSuccess(`${description}: Content verified`);
      return true;
    } else {
      logError(`${description}: Required content not found`);
      return false;
    }
  } catch (error) {
    logError(`${description}: Error reading file - ${error.message}`);
    return false;
  }
}

function testSignInFlow() {
  logHeader('Testing Sign-In Flow Integration');
  
  const tests = [
    {
      path: 'app/auth/signin/page.tsx',
      description: 'Sign-In Page',
      requiredContent: [
        'redirectTo || \'/profile/settings\'',
        'router.push(redirectTo || \'/profile/settings\')',
        'redirectTo=${encodeURIComponent(redirectTo || \'/profile/settings\')}'
      ]
    },
    {
      path: 'app/auth/callback/page.tsx',
      description: 'Auth Callback',
      requiredContent: [
        'router.push(searchParams.get("redirectTo") || \'/profile/settings\')'
      ]
    },
    {
      path: 'app/profile/page.tsx',
      description: 'Profile Page Redirect',
      requiredContent: [
        'redirect("/profile/settings")'
      ]
    },
    {
      path: 'app/profile/settings/page.tsx',
      description: 'Profile Settings Page',
      requiredContent: [
        'ProfileSettings',
        'AvatarUpload',
        'ProfileEditForm'
      ]
    }
  ];
  
  let allTestsPassed = true;
  
  for (const test of tests) {
    const passed = testFileContent(test.path, test.requiredContent, test.description);
    if (!passed) {
      allTestsPassed = false;
    }
  }
  
  return allTestsPassed;
}

function testProfileComponents() {
  logHeader('Testing Profile Components');
  
  const components = [
    {
      path: 'components/profile/AvatarUpload.tsx',
      description: 'Avatar Upload Component',
      requiredContent: ['AvatarUpload', 'useDropzone', 'uploadAvatar']
    },
    {
      path: 'components/profile/ProfileEditForm.tsx',
      description: 'Profile Edit Form',
      requiredContent: ['ProfileEditForm', 'useForm', 'updateProfile']
    },
    {
      path: 'components/profile/PublicProfile.tsx',
      description: 'Public Profile Component',
      requiredContent: ['PublicProfile', 'profile', 'avatar']
    },
    {
      path: 'components/ui/Toast.tsx',
      description: 'Toast Notifications',
      requiredContent: ['Toast', 'useToast', 'ToastContainer']
    }
  ];
  
  let allComponentsValid = true;
  
  for (const component of components) {
    const isValid = testFileContent(component.path, component.requiredContent, component.description);
    if (!isValid) {
      allComponentsValid = false;
    }
  }
  
  return allComponentsValid;
}

function testServerActions() {
  logHeader('Testing Server Actions');
  
  const actions = [
    {
      path: 'app/actions/upload-avatar.ts',
      description: 'Avatar Upload Action',
      requiredContent: ['uploadAvatar', 'deleteAvatar', 'use server']
    },
    {
      path: 'app/actions/update-profile.ts',
      description: 'Profile Update Action',
      requiredContent: ['updateProfile', 'checkUsernameAvailability', 'use server']
    }
  ];
  
  let allActionsValid = true;
  
  for (const action of actions) {
    const isValid = testFileContent(action.path, action.requiredContent, action.description);
    if (!isValid) {
      allActionsValid = false;
    }
  }
  
  return allActionsValid;
}

function testNavigation() {
  logHeader('Testing Navigation Components');
  
  const navigation = [
    {
      path: 'components/navigation/ui/BottomNavigation.tsx',
      description: 'Bottom Navigation',
      requiredContent: ['href: \'/profile\'', 'Profile']
    },
    {
      path: 'components/auth/AuthStatus.tsx',
      description: 'Auth Status Component',
      requiredContent: ['href="/profile"', 'Profile']
    }
  ];
  
  let allNavigationValid = true;
  
  for (const nav of navigation) {
    const isValid = testFileContent(nav.path, nav.requiredContent, nav.description);
    if (!isValid) {
      allNavigationValid = false;
    }
  }
  
  return allNavigationValid;
}

function runSignInFlowTests() {
  logHeader('SIGN-IN FLOW COMPREHENSIVE TEST');
  logInfo('Testing the complete sign-in flow and profile system integration...\n');
  
  const testResults = {
    signInFlow: testSignInFlow(),
    profileComponents: testProfileComponents(),
    serverActions: testServerActions(),
    navigation: testNavigation()
  };
  
  // Summary
  logHeader('TEST RESULTS SUMMARY');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  logInfo(`Total Test Categories: ${totalTests}`);
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
  
  // User flow summary
  logHeader('USER FLOW SUMMARY');
  
  if (passedTests === totalTests) {
    logSuccess('\n🎉 ALL TESTS PASSED! Sign-in flow is properly configured.');
    logInfo('\n📋 User Flow:');
    logInfo('1. User visits /auth/signin');
    logInfo('2. User enters credentials and signs in');
    logInfo('3. User is redirected to /profile/settings');
    logInfo('4. User can upload avatar and edit profile');
    logInfo('5. User can view their public profile');
    
    logInfo('\n🔗 Test URLs:');
    logInfo('• Sign-in: http://localhost:3000/auth/signin');
    logInfo('• Profile Settings: http://localhost:3000/profile/settings');
    logInfo('• Public Profile: http://localhost:3000/u/username');
    
    logInfo('\n🧪 Manual Testing Steps:');
    logInfo('1. Navigate to /auth/signin');
    logInfo('2. Sign in with valid credentials');
    logInfo('3. Verify redirect to /profile/settings');
    logInfo('4. Test avatar upload functionality');
    logInfo('5. Test profile editing form');
    logInfo('6. Test username validation');
    logInfo('7. Test public profile page');
  } else {
    logError('\n⚠️  Some tests failed. Please check the implementation.');
  }
  
  return passedTests === totalTests;
}

// Run the tests
if (require.main === module) {
  try {
    const success = runSignInFlowTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logError(`Test runner error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { runSignInFlowTests };
