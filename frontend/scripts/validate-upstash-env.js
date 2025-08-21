#!/usr/bin/env node

/**
 * Validate Upstash Redis environment variables
 * This script is run during the build process to ensure Redis environment variables are correctly set
 */

console.log('🔍 Validating Upstash Redis environment variables...\n');

const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Check if the URL is valid (should be an Upstash Redis REST URL)
const isValidUpstashRedisUrl = (url) => {
  if (!url) return false;
  // Should be a valid HTTPS URL from Upstash
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.includes('upstash.io');
  } catch {
    return false;
  }
};

console.log('📋 Environment Variables Check:');
console.log('==============================');
console.log(`UPSTASH_REDIS_REST_URL: ${upstashRedisUrl ? '✅ Set' : '❌ Not set'}`);
console.log(`UPSTASH_REDIS_REST_TOKEN: ${upstashRedisToken ? '✅ Set' : '❌ Not set'}`);

if (!upstashRedisUrl) {
  console.error('\n❌ UPSTASH_REDIS_REST_URL is not set');
  console.error('This is required for rate limiting functionality.');
  console.error('');
  console.error('🔧 TO FIX:');
  console.error('1. Go to your Vercel dashboard');
  console.error('2. Go to Settings > Environment Variables');
  console.error('3. Add UPSTASH_REDIS_REST_URL with your Upstash Redis REST URL');
  console.error('4. Add UPSTASH_REDIS_REST_TOKEN with your Upstash Redis REST token');
  console.error('5. Redeploy your project');
  console.error('');
  console.error('📚 SETUP GUIDE:');
  console.error('1. Go to https://upstash.com/');
  console.error('2. Create a new Redis database');
  console.error('3. Copy the REST URL and REST Token from your database dashboard');
  console.error('4. Add them to your Vercel environment variables');
  process.exit(1);
}

if (!upstashRedisToken) {
  console.error('\n❌ UPSTASH_REDIS_REST_TOKEN is not set');
  console.error('This is required for rate limiting functionality.');
  console.error('');
  console.error('🔧 TO FIX:');
  console.error('1. Go to your Vercel dashboard');
  console.error('2. Go to Settings > Environment Variables');
  console.error('3. Add UPSTASH_REDIS_REST_TOKEN with your Upstash Redis REST token');
  console.error('4. Redeploy your project');
  process.exit(1);
}

if (!isValidUpstashRedisUrl(upstashRedisUrl)) {
  console.error('\n❌ Invalid UPSTASH_REDIS_REST_URL');
  console.error('Current value:', upstashRedisUrl);
  console.error('');
  console.error('Expected format: https://your-database-id.upstash.io');
  console.error('');
  console.error('🔧 TO FIX:');
  console.error('1. Go to your Upstash dashboard');
  console.error('2. Copy the REST URL from your Redis database');
  console.error('3. Update UPSTASH_REDIS_REST_URL in your Vercel environment variables');
  console.error('4. Redeploy your project');
  process.exit(1);
}

console.log('\n✅ All Upstash Redis environment variables are correctly configured!');
console.log(`URL: ${upstashRedisUrl}`);
console.log(`Token: ${upstashRedisToken.substring(0, 20)}...`);
