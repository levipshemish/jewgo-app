#!/usr/bin/env node

/**
 * Script to fix Vercel environment variables for Supabase configuration
 * 
 * This script helps identify and fix the issue where NEXT_PUBLIC_SUPABASE_URL
 * is incorrectly set to a database connection string instead of the Supabase project URL.
 */

const { execSync } = require('child_process');

console.log('🔧 Vercel Environment Variables Fix Script');
console.log('==========================================\n');

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Vercel CLI is not installed. Please install it first:');
  console.error('   npm install -g vercel');
  process.exit(1);
}

// Check if user is logged in to Vercel
try {
  execSync('vercel whoami', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Not logged in to Vercel. Please run:');
  console.error('   vercel login');
  process.exit(1);
}

console.log('✅ Vercel CLI is installed and you are logged in\n');

// Display current environment variables
console.log('📋 Current Environment Variables:');
console.log('==================================');

try {
  const envOutput = execSync('vercel env ls', { encoding: 'utf8' });
  console.log(envOutput);
} catch (error) {
  console.error('❌ Failed to list environment variables:', error.message);
  process.exit(1);
}

console.log('\n🔍 Checking for problematic environment variables...\n');

// Instructions for fixing the issue
console.log('🚨 ISSUE DETECTED: NEXT_PUBLIC_SUPABASE_URL is incorrectly set');
console.log('============================================================');
console.log('');
console.log('The error shows that NEXT_PUBLIC_SUPABASE_URL is set to:');
console.log('postgresql://postgres:Fah4DQ10g6ogLkzL@db.lgsfyrxkqpipaumngvfi.supabase.co:5432/postgres/');
console.log('');
console.log('This is a DATABASE_URL, not a Supabase project URL!');
console.log('');
console.log('✅ CORRECT VALUES SHOULD BE:');
console.log('================================');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://lgsfyrxkqpipaumngvfi.supabase.co');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0iwWwM0kEGMnDApN5BYfZg_lIXWnD_n');
console.log('');
console.log('🔧 TO FIX THIS ISSUE:');
console.log('=====================');
console.log('');
console.log('1. Go to your Vercel dashboard: https://vercel.com/dashboard');
console.log('2. Select your project: jewgo-app');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Find NEXT_PUBLIC_SUPABASE_URL and update it to:');
console.log('   https://lgsfyrxkqpipaumngvfi.supabase.co');
console.log('5. Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is set to:');
console.log('   sb_publishable_0iwWwM0kEGMnDApN5BYfZg_lIXWnD_n');
console.log('6. Redeploy your project');
console.log('');
console.log('💡 ALTERNATIVE: Use Vercel CLI to set environment variables:');
console.log('==========================================================');
console.log('');
console.log('vercel env add NEXT_PUBLIC_SUPABASE_URL production');
console.log('vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production');
console.log('');
console.log('Then enter the correct values when prompted.');
console.log('');
console.log('🔄 After fixing, redeploy with:');
console.log('   vercel --prod');
console.log('');
console.log('📝 Note: The DATABASE_URL should be kept separate and used only for:');
console.log('   - Backend database connections');
console.log('   - Prisma migrations');
console.log('   - Server-side database operations');
console.log('');
console.log('   It should NOT be used for NEXT_PUBLIC_* variables.');
