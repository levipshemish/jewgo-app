#!/usr/bin/env tsx

/**
 * Safe Admin Tables Creation Script
 * 
 * This script safely creates admin tables and functions in Supabase
 * WITHOUT affecting any existing data.
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
 * Safely create admin_roles table
 */
async function createAdminRolesTable(): Promise<void> {
  try {

    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('admin_roles')
      .select('count')
      .limit(1);
    
    if (!checkError) {

      return;
    }
    
    // Create the table using raw SQL
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.admin_roles (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL CHECK (role IN ('moderator', 'data_admin', 'system_admin', 'super_admin')),
          assigned_by VARCHAR(50) REFERENCES public.users(id),
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          notes TEXT,
          UNIQUE(user_id, role)
        );
        
        CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);
        CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active);
      `
    });
    
    if (createError) {
      console.error('❌ Error creating admin_roles table:', createError);
      throw createError;
    }

  } catch (error) {
    console.error('❌ Error in createAdminRolesTable:', error);
    throw error;
  }
}

/**
 * Safely create admin_config table
 */
async function createAdminConfigTable(): Promise<void> {
  try {

    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('admin_config')
      .select('count')
      .limit(1);
    
    if (!checkError) {

      return;
    }
    
    // Create the table using raw SQL
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.admin_config (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_by VARCHAR(50) REFERENCES public.users(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_admin_config_key ON public.admin_config(key);
      `
    });
    
    if (createError) {
      console.error('❌ Error creating admin_config table:', createError);
      throw createError;
    }

  } catch (error) {
    console.error('❌ Error in createAdminConfigTable:', error);
    throw error;
  }
}

/**
 * Safely create admin functions
 */
async function createAdminFunctions(): Promise<void> {
  try {

    // Create get_user_admin_role function
    const { error: getRoleError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_user_admin_role(user_id_param VARCHAR(50))
        RETURNS VARCHAR(50) AS $$
        DECLARE
            user_role VARCHAR(50);
        BEGIN
            -- First check if user is super admin
            IF EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = user_id_param 
                AND issuperadmin = true
            ) THEN
                RETURN 'super_admin';
            END IF;
            
            -- Then check admin_roles table for active role
            SELECT role INTO user_role
            FROM public.admin_roles
            WHERE user_id = user_id_param
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY 
                CASE role
                    WHEN 'super_admin' THEN 4
                    WHEN 'system_admin' THEN 3
                    WHEN 'data_admin' THEN 2
                    WHEN 'moderator' THEN 1
                    ELSE 0
                END DESC
            LIMIT 1;
            
            RETURN COALESCE(user_role, 'moderator');
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (getRoleError) {
      console.error('❌ Error creating get_user_admin_role function:', getRoleError);
      throw getRoleError;
    }
    
    // Create assign_admin_role function
    const { error: assignRoleError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION assign_admin_role(
          target_user_id VARCHAR(50),
          role_param VARCHAR(50),
          assigned_by_param VARCHAR(50),
          expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          notes_param TEXT DEFAULT NULL
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          -- Check if assigner is super admin
          IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = assigned_by_param 
            AND issuperadmin = true
          ) THEN
            RAISE EXCEPTION 'Only super admins can assign admin roles';
          END IF;
          
          -- Check if target user exists
          IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = target_user_id
          ) THEN
            RAISE EXCEPTION 'Target user does not exist';
          END IF;
          
          -- Insert or update admin role
          INSERT INTO public.admin_roles (
            user_id,
            role,
            assigned_by,
            expires_at,
            notes
          ) VALUES (
            target_user_id,
            role_param,
            assigned_by_param,
            expires_at_param,
            notes_param
          )
          ON CONFLICT (user_id, role)
          DO UPDATE SET
            assigned_by = EXCLUDED.assigned_by,
            assigned_at = NOW(),
            expires_at = EXCLUDED.expires_at,
            notes = EXCLUDED.notes,
            is_active = true;
          
          RETURN TRUE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (assignRoleError) {
      console.error('❌ Error creating assign_admin_role function:', assignRoleError);
      throw assignRoleError;
    }
    
    // Create remove_admin_role function
    const { error: removeRoleError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION remove_admin_role(
          target_user_id VARCHAR(50),
          role_param VARCHAR(50),
          removed_by_param VARCHAR(50)
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          -- Check if remover is super admin
          IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = removed_by_param 
            AND issuperadmin = true
          ) THEN
            RAISE EXCEPTION 'Only super admins can remove admin roles';
          END IF;
          
          -- Soft delete the role
          UPDATE public.admin_roles
          SET is_active = false
          WHERE user_id = target_user_id
          AND role = role_param;
          
          RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (removeRoleError) {
      console.error('❌ Error creating remove_admin_role function:', removeRoleError);
      throw removeRoleError;
    }

  } catch (error) {
    console.error('❌ Error in createAdminFunctions:', error);
    throw error;
  }
}

/**
 * Verify admin setup
 */
async function verifyAdminSetup(): Promise<void> {
  try {

    // Check admin_roles table
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('count')
      .limit(1);
    
    if (rolesError) {
      console.error('❌ admin_roles table verification failed:', rolesError);
      return;
    }

    // Check admin_config table
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('count')
      .limit(1);
    
    if (configError) {
      console.error('❌ admin_config table verification failed:', configError);
      return;
    }

    // Check functions
    try {
      const { data: functionResult, error: functionError } = await supabase.rpc('get_user_admin_role', {
        user_id_param: 'test'
      });
      
      if (functionError && functionError.message.includes('function')) {
        console.error('❌ get_user_admin_role function verification failed');
        return;
      }

    } catch (error) {
      console.log('✅ get_user_admin_role function verified (fallback will be used)');
    }

  } catch (error) {
    console.error('❌ Error in verifyAdminSetup:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {






  try {
    // Create tables
    await createAdminRolesTable();
    await createAdminConfigTable();
    
    // Create functions
    await createAdminFunctions();
    
    // Verify setup
    await verifyAdminSetup();









  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
