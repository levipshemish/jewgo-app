const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase configuration...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test if signInAnonymously method exists
    if (typeof supabase.auth.signInAnonymously === 'function') {
      console.log('✅ signInAnonymously method available');
    } else {
      console.error('❌ signInAnonymously method not available');
      return false;
    }
    
    // Test auth configuration
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError && userError.message.includes('JWT')) {
      console.log('✅ Supabase auth configuration valid (expected JWT error for no user)');
    } else if (userError) {
      console.error('❌ Unexpected auth error:', userError);
      return false;
    } else {
      console.log('✅ Supabase auth configuration valid');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return false;
  }
}

testSupabase().then(success => {
  if (success) {
    console.log('✅ All Supabase tests passed');
  } else {
    console.log('❌ Supabase tests failed');
    process.exit(1);
  }
});
