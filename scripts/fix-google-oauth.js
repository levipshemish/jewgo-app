#!/usr/bin/env node

/**
 * Google OAuth Configuration Fix Script
 * 
 * This script helps diagnose and fix common Google OAuth issues with Supabase
 * Specifically addresses the "placeholder Supabase page" redirect issue
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Google OAuth Configuration Fix Script\n');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found in root directory');
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return envVars;
}

const env = loadEnvFile();

console.log('📋 Environment Variables Check:');
console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);
console.log(`✅ GOOGLE_CLIENT_ID: ${env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
console.log(`✅ GOOGLE_CLIENT_SECRET: ${env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);

console.log('\n🔗 Redirect URL Configuration:');
console.log('Expected redirect URIs for Google Cloud Console:');
console.log('- https://jewgo-app.vercel.app/auth/callback');
console.log('- http://localhost:3000/auth/callback');
console.log('- https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback');

console.log('\n🌐 Supabase Site URL Configuration:');
console.log('Site URL should be set to: https://jewgo-app.vercel.app');
console.log('Redirect URLs in Supabase should include:');
console.log('- https://jewgo-app.vercel.app/auth/callback');
console.log('- http://localhost:3000/auth/callback');

console.log('\n🔧 Step-by-Step Fix Instructions:');

console.log('\n1. **Google Cloud Console Configuration**:');
console.log('   a. Go to: https://console.cloud.google.com/');
console.log('   b. Select project: jewgo-app');
console.log('   c. Navigate to: APIs & Services → OAuth consent screen');
console.log('   d. Ensure User Type is set to "External"');
console.log('   e. Add test users if needed');

console.log('\n2. **Google OAuth 2.0 Client Configuration**:');
console.log('   a. Go to: APIs & Services → Credentials');
console.log('   b. Find your OAuth 2.0 Client ID');
console.log('   c. Click Edit (pencil icon)');
console.log('   d. Add these Authorized Redirect URIs:');
console.log('      - https://jewgo-app.vercel.app/auth/callback');
console.log('      - http://localhost:3000/auth/callback');
console.log('      - https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback');
console.log('   e. Add these Authorized JavaScript Origins:');
console.log('      - https://jewgo-app.vercel.app');
console.log('      - http://localhost:3000');
console.log('   f. Save changes');

console.log('\n3. **Supabase Dashboard Configuration**:');
console.log('   a. Go to: https://supabase.com/dashboard');
console.log('   b. Select project: lgsfyrxkqpipaumngvfi');
console.log('   c. Navigate to: Authentication → URL Configuration');
console.log('   d. Set Site URL to: https://jewgo-app.vercel.app');
console.log('   e. Add Redirect URLs:');
console.log('      - https://jewgo-app.vercel.app/auth/callback');
console.log('      - http://localhost:3000/auth/callback');
console.log('   f. Save changes');

console.log('\n4. **Supabase Google Provider Configuration**:');
console.log('   a. Go to: Authentication → Providers');
console.log('   b. Find Google provider and click Edit');
console.log('   c. Ensure provider is enabled');
console.log('   d. Verify Client ID and Client Secret match Google Cloud Console');
console.log('   e. Save configuration');

console.log('\n5. **Testing the Fix**:');
console.log('   a. Clear browser cache and cookies');
console.log('   b. Test in incognito/private mode');
console.log('   c. Go to: https://jewgo-app.vercel.app/auth/signin');
console.log('   d. Click "Sign in with Google"');
console.log('   e. Should redirect to Google OAuth consent screen');

console.log('\n🔍 Common Issues and Solutions:');

console.log('\n**Issue: "redirect_uri_mismatch"**');
console.log('Solution: Ensure redirect URIs in Google Cloud Console exactly match what Supabase expects');

console.log('\n**Issue: "org_internal"**');
console.log('Solution: Change OAuth consent screen from "Internal" to "External"');

console.log('\n**Issue: "invalid_client"**');
console.log('Solution: Verify Client ID and Secret in Supabase match Google Cloud Console');

console.log('\n**Issue: Redirects to placeholder page**');
console.log('Solution: Check that Supabase Site URL and Redirect URLs are configured correctly');

console.log('\n📞 If issues persist:');
console.log('1. Check browser console for specific error messages');
console.log('2. Verify all configuration steps are completed exactly');
console.log('3. Test in incognito mode to rule out cache issues');
console.log('4. Check Supabase logs for authentication errors');

console.log('\n✅ Configuration complete! Test the Google OAuth flow now.\n');
