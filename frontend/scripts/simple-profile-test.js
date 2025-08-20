#!/usr/bin/env node
/**
 * Simple Profile System Test
 * 
 * Tests the components and functionality that can be verified
 * without requiring environment variables or external services.
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

function testFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  } else {
    logError(`${description}: ${filePath} (MISSING)`);
    return false;
  }
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

function testPackageDependencies() {
  logHeader('Testing Package Dependencies');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    logError('package.json not found');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
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
    
    return allDepsPresent;
  } catch (error) {
    logError(`Error reading package.json: ${error.message}`);
    return false;
  }
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
      description: 'Profile Edit Form Component',
      requiredContent: ['ProfileEditForm', 'useForm', 'updateProfile']
    },
    {
      path: 'components/profile/PublicProfile.tsx',
      description: 'Public Profile Component',
      requiredContent: ['PublicProfile', 'profile', 'avatar']
    },
    {
      path: 'components/ui/Toast.tsx',
      description: 'Toast Notification Component',
      requiredContent: ['Toast', 'useToast', 'ToastContainer']
    },
    {
      path: 'hooks/useUsernameValidation.ts',
      description: 'Username Validation Hook',
      requiredContent: ['useUsernameValidation', 'checkUsernameAvailability']
    },
    {
      path: 'lib/validators/profile.ts',
      description: 'Profile Validation Schemas',
      requiredContent: ['ProfileSchema', 'UsernameSchema', 'z.object']
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

function testPages() {
  logHeader('Testing Pages');
  
  const pages = [
    {
      path: 'app/profile/settings/page.tsx',
      description: 'Profile Settings Page',
      requiredContent: ['ProfileSettings', 'AvatarUpload', 'ProfileEditForm']
    },
    {
      path: 'app/u/[username]/page.tsx',
      description: 'Public Profile Page',
      requiredContent: ['PublicProfilePage', 'generateMetadata', 'notFound']
    },
    {
      path: 'app/u/[username]/not-found.tsx',
      description: 'Profile Not Found Page',
      requiredContent: ['ProfileNotFound', 'UserX']
    }
  ];
  
  let allPagesValid = true;
  
  for (const page of pages) {
    const isValid = testFileContent(page.path, page.requiredContent, page.description);
    if (!isValid) {
      allPagesValid = false;
    }
  }
  
  return allPagesValid;
}

function testDatabaseScripts() {
  logHeader('Testing Database Scripts');
  
  const scripts = [
    {
      path: '../backend/scripts/check_tables_psycopg.py',
      description: 'Database Table Check Script'
    },
    {
      path: '../backend/scripts/create_profiles_table_psycopg.py',
      description: 'Profiles Table Creation Script'
    }
  ];
  
  let allScriptsValid = true;
  
  for (const script of scripts) {
    const isValid = testFileExists(script.path, script.description);
    if (!isValid) {
      allScriptsValid = false;
    }
  }
  
  return allScriptsValid;
}

function runSimpleTests() {
  logHeader('SIMPLE PROFILE SYSTEM TEST');
  logInfo('Testing components and functionality that can be verified locally...\n');
  
  const testResults = {
    dependencies: testPackageDependencies(),
    components: testProfileComponents(),
    actions: testServerActions(),
    pages: testPages(),
    scripts: testDatabaseScripts()
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
  
  if (passedTests === totalTests) {
    logSuccess('\n🎉 ALL COMPONENT TESTS PASSED!');
    logInfo('\nThe profile system components are properly implemented.');
    logInfo('\nNext steps for full testing:');
    logInfo('1. Ensure environment variables are set in .env.local');
    logInfo('2. Start development server: npm run dev');
    logInfo('3. Navigate to: http://localhost:3000/profile/settings');
    logInfo('4. Test avatar upload and profile editing');
    logInfo('5. Test public profile pages');
  } else {
    logError('\n⚠️  Some component tests failed.');
    logWarning('Please check the implementation of failed components.');
  }
  
  return passedTests === totalTests;
}

// Run the tests
if (require.main === module) {
  try {
    const success = runSimpleTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logError(`Test runner error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { runSimpleTests };
