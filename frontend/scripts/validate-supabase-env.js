#!/usr/bin/env node

/**
 * Validate Supabase environment variables
 * This script is run during the build process to ensure environment variables are correctly set
 */

console.log('🔍 Validating Supabase environment variables...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the URL is valid (should be a Supabase project URL, not a database connection string)
const isValidSupabaseUrl = (url) => {
  if (!url) return false;
  // Should be a valid HTTPS URL ending with .supabase.co
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

console.log('📋 Environment Variables Check:');
console.log('==============================');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Not set'}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Not set'}`);

if (!supabaseUrl) {
  console.error('\n❌ NEXT_PUBLIC_SUPABASE_URL is not set');
  console.error('Please set it to your Supabase project URL');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('\n❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  console.error('Please set it to your Supabase anon key');
  process.exit(1);
}

if (!isValidSupabaseUrl(supabaseUrl)) {
  console.error('\n❌ Invalid NEXT_PUBLIC_SUPABASE_URL');
  console.error('Current value:', supabaseUrl);
  console.error('');
  console.error('Expected format: https://your-project-id.supabase.co');
  console.error('');
  console.error('❌ PROBLEM: You have set NEXT_PUBLIC_SUPABASE_URL to a database connection string!');
  console.error('This should be the Supabase project URL, not the database URL.');
  console.error('');
  console.error('🔧 TO FIX:');
  console.error('1. Go to your Vercel dashboard');
  console.error('2. Go to Settings > Environment Variables');
  console.error('3. Update NEXT_PUBLIC_SUPABASE_URL to: https://lgsfyrxkqpipaumngvfi.supabase.co');
  console.error('4. Redeploy your project');
  process.exit(1);
}

console.log('\n✅ All Supabase environment variables are correctly configured!');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...`);
