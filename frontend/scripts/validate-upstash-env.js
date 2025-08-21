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
  console.warn('\n⚠️  UPSTASH_REDIS_REST_URL is not set');
  console.warn('Rate limiting will be disabled. This is not recommended for production.');
  console.warn('');
  console.warn('🔧 TO ENABLE RATE LIMITING:');
  console.warn('1. Go to your Vercel dashboard');
  console.warn('2. Go to Settings > Environment Variables');
  console.warn('3. Add UPSTASH_REDIS_REST_URL with your Upstash Redis REST URL');
  console.warn('4. Add UPSTASH_REDIS_REST_TOKEN with your Upstash Redis REST token');
  console.warn('5. Redeploy your project');
  console.warn('');
  console.warn('📚 SETUP GUIDE:');
  console.warn('1. Go to https://upstash.com/');
  console.warn('2. Create a new Redis database');
  console.warn('3. Copy the REST URL and REST Token from your database dashboard');
  console.warn('4. Add them to your Vercel environment variables');
  console.warn('');
  console.warn('✅ Build will continue without rate limiting...');
  return; // Don't exit, just warn
}

if (!upstashRedisToken) {
  console.warn('\n⚠️  UPSTASH_REDIS_REST_TOKEN is not set');
  console.warn('Rate limiting will be disabled. This is not recommended for production.');
  console.warn('');
  console.warn('🔧 TO ENABLE RATE LIMITING:');
  console.warn('1. Go to your Vercel dashboard');
  console.warn('2. Go to Settings > Environment Variables');
  console.warn('3. Add UPSTASH_REDIS_REST_TOKEN with your Upstash Redis REST token');
  console.warn('4. Redeploy your project');
  console.warn('');
  console.warn('✅ Build will continue without rate limiting...');
  return; // Don't exit, just warn
}

if (!isValidUpstashRedisUrl(upstashRedisUrl)) {
  console.warn('\n⚠️  Invalid UPSTASH_REDIS_REST_URL');
  console.warn('Current value:', upstashRedisUrl);
  console.warn('');
  console.warn('Expected format: https://your-database-id.upstash.io');
  console.warn('');
  console.warn('🔧 TO FIX:');
  console.warn('1. Go to your Upstash dashboard');
  console.warn('2. Copy the REST URL from your Redis database');
  console.warn('3. Update UPSTASH_REDIS_REST_URL in your Vercel environment variables');
  console.warn('4. Redeploy your project');
  console.warn('');
  console.warn('✅ Build will continue without rate limiting...');
  return; // Don't exit, just warn
}

console.log('\n✅ All Upstash Redis environment variables are correctly configured!');
console.log(`URL: ${upstashRedisUrl}`);
console.log(`Token: ${upstashRedisToken.substring(0, 20)}...`);
