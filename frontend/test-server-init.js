// Load environment variables
require('dotenv').config();

// Test environment validation
try {
  const { validateEnvironment } = require('./lib/config/environment');
  validateEnvironment();

} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Test Supabase feature support
try {
  const { validateSupabaseFeatureSupport } = require('./lib/utils/auth-utils.server');
  const featureSupport = validateSupabaseFeatureSupport();

} catch (error) {
  console.error('❌ Supabase feature support validation failed:', error.message);
  process.exit(1);
}

// Test feature guard initialization
async function testFeatureGuard() {
  try {
    const { initializeFeatureGuard } = require('./lib/feature-guard');
    const featureGuardResult = await initializeFeatureGuard();

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

    return serverResult;
  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    return false;
  }
}

async function runTests() {
  const featureGuardResult = await testFeatureGuard();
  const serverResult = await testServerInit();
  
  if (featureGuardResult && serverResult) {
    console.log('✅ All tests passed');
  } else {
    console.error('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
