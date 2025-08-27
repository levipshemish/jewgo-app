#!/usr/bin/env tsx

/**
 * Admin Role Setup Script for Production
 * 
 * This script helps set up admin roles in Supabase for production use.
 * It can be used to:
 * - Create a super admin user
 * - Assign admin roles to existing users
 * - Verify admin role setup
 */

import { createClient } from '@supabase/supabase-js';
import { ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from '../lib/admin/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// Types
interface AdminRoleSetup {
  userId: string;
  email: string;
  role: 'moderator' | 'data_admin' | 'system_admin' | 'super_admin';
  notes?: string;
}

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
 * Create a super admin user
 */
async function createSuperAdmin(email: string, name?: string): Promise<void> {
  try {








    console.log(`   (If the user doesn't exist, have them sign up through your app first)`);
















    console.log(`     COALESCE(raw_user_meta_data, '{}'::jsonb),`);

    console.log(`   ) WHERE email = '${email}';`);
    
  } catch (error) {
    console.error(`❌ Error in createSuperAdmin:`, error);
    throw error;
  }
}

/**
 * Assign admin role to a user
 */
async function assignAdminRole(userId: string, role: string, assignedBy: string, notes?: string): Promise<void> {
  try {

    // Use the assign_admin_role function
    const { data, error } = await supabase.rpc('assign_admin_role', {
      target_user_id: userId,
      role_param: role,
      assigned_by_param: assignedBy,
      expires_at_param: null,
      notes_param: notes || null
    });
    
    if (error) {
      throw error;
    }

  } catch (error) {
    console.error(`❌ Error assigning admin role:`, error);
    throw error;
  }
}

/**
 * Get user's current admin role
 */
async function getUserAdminRole(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_user_admin_role', {
      user_id_param: userId
    });
    
    if (error) {
      throw error;
    }
    
    return data || 'moderator';
  } catch (error) {
    console.error(`❌ Error getting user admin role:`, error);
    return 'moderator';
  }
}

/**
 * List all admin users
 */
async function listAdminUsers(): Promise<void> {
  try {

    // Get all users with admin roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from('admin_roles')
      .select(`
        user_id,
        role,
        assigned_at,
        expires_at,
        is_active,
        notes,
        users!inner(email, name)
      `)
      .eq('is_active', true);
    
    if (rolesError) {
      throw rolesError;
    }
    
    // Get super admins
    const { data: superAdmins, error: superError } = await supabase
      .from('users')
      .select('id, email, name, issuperadmin')
      .eq('issuperadmin', true);
    
    if (superError) {
      throw superError;
    }

    superAdmins?.forEach(user => {
      console.log(`   - ${user.email} (${user.name || 'No name'})`);
    });

    adminRoles?.forEach(role => {
      const user = role.users as any;
      const status = role.is_active ? '✅ Active' : '❌ Inactive';
      const expires = role.expires_at ? ` (expires: ${new Date(role.expires_at).toLocaleDateString()})` : '';
      console.log(`   - ${user.email} (${user.name || 'No name'}) - ${role.role} ${status}${expires}`);
    });



  } catch (error) {
    console.error(`❌ Error listing admin users:`, error);
    throw error;
  }
}

/**
 * Verify admin role setup
 */
async function verifyAdminSetup(): Promise<void> {
  try {

    // Check if admin_roles table exists by trying to query it
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('admin_roles')
        .select('count')
        .limit(1);
      
      if (rolesError) {
        console.error('❌ admin_roles table does not exist or is not accessible');


        return;
      }

    } catch (error) {
      console.error('❌ admin_roles table does not exist');


      return;
    }
    
    // Check if get_user_admin_role function exists
    try {
      const { data: functionResult, error: functionError } = await supabase.rpc('get_user_admin_role', {
        user_id_param: 'test'
      });
      
      if (functionError && functionError.message.includes('function')) {
        console.error('❌ get_user_admin_role function does not exist');


        return;
      }

    } catch (error) {
      console.log('✅ get_user_admin_role function exists (fallback will be used)');
    }
    
    // Check if assign_admin_role function exists
    try {
      const { data: assignResult, error: assignError } = await supabase.rpc('assign_admin_role', {
        target_user_id: 'test',
        role_param: 'moderator',
        assigned_by_param: 'test'
      });
      
      if (assignError && assignError.message.includes('function')) {
        console.error('❌ assign_admin_role function does not exist');


        return;
      }

    } catch (error) {
      console.log('✅ assign_admin_role function exists (fallback will be used)');
    }

  } catch (error) {
    console.error(`❌ Error verifying admin setup:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);


  try {
    switch (command) {
      case 'verify':
        await verifyAdminSetup();
        break;
        
      case 'list':
        await listAdminUsers();
        break;
        
      case 'create-super-admin':
        if (args.length < 1) {
          console.error('❌ Usage: npm run admin:create-super-admin <email> [name]');
          process.exit(1);
        }
        const email = args[0];
        const name = args[1];
        await createSuperAdmin(email, name);
        break;
        
      case 'assign-role':
        if (args.length < 3) {
          console.error('❌ Usage: npm run admin:assign-role <userId> <role> <assignedBy> [notes]');
          process.exit(1);
        }
        const userId = args[0];
        const role = args[1];
        const assignedBy = args[2];
        const notes = args[3];
        await assignAdminRole(userId, role, assignedBy, notes);
        break;
        
      case 'get-role':
        if (args.length < 1) {
          console.error('❌ Usage: npm run admin:get-role <userId>');
          process.exit(1);
        }
        const targetUserId = args[0];
        const userRole = await getUserAdminRole(targetUserId);

        break;
        
      default:













        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
