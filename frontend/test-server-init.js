// Load environment variables
require('dotenv').config();

console.log('Testing server initialization...');

// Test environment validation
try {
  const { validateEnvironment } = require('./lib/config/environment');
  validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Test Supabase feature support
try {
  const { validateSupabaseFeatureSupport } = require('./lib/utils/auth-utils.server');
  const featureSupport = validateSupabaseFeatureSupport();
  console.log('✅ Supabase feature support validation:', featureSupport);
} catch (error) {
  console.error('❌ Supabase feature support validation failed:', error.message);
  process.exit(1);
}

// Test feature guard initialization
async function testFeatureGuard() {
  try {
    const { initializeFeatureGuard } = require('./lib/feature-guard');
    const featureGuardResult = await initializeFeatureGuard();
    console.log('✅ Feature guard initialization:', featureGuardResult);
    return featureGuardResult;
  } catch (error) {
    console.error('❌ Feature guard initialization failed:', error.message);
    return false;
  }
}

// Test server initialization
async function testServerInit() {
  try {
    const { initializeServer } = require('./lib/server-init');
    const serverResult = await initializeServer();
    console.log('✅ Server initialization:', serverResult);
    return serverResult;
  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\nRunning feature guard test...');
  const featureGuardResult = await testFeatureGuard();
  
  console.log('\nRunning server initialization test...');
  const serverResult = await testServerInit();
  
  if (featureGuardResult && serverResult) {
    console.log('\n✅ All server initialization tests passed');
  } else {
    console.log('\n❌ Server initialization tests failed');
    process.exit(1);
  }
}

runTests();
