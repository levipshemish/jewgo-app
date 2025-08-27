#!/usr/bin/env tsx

/**
 * Script to promote the first super admin user
 * Run this script to set up the initial super admin
 * 
 * Usage: 
 * npx tsx scripts/promote-first-admin.ts <email>
 * 
 * Example:
 * npx tsx scripts/promote-first-admin.ts admin@example.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function promoteFirstAdmin(email: string) {
  try {

    // Find the user by email using the correct API
    const { data: users, error: findError } = await supabase.auth.admin.listUsers();
    
    if (findError) {
      console.error('❌ Error listing users:', findError.message);
      return;
    }
    
    const targetUser = users.users.find(user => user.email === email);
    
    if (!targetUser) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${targetUser.email} (ID: ${targetUser.id})`);
    
    // Check if user is already a super admin
    const currentMetadata = targetUser.user_metadata || {};
    if (currentMetadata.issuperadmin) {

      return;
    }
    
    // Update user metadata to make them a super admin
    const updatedMetadata = {
      ...currentMetadata,
      issuperadmin: true,
      promoted_by: 'script',
      promoted_at: new Date().toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { user_metadata: updatedMetadata }
    );
    
    if (updateError) {
      console.error('❌ Error promoting user:', updateError.message);
      return;
    }




  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: npx tsx scripts/promote-first-admin.ts <email>');
  console.error('Example: npx tsx scripts/promote-first-admin.ts admin@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

promoteFirstAdmin(email).then(() => {

  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
