#!/usr/bin/env node

/**
 * Quick test to debug Supabase anonymous authentication
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

async function testSupabaseAuth() {
  console.log('🔧 Testing Supabase Anonymous Authentication...\n');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Environment Check:');
  console.log('- Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('- Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('- URL Format:', supabaseUrl?.includes('.supabase.co') ? '✅ Valid' : '❌ Invalid');
  console.log();
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Don't persist for this test
        autoRefreshToken: false,
      }
    });
    
    console.log('✅ Supabase client created successfully');
    
    // Check if anonymous auth is available
    console.log('🔍 Testing signInAnonymously method availability...');
    
    if (typeof supabase.auth.signInAnonymously !== 'function') {
      console.error('❌ signInAnonymously method not available');
      console.log('Available auth methods:', Object.keys(supabase.auth));
      return;
    }
    
    console.log('✅ signInAnonymously method is available');
    
    // Attempt anonymous sign-in
    console.log('🔄 Attempting anonymous sign-in...');
    
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('❌ Anonymous sign-in failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return;
    }
    
    if (!data?.user) {
      console.error('❌ Anonymous sign-in returned no user');
      console.log('Response data:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('✅ Anonymous sign-in successful!');
    console.log('User ID:', data.user.id);
    console.log('User type:', data.user.user_metadata);
    console.log('Session:', data.session ? '✅ Created' : '❌ No session');
    
    // Test sign out
    console.log('🔄 Testing sign out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError);
    } else {
      console.log('✅ Sign out successful');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('Stack trace:', err.stack);
  }
}

// Run the test
testSupabaseAuth().then(() => {
  console.log('\n🏁 Test completed');
}).catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
