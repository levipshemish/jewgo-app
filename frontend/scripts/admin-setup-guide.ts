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

    } else {

    }
  } catch (error) {

  }
  
  try {
    // Check admin_config table
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('count')
      .limit(1);
    
    if (!configError) {
      hasAdminConfigTable = true;

    } else {

    }
  } catch (error) {

  }
  
  try {
    // Check get_user_admin_role function
    const { data: functionResult, error: functionError } = await supabase.rpc('get_user_admin_role', {
      user_id_param: 'test'
    });
    
    if (!functionError || !functionError.message.includes('function')) {
      hasGetUserAdminRoleFunction = true;

    } else {

    }
  } catch (error) {

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

    } else {

    }
  } catch (error) {

  }





  return { hasAdminRolesTable, hasAdminConfigTable, hasGetUserAdminRoleFunction, hasAssignAdminRoleFunction };
}

/**
 * Provide setup instructions
 */
function provideSetupInstructions(status: any): void {


  if (status.hasAdminRolesTable && status.hasAdminConfigTable && 
      status.hasGetUserAdminRoleFunction && status.hasAssignAdminRoleFunction) {








    return;
  }

  console.log('🔧 Option 1: Manual SQL Setup (Recommended)');



  if (SUPABASE_URL) {
    console.log(`      https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/sql`);
  } else {

  }



  console.log('   3. Run the following SQL (copy and paste):');




  console.log('       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
  console.log('       role VARCHAR(50) NOT NULL CHECK (role IN (\'moderator\', \'data_admin\', \'system_admin\', \'super_admin\')),');
  console.log('       assigned_by UUID REFERENCES auth.users(id),');
  console.log('       assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');



  console.log('       UNIQUE(user_id, role)');
  console.log('   );');


  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);');
  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);');
  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active);');



  console.log('       key VARCHAR(100) PRIMARY KEY,');

  console.log('       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
  console.log('       updated_by UUID REFERENCES auth.users(id)');
  console.log('   );');


  console.log('   CREATE INDEX IF NOT EXISTS idx_admin_config_key ON public.admin_config(key);');


  console.log('   CREATE OR REPLACE FUNCTION get_user_admin_role(user_id_param UUID)');
  console.log('   RETURNS VARCHAR(50) AS $$');

  console.log('       user_role VARCHAR(50);');






  console.log('       ) THEN');








  console.log('       AND (expires_at IS NULL OR expires_at > NOW())');










  console.log('       RETURN COALESCE(user_role, \'moderator\');');








  console.log('       FOR SELECT USING (auth.uid() = user_id);');





  console.log('               WHERE id = auth.uid()');

  console.log('           )');
  console.log('       );');




  console.log('🔧 Option 2: Supabase CLI (If available)');











  console.log('🔧 Option 3: Development Bypass (For testing only)');











}

/**
 * Main function
 */
async function main() {


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
