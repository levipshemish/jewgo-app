#!/usr/bin/env node

/**
 * Clear Rate Limit Script for Development
 * Clears rate limit data for anonymous auth testing
 */

const { clearRateLimit } = require('../lib/rate-limiting/redis');

async function clearAnonymousAuthRateLimit() {
  try {

    // Clear rate limit for localhost IP
    const localhostIP = '127.0.0.1';
    const rateLimitKey = `anonymous_auth:${localhostIP}`;
    
    await clearRateLimit(rateLimitKey, 'anonymous_auth', localhostIP);








  } catch (error) {
    console.error('❌ Failed to clear rate limit:', error.message);
  }
}

// Run the script
if (require.main === module) {
  clearAnonymousAuthRateLimit();
}

module.exports = { clearAnonymousAuthRateLimit };
