#!/usr/bin/env node

/**
 * Google OAuth Branding Verification Script
 * 
 * This script helps verify that your Google OAuth branding is properly configured
 * and provides guidance for customization.
 */

const https = require('https');
const http = require('http');

console.log('🎨 Google OAuth Branding Verification Script\n');

// Configuration
const config = {
  production: {
    domain: 'jewgo-app.vercel.app',
    signinUrl: 'https://jewgo-app.vercel.app/auth/signin',
    callbackUrl: 'https://jewgo-app.vercel.app/auth/callback',
    privacyUrl: 'https://jewgo-app.vercel.app/privacy',
    termsUrl: 'https://jewgo-app.vercel.app/terms'
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

// Main verification function
async function verifyBranding() {
  console.log('🔍 Checking Google OAuth Branding Configuration:\n');

  // Check production URLs
  console.log('📱 Production Environment:');
  console.log(`   Domain: ${config.production.domain}`);
  console.log(`   Sign-in URL: ${config.production.signinUrl}`);
  console.log(`   Callback URL: ${config.production.callbackUrl}`);
  console.log(`   Privacy Policy: ${config.production.privacyUrl}`);
  console.log(`   Terms of Service: ${config.production.termsUrl}\n`);

  // Check development URLs
  console.log('💻 Development Environment:');
  console.log(`   Domain: ${config.development.domain}`);
  console.log(`   Sign-in URL: ${config.development.signinUrl}`);
  console.log(`   Callback URL: ${config.development.callbackUrl}\n`);

  // Test URL accessibility
  console.log('🔗 Testing URL Accessibility:');
  
  const urlsToTest = [
    { name: 'Production Sign-in', url: config.production.signinUrl },
    { name: 'Production Privacy Policy', url: config.production.privacyUrl },
    { name: 'Production Terms of Service', url: config.production.termsUrl }
  ];

  for (const { name, url } of urlsToTest) {
    const result = await checkUrl(url);
    const status = result.accessible ? '✅' : '❌';
    console.log(`   ${status} ${name}: ${result.status}`);
  }

  console.log('\n📋 Google Cloud Console Configuration Checklist:');
  console.log('\n1. OAuth Consent Screen Settings:');
  console.log('   - [ ] App name set to "JewGo"');
  console.log('   - [ ] App logo uploaded (128x128px recommended)');
  console.log('   - [ ] App domain set to "jewgo-app.vercel.app"');
  console.log('   - [ ] Application home page: https://jewgo-app.vercel.app');
  console.log('   - [ ] Privacy policy link: https://jewgo-app.vercel.app/privacy');
  console.log('   - [ ] Terms of service link: https://jewgo-app.vercel.app/terms');
  console.log('   - [ ] User support email configured');
  console.log('   - [ ] App description added');

  console.log('\n2. OAuth 2.0 Client Configuration:');
  console.log('   - [ ] Authorized JavaScript origins include:');
  console.log('     * https://jewgo-app.vercel.app');
  console.log('     * http://localhost:3000');
  console.log('   - [ ] Authorized redirect URIs include:');
  console.log('     * https://jewgo-app.vercel.app/auth/callback');
  console.log('     * http://localhost:3000/auth/callback');

  console.log('\n3. Authorized Domains:');
  console.log('   - [ ] jewgo-app.vercel.app');
  console.log('   - [ ] localhost (for development)');

  console.log('\n4. Test Users (if External):');
  console.log('   - [ ] Your email address added as test user');
  console.log('   - [ ] Other necessary test users added');

  console.log('\n🎯 Customization Recommendations:');
  console.log('\n1. Logo Design:');
  console.log('   - Use a simple, recognizable design');
  console.log('   - Ensure readability at 128x128px');
  console.log('   - Test on light and dark backgrounds');
  console.log('   - Follow Google branding guidelines');

  console.log('\n2. App Description:');
  console.log('   - Keep it concise and clear');
  console.log('   - Explain the core value proposition');
  console.log('   - Mention kosher restaurant discovery');
  console.log('   - Include key features');

  console.log('\n3. Privacy Policy & Terms:');
  console.log('   - Must be publicly accessible');
  console.log('   - Explain OAuth data usage');
  console.log('   - Cover user data handling');
  console.log('   - Include contact information');

  console.log('\n🧪 Testing Instructions:');
  console.log('\n1. Test OAuth Flow:');
  console.log('   - Go to: https://jewgo-app.vercel.app/auth/signin');
  console.log('   - Click "Continue with Google"');
  console.log('   - Verify popup shows your branding');
  console.log('   - Complete the OAuth flow');
  console.log('   - Check redirect works correctly');

  console.log('\n2. Test in Different Environments:');
  console.log('   - Production: https://jewgo-app.vercel.app');
  console.log('   - Development: http://localhost:3000');
  console.log('   - Incognito mode (no cached data)');

  console.log('\n3. Verify Branding Elements:');
  console.log('   - App name appears correctly');
  console.log('   - Logo is visible and clear');
  console.log('   - App description is accurate');
  console.log('   - Privacy policy link works');
  console.log('   - Terms of service link works');

  console.log('\n⚠️  Important Notes:');
  console.log('- Changes may take up to 24 hours to propagate');
  console.log('- Test in incognito mode to avoid cache issues');
  console.log('- Ensure all URLs are accessible');
  console.log('- Keep OAuth client secrets secure');
  console.log('- Monitor OAuth usage in Google Cloud Console');

  console.log('\n🔧 Troubleshooting:');
  console.log('\nIf branding doesn\'t appear:');
  console.log('1. Check Google Cloud Console OAuth consent screen');
  console.log('2. Verify logo upload was successful');
  console.log('3. Wait up to 24 hours for changes');
  console.log('4. Clear browser cache and cookies');
  console.log('5. Test in incognito mode');

  console.log('\nIf OAuth flow fails:');
  console.log('1. Check authorized domains');
  console.log('2. Verify redirect URIs match exactly');
  console.log('3. Ensure OAuth client is configured');
  console.log('4. Check Supabase Google provider settings');
  console.log('5. Review Google Cloud Console logs');

  console.log('\n✅ Verification complete! Follow the checklist above to ensure proper configuration.');
}

// Run verification
verifyBranding().catch(console.error);
