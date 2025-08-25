#!/usr/bin/env node

/**
 * OAuth Popup URL Diagnosis Script
 * 
 * This script helps diagnose why the OAuth popup shows Supabase URL instead of Google
 * and provides specific fixes for the issue.
 */

const https = require('https');
const http = require('http');

console.log('🔍 OAuth Popup URL Diagnosis Script\n');

// Configuration
const config = {
  supabase: {
    projectId: 'lgsfyrxkqpipaumngvfi',
    url: 'https://lgsfyrxkqpipaumngvfi.supabase.co',
    authUrl: 'https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/authorize'
  },
  production: {
    domain: 'jewgo-app.vercel.app',
    signinUrl: 'https://jewgo-app.vercel.app/auth/signin',
    callbackUrl: 'https://jewgo-app.vercel.app/auth/callback'
  },
  development: {
    domain: 'localhost:3000',
    signinUrl: 'http://localhost:3000/auth/signin',
    callbackUrl: 'http://localhost:3000/auth/callback'
  }
};

// Check if URLs are accessible
async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.get(url, (res) => {
      resolve({
        status: res.statusCode,
        accessible: res.statusCode >= 200 && res.statusCode < 400
      });
    });
    
    req.on('error', () => {
      resolve({ status: 'ERROR', accessible: false });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', accessible: false });
    });
  });
}

