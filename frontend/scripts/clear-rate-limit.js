#!/usr/bin/env node

/**
 * Clear Rate Limit Script for Development
 * Clears rate limit data for anonymous auth testing
 */

const { clearRateLimit } = require('../lib/rate-limiting/upstash-redis');

async function clearAnonymousAuthRateLimit() {
  try {
    console.log('🧹 Clearing anonymous auth rate limit data...');
    
    // Clear rate limit for localhost IP
    const localhostIP = '127.0.0.1';
    const rateLimitKey = `anonymous_auth:${localhostIP}`;
    
    await clearRateLimit(rateLimitKey, 'anonymous_auth', localhostIP);
    
    console.log('✅ Rate limit data cleared successfully!');
    console.log('');
    console.log('📋 You can now test the anonymous auth endpoint again:');
    console.log('');
    console.log('curl -X POST http://localhost:3001/api/auth/anonymous \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"turnstileToken": "your-token"}\'');
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to clear rate limit:', error.message);
  }
}

// Run the script
if (require.main === module) {
  clearAnonymousAuthRateLimit();
}

module.exports = { clearAnonymousAuthRateLimit };
