#!/usr/bin/env node

/**
 * Google OAuth Configuration Diagnostic Script
 * 
 * This script helps diagnose common Google OAuth issues with Supabase
 */

const https = require('https');
const http = require('http');

console.log('🔍 Google OAuth Configuration Diagnostic\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

let missingVars = [];
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '***SET***' : value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log(`\n⚠️  Missing environment variables: ${missingVars.join(', ')}`);
}

// Check Supabase URL format
console.log('\n🔗 Supabase URL Check:');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    if (url.hostname.endsWith('.supabase.co')) {
      console.log('✅ Supabase URL format is correct');
    } else {
      console.log('❌ Supabase URL should end with .supabase.co');
    }
  } catch (error) {
    console.log('❌ Invalid Supabase URL format');
  }
}

// Check Google OAuth redirect URI
console.log('\n🔄 Google OAuth Redirect URI Check:');
const expectedRedirectUri = 'https://jewgo-app.vercel.app/auth/callback';
console.log(`Expected redirect URI: ${expectedRedirectUri}`);

// Test callback endpoint
console.log('\n🧪 Callback Endpoint Test:');
const testCallback = () => {
  return new Promise((resolve) => {
    const req = https.get('https://jewgo-app.vercel.app/auth/callback?code=test', (res) => {
      console.log(`Callback endpoint status: ${res.statusCode}`);
      if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 307) {
        console.log('✅ Callback endpoint is accessible');
      } else {
        console.log('❌ Callback endpoint returned unexpected status');
      }
      resolve();
    });
    
    req.on('error', (error) => {
      console.log('❌ Callback endpoint test failed:', error.message);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Callback endpoint test timed out');
      req.destroy();
      resolve();
    });
  });
};

// Test Supabase sign-in page
console.log('\n🌐 Supabase Sign-in Page Test:');
const testSignInPage = () => {
  return new Promise((resolve) => {
    const req = https.get('https://jewgo-app.vercel.app/auth/supabase-signin', (res) => {
      console.log(`Sign-in page status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Supabase sign-in page is accessible');
      } else {
        console.log('❌ Sign-in page returned unexpected status');
      }
      resolve();
    });
    
    req.on('error', (error) => {
      console.log('❌ Sign-in page test failed:', error.message);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Sign-in page test timed out');
      req.destroy();
      resolve();
    });
  });
};

// Run tests
Promise.all([testCallback(), testSignInPage()]).then(() => {
  console.log('\n📋 Common Issues Checklist:');
  console.log('1. ❓ Is Google OAuth consent screen set to "External"?');
  console.log('2. ❓ Are redirect URIs configured in Google Cloud Console?');
  console.log('3. ❓ Are Google OAuth credentials configured in Supabase?');
  console.log('4. ❓ Is the Google provider enabled in Supabase?');
  console.log('5. ❓ Are you testing in incognito mode?');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Follow the guide in docs/setup/google-oauth-fix.md');
  console.log('2. Check Google Cloud Console OAuth consent screen settings');
  console.log('3. Verify redirect URIs match exactly');
  console.log('4. Test in incognito/private browser mode');
  console.log('5. Check browser console for specific error messages');
  
  console.log('\n📞 If issues persist:');
  console.log('- Check browser console for specific error messages');
  console.log('- Verify all configuration steps in the guide');
  console.log('- Test with a different browser or incognito mode');
});
