#!/usr/bin/env tsx

/**
 * Test Admin Access Script
 * 
 * This script tests admin access and verifies super admin status
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test admin access for a specific email
 */
async function testAdminAccess(email: string): Promise<void> {
  try {
    console.log(`🔍 Testing admin access for: ${email}`);
    
    // First, find the user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`❌ User ${email} not found in auth.users`);
      console.log('💡 Make sure the user has signed up through your app first');
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Check if user is super admin
    const isSuperAdmin = user.user_metadata?.is_super_admin === true;
    console.log(`👑 Super Admin Status: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
    
    if (isSuperAdmin) {
      console.log('🎉 User is a super admin!');
    } else {
      console.log('⚠️  User is not a super admin');
      console.log('💡 To make them a super admin, run this SQL in Supabase:');
      console.log(`   UPDATE auth.users SET raw_user_meta_data = jsonb_set(`);
      console.log(`     COALESCE(raw_user_meta_data, '{}'::jsonb),`);
      console.log(`     '{is_super_admin}', 'true'::jsonb`);
      console.log(`   ) WHERE email = '${email}';`);
    }
    
    // Test the get_user_admin_role function
    try {
      const { data: role, error: roleError } = await supabase.rpc('get_user_admin_role', {
        user_id_param: user.id
      });
      
      if (roleError) {
        console.error('❌ Error calling get_user_admin_role:', roleError);
      } else {
        console.log(`🔧 Admin Role: ${role || 'moderator'}`);
      }
    } catch (error) {
      console.error('❌ Error testing admin role function:', error);
    }
    
    // Check admin_roles table for this user
    try {
      const { data: adminRoles, error: rolesError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (rolesError) {
        console.error('❌ Error checking admin_roles:', rolesError);
      } else {
        console.log(`📋 Admin Roles in admin_roles table: ${adminRoles?.length || 0}`);
        adminRoles?.forEach(role => {
          console.log(`   - ${role.role} (assigned: ${role.assigned_at})`);
        });
      }
    } catch (error) {
      console.error('❌ Error checking admin_roles table:', error);
    }
    
  } catch (error) {
    console.error('❌ Error in testAdminAccess:', error);
  }
}

/**
 * Test admin API endpoints
 */
async function testAdminEndpoints(): Promise<void> {
  console.log('\n🧪 Testing Admin API Endpoints...');
  
  const endpoints = [
    '/api/admin/users',
    '/api/admin/reviews', 
    '/api/admin/images'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Data received: ${data.length || 0} items`);
      } else {
        console.log(`   ❌ Error: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`${endpoint}: ❌ Connection error`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const email = process.argv[2] || 'admin@jewgo.app';
  
  console.log('🚀 Admin Access Test Script');
  console.log('==========================\n');
  
  try {
    await testAdminAccess(email);
    await testAdminEndpoints();
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
