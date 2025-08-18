#!/usr/bin/env node

/**
 * Generate Required Secrets for JewGo App
 * 
 * This script helps generate the required environment variables and secrets
 * for the JewGo application deployment.
 */

const crypto = require('crypto');

console.log('🔐 JewGo App - Secret Generation Script');
console.log('=====================================\n');

// Generate NEXTAUTH_SECRET
const nextAuthSecret = crypto.randomBytes(32).toString('base64');
console.log('1. NEXTAUTH_SECRET:');
console.log(`   ${nextAuthSecret}`);
console.log('   → Add this to GitHub Secrets as NEXTAUTH_SECRET\n');

// Generate a sample Google Maps API key format
console.log('2. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:');
console.log('   You need to create this manually:');
console.log('   a) Go to https://console.cloud.google.com/');
console.log('   b) Create a new project or select existing');
console.log('   c) Enable Maps JavaScript API');
console.log('   d) Create credentials → API Key');
console.log('   e) Restrict to your domain for security');
console.log('   → Add the API key to GitHub Secrets as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY\n');

// Backend URL
console.log('3. NEXT_PUBLIC_BACKEND_URL:');
console.log('   https://jewgo.onrender.com');
console.log('   → Add this to GitHub Secrets as NEXT_PUBLIC_BACKEND_URL\n');

// Frontend URL
console.log('4. NEXTAUTH_URL:');
console.log('   https://jewgo-app.vercel.app');
console.log('   → Add this to GitHub Secrets as NEXTAUTH_URL\n');

console.log('📋 GitHub Secrets Setup Instructions:');
console.log('=====================================');
console.log('1. Go to https://github.com/mml555/jewgo-app/settings/secrets/actions');
console.log('2. Click "New repository secret"');
console.log('3. Add each secret with the values above');
console.log('4. Save and test the build\n');

console.log('🔧 Local Development Setup:');
console.log('===========================');
console.log('Create frontend/.env.local with:');
console.log('```');
console.log(`NEXTAUTH_SECRET=${nextAuthSecret}`);
console.log('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key');
console.log('NEXT_PUBLIC_BACKEND_URL=http://localhost:8081');
console.log('NEXTAUTH_URL=http://localhost:3000');
console.log('```\n');

console.log('✅ Done! Your secrets are ready for setup.');
