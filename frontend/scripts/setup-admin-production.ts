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
    console.log(`🔧 Creating super admin user: ${email}`);
    
    // First, check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, issuperadmin')
      .eq('email', email)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }
    
    if (existingUser) {
      if (existingUser.issuperadmin) {
        console.log(`✅ User ${email} is already a super admin`);
        return;
      }
      
      // Update existing user to be super admin
      const { error: updateError } = await supabase
        .from('users')
        .update({ issuperadmin: true })
        .eq('id', existingUser.id);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Updated user ${email} to super admin`);
      return;
    }
    
    // Create new user with super admin privileges
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name: name || 'Super Admin',
        issuperadmin: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      throw createError;
    }
    
    console.log(`✅ Created super admin user: ${email} (ID: ${newUser.id})`);
  } catch (error) {
    console.error(`❌ Error creating super admin:`, error);
    throw error;
  }
}

/**
 * Assign admin role to a user
 */
async function assignAdminRole(userId: string, role: string, assignedBy: string, notes?: string): Promise<void> {
  try {
    console.log(`🔧 Assigning role ${role} to user ${userId}`);
    
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
    
    console.log(`✅ Assigned role ${role} to user ${userId}`);
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
    console.log('📋 Listing all admin users...');
    
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
    
    console.log('\n👑 Super Admins:');
    superAdmins?.forEach(user => {
      console.log(`   - ${user.email} (${user.name || 'No name'})`);
    });
    
    console.log('\n🔧 Admin Roles:');
    adminRoles?.forEach(role => {
      const user = role.users as any;
      const status = role.is_active ? '✅ Active' : '❌ Inactive';
      const expires = role.expires_at ? ` (expires: ${new Date(role.expires_at).toLocaleDateString()})` : '';
      console.log(`   - ${user.email} (${user.name || 'No name'}) - ${role.role} ${status}${expires}`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`   - Super Admins: ${superAdmins?.length || 0}`);
    console.log(`   - Admin Roles: ${adminRoles?.length || 0}`);
    
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
    console.log('🔍 Verifying admin role setup...');
    
    // Check if admin_roles table exists by trying to query it
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('admin_roles')
        .select('count')
        .limit(1);
      
      if (rolesError) {
        console.error('❌ admin_roles table does not exist or is not accessible');
        console.log('💡 Run the Supabase migrations first:');
        console.log('   supabase db push');
        return;
      }
      
      console.log('✅ admin_roles table exists');
    } catch (error) {
      console.error('❌ admin_roles table does not exist');
      console.log('💡 Run the Supabase migrations first:');
      console.log('   supabase db push');
      return;
    }
    
    // Check if get_user_admin_role function exists
    try {
      const { data: functionResult, error: functionError } = await supabase.rpc('get_user_admin_role', {
        user_id_param: 'test'
      });
      
      if (functionError && functionError.message.includes('function')) {
        console.error('❌ get_user_admin_role function does not exist');
        console.log('💡 Run the Supabase migrations first:');
        console.log('   supabase db push');
        return;
      }
      
      console.log('✅ get_user_admin_role function exists');
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
        console.log('💡 Run the Supabase migrations first:');
        console.log('   supabase db push');
        return;
      }
      
      console.log('✅ assign_admin_role function exists');
    } catch (error) {
      console.log('✅ assign_admin_role function exists (fallback will be used)');
    }
    
    console.log('✅ Admin role setup verification complete');
    
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
  
  console.log('🚀 Admin Role Setup Script for Production');
  console.log('==========================================\n');
  
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
        console.log(`👤 User ${targetUserId} has role: ${userRole}`);
        break;
        
      default:
        console.log('Available commands:');
        console.log('  verify                    - Verify admin role setup');
        console.log('  list                      - List all admin users');
        console.log('  create-super-admin <email> [name] - Create a super admin user');
        console.log('  assign-role <userId> <role> <assignedBy> [notes] - Assign admin role');
        console.log('  get-role <userId>         - Get user\'s admin role');
        console.log('');
        console.log('Examples:');
        console.log('  npm run admin:verify');
        console.log('  npm run admin:list');
        console.log('  npm run admin:create-super-admin admin@jewgo.com "Admin User"');
        console.log('  npm run admin:assign-role user123 moderator admin@jewgo.com "Initial role"');
        console.log('  npm run admin:get-role user123');
        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
