#!/usr/bin/env tsx

/**
 * Admin Setup Guide
 * 
 * This script checks the current admin setup and provides safe instructions
 * for setting up admin roles without affecting existing data.
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
  console.error('');
  console.error('💡 Make sure these are set in your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Check current admin setup status
 */
async function checkAdminSetup(): Promise<{ hasAdminRolesTable: boolean; hasAdminConfigTable: boolean; hasGetUserAdminRoleFunction: boolean; hasAssignAdminRoleFunction: boolean }> {
  console.log('🔍 Checking Admin Setup Status');
  console.log('==============================\n');
  
  let hasAdminRolesTable = false;
  let hasAdminConfigTable = false;
  let hasGetUserAdminRoleFunction = false;
  let hasAssignAdminRoleFunction = false;
  
  try {
    // Check admin_roles table
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('count')
      .limit(1);
    
    if (!rolesError) {
      hasAdminRolesTable = true;
      console.log('✅ admin_roles table exists');
    } else {
      console.log('❌ admin_roles table does not exist');
    }
  } catch (error) {
    console.log('❌ admin_roles table does not exist');
  }
  
  try {
    // Check admin_config table
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('count')
      .limit(1);
    
    if (!configError) {
      hasAdminConfigTable = true;
      console.log('✅ admin_config table exists');
    } else {
      console.log('❌ admin_config table does not exist');
    }
  } catch (error) {
    console.log('❌ admin_config table does not exist');
  }
  
  try {
    // Check get_user_admin_role function
    const { data: functionResult, error: functionError } = await supabase.rpc('get_user_admin_role', {
      user_id_param: 'test'
    });
    
    if (!functionError || !functionError.message.includes('function')) {
      hasGetUserAdminRoleFunction = true;
      console.log('✅ get_user_admin_role function exists');
    } else {
      console.log('❌ get_user_admin_role function does not exist');
    }
  } catch (error) {
    console.log('❌ get_user_admin_role function does not exist');
  }
  
  try {
    // Check assign_admin_role function
    const { data: assignResult, error: assignError } = await supabase.rpc('assign_admin_role', {
      target_user_id: 'test',
      role_param: 'moderator',
      assigned_by_param: 'test'
    });
    
    if (!assignError || !assignError.message.includes('function')) {
      hasAssignAdminRoleFunction = true;
      console.log('✅ assign_admin_role function exists');
    } else {
      console.log('❌ assign_admin_role function does not exist');
    }
  } catch (error) {
    console.log('❌ assign_admin_role function does not exist');
  }
  
  console.log('\n📊 Setup Summary:');
  console.log(`   - admin_roles table: ${hasAdminRolesTable ? '✅' : '❌'}`);
  console.log(`   - admin_config table: ${hasAdminConfigTable ? '✅' : '❌'}`);
  console.log(`   - get_user_admin_role function: ${hasGetUserAdminRoleFunction ? '✅' : '❌'}`);
  console.log(`   - assign_admin_role function: ${hasAssignAdminRoleFunction ? '✅' : '❌'}`);
  
  return { hasAdminRolesTable, hasAdminConfigTable, hasGetUserAdminRoleFunction, hasAssignAdminRoleFunction };
}

/**
 * Provide setup instructions
 */