// Main diagnosis function
async function diagnoseOAuthPopupUrl() {
  console.log('🚨 Problem: OAuth popup shows Supabase URL instead of Google\n');

  console.log('🔍 Root Cause Analysis:');
  console.log('The OAuth flow is going through Supabase as a proxy instead of directly to Google.');
  console.log('This happens when Supabase OAuth is not properly configured.\n');

  console.log('📋 Current Configuration:');
  console.log(`   Supabase Project ID: ${config.supabase.projectId}`);
  console.log(`   Supabase URL: ${config.supabase.url}`);
  console.log(`   Supabase Auth URL: ${config.supabase.authUrl}`);
  console.log(`   Production Domain: ${config.production.domain}`);
  console.log(`   Development Domain: ${config.development.domain}\n`);

  // Test URL accessibility
  console.log('🔗 Testing URL Accessibility:');
  
  const urlsToTest = [
    { name: 'Production Sign-in', url: config.production.signinUrl },
    { name: 'Supabase Auth URL', url: config.supabase.authUrl }
  ];

  for (const { name, url } of urlsToTest) {
    const result = await checkUrl(url);
    const status = result.accessible ? '✅' : '❌';
    console.log(`   ${status} ${name}: ${result.status}`);
  }

  console.log('\n🔧 Fix Options:\n');

  console.log('Option 1: Configure Supabase OAuth Properly (Recommended)');
  console.log('This fixes the issue while keeping Supabase as the OAuth provider.\n');

  console.log('Step 1: Supabase Dashboard Configuration');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select project: lgsfyrxkqpipaumngvfi');
  console.log('3. Navigate to: Authentication → URL Configuration');
  console.log('4. Set Site URL to: https://jewgo-app.vercel.app');
  console.log('5. Add Redirect URLs:');
  console.log('   - https://jewgo-app.vercel.app/auth/callback');
  console.log('   - http://localhost:3000/auth/callback\n');

  console.log('Step 2: Configure Google Provider');
  console.log('1. Go to: Authentication → Providers');
  console.log('2. Find Google provider and click Edit');
  console.log('3. Enable the Google provider');
  console.log('4. Add your Google OAuth credentials:');
  console.log('   - Client ID: [Your Google OAuth Client ID]');
  console.log('   - Client Secret: [Your Google OAuth Client Secret]');
  console.log('5. Set OAuth scopes to: email profile openid\n');

  console.log('Step 3: Update Google Cloud Console');
  console.log('1. Go to: https://console.cloud.google.com/');
  console.log('2. Navigate to: APIs & Services → Credentials');
  console.log('3. Edit your OAuth 2.0 Client ID');
  console.log('4. Add Authorized redirect URIs:');
  console.log('   - https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback\n');

  console.log('Option 2: Implement Direct Google OAuth (Advanced)');
  console.log('This bypasses Supabase OAuth entirely for direct Google OAuth.\n');

  console.log('Step 1: Install Google OAuth Library');
  console.log('```bash');
  console.log('cd frontend');
  console.log('npm install @google-cloud/local-auth googleapis');
  console.log('```\n');

  console.log('Step 2: Create Direct OAuth Handler');
  console.log('Create file: frontend/lib/google-oauth.ts');
  console.log('```typescript');
  console.log('export const initiateGoogleOAuth = () => {');
  console.log('  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;');
  console.log('  const redirectUri = `${window.location.origin}/auth/callback`;');
  console.log('  ');
  console.log('  const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?` +');
  console.log('    `client_id=${clientId}&` +');
  console.log('    `redirect_uri=${encodeURIComponent(redirectUri)}&` +');
  console.log('    `response_type=code&` +');
  console.log('    `scope=email profile openid&` +');
  console.log('    `access_type=offline&` +');
  console.log('    `prompt=consent`;');
  console.log('  ');
  console.log('  window.open(googleAuthUrl, \'_blank\', \'width=500,height=600\');');
  console.log('};');
  console.log('```\n');

  console.log('🎯 Recommended Approach: Option 1');
  console.log('Use Supabase OAuth configuration because:');
  console.log('- ✅ Leverages Supabase\'s built-in OAuth handling');
  console.log('- ✅ Automatic token management');
  console.log('- ✅ Built-in security features');
  console.log('- ✅ Easier to maintain\n');

  console.log('🔍 Expected OAuth Flow After Fix:');
  console.log('1. User clicks "Continue with Google"');
  console.log('2. Popup opens with Google OAuth consent screen');
  console.log('3. User sees your custom branding (logo, app name)');
  console.log('4. User completes OAuth flow');
  console.log('5. Redirects back to your app\n');

  console.log('🔧 Configuration Checklist:');
  console.log('\nSupabase Dashboard:');
  console.log('- [ ] Site URL set to: https://jewgo-app.vercel.app');
  console.log('- [ ] Redirect URLs include: https://jewgo-app.vercel.app/auth/callback');
  console.log('- [ ] Google provider enabled');
  console.log('- [ ] Google OAuth credentials configured');
  console.log('- [ ] OAuth scopes set to: email profile openid');

  console.log('\nGoogle Cloud Console:');
  console.log('- [ ] OAuth consent screen configured');
  console.log('- [ ] App name set to "JewGo"');
  console.log('- [ ] App logo uploaded');
  console.log('- [ ] Authorized redirect URIs include Supabase callback');
  console.log('- [ ] Authorized JavaScript origins include your domain');

  console.log('\nEnvironment Variables:');
  console.log('- [ ] NEXT_PUBLIC_SUPABASE_URL set correctly');
  console.log('- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set correctly');
  console.log('- [ ] Google OAuth credentials in Supabase dashboard\n');

  console.log('🧪 Testing Instructions:');
  console.log('1. Go to: https://jewgo-app.vercel.app/auth/signin');
  console.log('2. Click "Continue with Google"');
  console.log('3. Expected: Popup should redirect to Google OAuth consent screen');
  console.log('4. Complete OAuth flow');
  console.log('5. Expected: Redirect back to your app\n');

  console.log('🔍 Verify Popup URL:');
  console.log('The popup URL should be:');
  console.log('https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&response_type=code&scope=email profile openid');
  console.log('');
  console.log('NOT:');
  console.log('https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/authorize?...\n');

  console.log('🚨 Troubleshooting:');
  console.log('\nIf still shows Supabase URL:');
  console.log('1. Check Supabase OAuth configuration');
  console.log('2. Verify Google provider is enabled');
  console.log('3. Check OAuth credentials are correct');
  console.log('4. Ensure redirect URLs are configured');
  console.log('5. Clear browser cache and test in incognito mode');

  console.log('\nIf OAuth flow fails:');
  console.log('1. Check Supabase logs for OAuth errors');
  console.log('2. Check Google Cloud Console logs');
  console.log('3. Verify redirect URIs match exactly');
  console.log('4. Ensure app is not in "Internal" mode\n');

  console.log('📋 Verification Commands:');
  console.log('```bash');
  console.log('# Run OAuth branding verification');
  console.log('node scripts/verify-google-oauth-branding.js');
  console.log('');
  console.log('# Test OAuth flow');
  console.log('open https://jewgo-app.vercel.app/auth/signin');
  console.log('```\n');

  console.log('📞 Support Resources:');
  console.log('- Supabase OAuth docs: https://supabase.com/docs/guides/auth/social-login/auth-google');
  console.log('- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2');
  console.log('- Supabase Dashboard: https://supabase.com/dashboard');
  console.log('- Google Cloud Console: https://console.cloud.google.com/\n');

  console.log('✅ Diagnosis complete! Follow the steps above to fix the OAuth popup URL issue.');
}

// Run diagnosis
diagnoseOAuthPopupUrl().catch(console.error);
