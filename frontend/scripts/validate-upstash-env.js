#!/usr/bin/env node

/**
 * Validate Redis environment variables
 * This script is run during the build process to ensure Redis environment variables are correctly set
 */

console.log('🔍 Validating Redis environment variables...\n');

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;
const redisDb = process.env.REDIS_DB;

// Check if Redis configuration is valid
const isValidRedisConfig = () => {
  // Either REDIS_URL or REDIS_HOST must be set
  return !!(redisUrl || redisHost);
};

console.log('📋 Environment Variables Check:');
console.log('==============================');
console.log(`REDIS_URL: ${redisUrl ? '✅ Set' : '❌ Not set'}`);
console.log(`REDIS_HOST: ${redisHost ? '✅ Set' : '❌ Not set'}`);
console.log(`REDIS_PORT: ${redisPort ? '✅ Set' : '❌ Not set'}`);
console.log(`REDIS_PASSWORD: ${redisPassword ? '✅ Set' : '❌ Not set'}`);
console.log(`REDIS_DB: ${redisDb ? '✅ Set' : '❌ Not set'}`);

if (!isValidRedisConfig()) {
  console.warn('\n⚠️  Redis configuration is not set');
  console.warn('Rate limiting will be disabled. This is not recommended for production.');
  console.warn('');
  console.warn('🔧 TO ENABLE RATE LIMITING:');
  console.warn('1. Go to your Vercel dashboard');
  console.warn('2. Go to Settings > Environment Variables');
  console.warn('3. Add either REDIS_URL or REDIS_HOST configuration');
  console.warn('4. Redeploy your project');
  console.warn('');
  console.warn('📚 CONFIGURATION OPTIONS:');
  console.warn('Option 1: Use REDIS_URL (recommended)');
  console.warn('  REDIS_URL=redis://username:password@host:port/database');
  console.warn('');
  console.warn('Option 2: Use individual variables');
  console.warn('  REDIS_HOST=your-redis-host');
  console.warn('  REDIS_PORT=6379');
  console.warn('  REDIS_PASSWORD=your-redis-password');
  console.warn('  REDIS_DB=0');
  console.warn('');
  console.warn('✅ Build will continue without rate limiting...');
  return; // Don't exit, just warn
}

console.log('\n✅ Redis environment variables are correctly configured!');
if (redisUrl) {
  console.log(`URL: ${redisUrl}`);
} else {
  console.log(`Host: ${redisHost}:${redisPort || 6379}`);
  console.log(`Database: ${redisDb || 0}`);
}