function provideSetupInstructions(status: any): void {
  console.log('\n🚀 Admin Setup Instructions');
  console.log('==========================\n');
  
  if (status.hasAdminRolesTable && status.hasAdminConfigTable && 
      status.hasGetUserAdminRoleFunction && status.hasAssignAdminRoleFunction) {
    console.log('🎉 Admin system is fully set up!');
    console.log('');
    console.log('📋 Available commands:');
    console.log('   npm run admin:verify          - Verify admin setup');
    console.log('   npm run admin:list            - List all admin users');
    console.log('   npm run admin:create-super-admin <email> - Create super admin');
    console.log('   npm run admin:assign-role <userId> <role> <assignedBy> - Assign role');
    console.log('   npm run admin:get-role <userId> - Get user\'s admin role');
    return;
  }
  
  console.log('⚠️  Admin system needs to be set up. Here are the SAFE options:\n');
  
  console.log('🔧 Option 1: Manual SQL Setup (Recommended)');
  console.log('   This approach is the safest and gives you full control:');
  console.log('');
  console.log('   1. Go to your Supabase Dashboard:');
  if (SUPABASE_URL) {
    console.log(`      https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/sql`);
  } else {
    console.log('      https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql');
  }
  console.log('');
  console.log('   2. Open the SQL Editor');
  console.log('');
  console.log('   3. Run the following SQL (copy and paste):');
  console.log('');
  console.log('   -- Create admin_roles table');
  console.log('   CREATE TABLE IF NOT EXISTS public.admin_roles (');
  console.log('       id SERIAL PRIMARY KEY,');
  console.log('       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
  console.log('       role VARCHAR(50) NOT NULL CHECK (role IN (\'moderator\', \'data_admin\', \'system_admin\', \'super_admin\')),');
  console.log('       assigned_by UUID REFERENCES auth.users(id),');
  console.log('       assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
  console.log('       expires_at TIMESTAMP WITH TIME ZONE,');
  console.log('       is_active BOOLEAN DEFAULT true,');
  console.log('       notes TEXT,');
  console.log('       UNIQUE(user_id, role)');
  console.log('   );');
  console.log('');
  console.log('   -- Create indexes');
  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);');
  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);');
  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active);');
  console.log('');
  console.log('   -- Create admin_config table');
  console.log('   CREATE TABLE IF NOT EXISTS public.admin_config (');
  console.log('       key VARCHAR(100) PRIMARY KEY,');
  console.log('       value JSONB NOT NULL,');
  console.log('       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
  console.log('       updated_by UUID REFERENCES auth.users(id)');
  console.log('   );');
  console.log('');
  console.log('   -- Create index for admin_config');
  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_config_key ON public.admin_config(key);');
  console.log('');
  console.log('   -- Create admin functions');
  console.log('   CREATE OR REPLACE FUNCTION get_user_admin_role(user_id_param UUID)');
  console.log('   RETURNS VARCHAR(50) AS $$');
  console.log('   DECLARE');
  console.log('       user_role VARCHAR(50);');
  console.log('   BEGIN');
  console.log('       -- First check if user is super admin');
  console.log('       IF EXISTS (');
  console.log('           SELECT 1 FROM auth.users');
  console.log('           WHERE id = user_id_param');
  console.log('           AND issuperadmin = true');
  console.log('       ) THEN');
  console.log('           RETURN \'super_admin\';');
  console.log('       END IF;');
  console.log('       ');
  console.log('       -- Then check admin_roles table for active role');
  console.log('       SELECT role INTO user_role');
  console.log('       FROM public.admin_roles');
  console.log('       WHERE user_id = user_id_param');
  console.log('       AND is_active = true');
  console.log('       AND (expires_at IS NULL OR expires_at > NOW())');
  console.log('       ORDER BY');
  console.log('           CASE role');
  console.log('               WHEN \'super_admin\' THEN 4');
  console.log('               WHEN \'system_admin\' THEN 3');
  console.log('               WHEN \'data_admin\' THEN 2');
  console.log('               WHEN \'moderator\' THEN 1');
  console.log('               ELSE 0');
  console.log('           END DESC');
  console.log('       LIMIT 1;');
  console.log('       ');
  console.log('       RETURN COALESCE(user_role, \'moderator\');');
  console.log('   END;');
  console.log('   $$ LANGUAGE plpgsql SECURITY DEFINER;');
  console.log('');
  console.log('   -- Enable RLS on admin_roles table');
  console.log('   ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('   -- Create RLS policies');
  console.log('   CREATE POLICY "Users can view own admin roles" ON public.admin_roles');
  console.log('       FOR SELECT USING (auth.uid() = user_id);');
  console.log('');
  console.log('   CREATE POLICY "Super admins can manage admin roles" ON public.admin_roles');
  console.log('       FOR ALL USING (');
  console.log('           EXISTS (');
  console.log('               SELECT 1 FROM auth.users');
  console.log('               WHERE id = auth.uid()');
  console.log('               AND issuperadmin = true');
  console.log('           )');
  console.log('       );');
  console.log('');
  
  console.log('   4. After running the SQL, verify the setup:');
  console.log('      npm run admin:verify');
  console.log('');
  
  console.log('🔧 Option 2: Supabase CLI (If available)');
  console.log('   If you have access to the Supabase CLI with proper permissions:');
  console.log('');
  console.log('   1. Ensure you\'re linked to the project:');
  console.log('      supabase link --project-ref YOUR_PROJECT_REF');
  console.log('');
  console.log('   2. Apply migrations:');
  console.log('      supabase db push --include-all');
  console.log('');
  console.log('   3. Verify the setup:');
  console.log('      npm run admin:verify');
  console.log('');
  
  console.log('🔧 Option 3: Development Bypass (For testing only)');
  console.log('   If you just want to test the admin functionality in development:');
  console.log('');
  console.log('   1. The admin system already has development bypass enabled');
  console.log('   2. You can test admin features without setting up the database');
  console.log('   3. Set environment variables for development:');
  console.log('      ADMIN_BYPASS_PERMS=true');
  console.log('      ADMIN_DEFAULT_ROLE=super_admin');
  console.log('');
  
  console.log('📚 For detailed instructions, see: docs/setup/ADMIN_ROLES_PRODUCTION_SETUP.md');
  console.log('');
  console.log('⚠️  Important: Always backup your database before making schema changes!');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Admin Setup Guide');
  console.log('====================\n');
  
  try {
    const status = await checkAdminSetup();
    provideSetupInstructions(status);
  } catch (error) {
    console.error('❌ Error checking admin setup:', error);
    process.exit(1);
  }
}

// Run the script
main();
