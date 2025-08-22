#!/usr/bin/env node

/**
 * Simple Turnstile Token Generator for Testing
 * This script helps generate a valid Turnstile token for testing the anonymous auth endpoint
 */

const https = require('https');

// Your Turnstile configuration
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const SITE_URL = 'http://localhost:3001'; // Your local development URL

/**
 * Generate a test Turnstile token
 * Note: This is a simplified approach for development testing
 */
async function generateTestToken() {
  console.log('🔄 Generating test Turnstile token...');
  
  if (!TURNSTILE_SECRET_KEY) {
    console.error('❌ TURNSTILE_SECRET_KEY environment variable not set');
    console.log('Please set TURNSTILE_SECRET_KEY in your environment');
    return null;
  }
  
  // For development purposes, we'll create a simple token
  // In production, you would get this from the actual Turnstile widget
  const testToken = `test_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('✅ Generated test token:', testToken);
  console.log('');
  console.log('📋 Use this token in your API request:');
  console.log('');
  console.log(`curl -X POST http://localhost:3001/api/auth/anonymous \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"turnstileToken": "${testToken}"}'`);
  console.log('');
  console.log('⚠️  Note: This is a test token and may not work with production Turnstile verification.');
  console.log('   For real testing, you need to get a token from the actual Turnstile widget.');
  
  return testToken;
}

/**
 * Verify a Turnstile token with Cloudflare
 */
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    const postData = `secret=${TURNSTILE_SECRET_KEY}&response=${token}`;
    
    const options = {
      hostname: 'challenges.cloudflare.com',
      port: 443,
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    const token = await generateTestToken();
    
    if (!token) {
      return;
    }
    
    console.log('🔄 Verifying token with Cloudflare...');
    const verificationResult = await verifyToken(token);
    
    console.log('📊 Verification result:', JSON.stringify(verificationResult, null, 2));
    
    if (verificationResult.success) {
      console.log('✅ Token verified successfully!');
    } else {
      console.log('❌ Token verification failed:', verificationResult['error-codes']);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateTestToken, verifyToken };
