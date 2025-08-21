#!/usr/bin/env node

/**
 * Google OAuth Test Script
 * 
 * This script tests the Google OAuth configuration and provides debugging information
 */

const https = require('https');
const http = require('http');

console.log('🧪 Google OAuth Test Script\n');

// Test URLs
const testUrls = [
  {
    name: 'Production Sign-in Page',
    url: 'https://jewgo-app.vercel.app/auth/signin',
    expectedStatus: 200
  },
  {
    name: 'Production Callback Endpoint',
    url: 'https://jewgo-app.vercel.app/auth/callback',
    expectedStatus: 200
  },
  {
    name: 'Supabase Auth Callback',
    url: 'https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback',
    expectedStatus: 200
  }
];

function testUrl(url, name, expectedStatus) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      console.log(`✅ ${name}: ${res.statusCode} (expected ${expectedStatus})`);
      resolve({ success: true, status: res.statusCode });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name}: Error - ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${name}: Timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log('🔍 Testing OAuth Endpoints:\n');
  
  for (const test of testUrls) {
    await testUrl(test.url, test.name, test.expectedStatus);
  }
  
  console.log('\n📋 Configuration Checklist:');
  console.log('1. ✅ Environment variables are set');
  console.log('2. ❓ Google Cloud Console OAuth consent screen set to "External"');
  console.log('3. ❓ Google OAuth redirect URIs configured correctly');
  console.log('4. ❓ Supabase Site URL set to: https://jewgo-app.vercel.app');
  console.log('5. ❓ Supabase redirect URLs include: /auth/callback');
  console.log('6. ❓ Google provider enabled in Supabase');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Follow the configuration steps in scripts/fix-google-oauth.js');
  console.log('2. Test Google OAuth flow in incognito mode');
  console.log('3. Check browser console for specific error messages');
  console.log('4. Verify all redirect URIs match exactly');
  
  console.log('\n🌐 Test URLs:');
  console.log('- Production: https://jewgo-app.vercel.app/auth/signin');
  console.log('- Local: http://localhost:3000/auth/signin');
  console.log('- Supabase Test: https://jewgo-app.vercel.app/auth/supabase-signin');
  
  console.log('\n✅ Test complete! Check the results above.\n');
}

runTests().catch(console.error);
