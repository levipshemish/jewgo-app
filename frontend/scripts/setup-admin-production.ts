#!/usr/bin/env tsx

/**
 * Admin Role Setup Script for Production
 * 
 * This script helps set up admin roles in PostgreSQL for production use.
 * It can be used to:
 * - Create a super admin user
 * - Assign admin roles to existing users
 * - Verify admin role setup
 */

import { ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/server/admin-constants';
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
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!BACKEND_URL) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_BACKEND_URL or BACKEND_URL');
  process.exit(1);
}

// Helper function to make authenticated requests to backend
async function makeBackendRequest(endpoint: string, method: string = 'GET', body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (ADMIN_TOKEN) {
    headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
  }
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Create a super admin user
 */
async function createSuperAdmin(email: string, name?: string): Promise<void> {
  try {
    console.log(`🔧 Creating super admin for: ${email}`);
    
    const result = await makeBackendRequest('/api/admin/promote-user', 'POST', {
      email,
      role: 'super_admin',
      notes: name ? `Created by admin script: ${name}` : 'Created by admin script'
    });
    
    console.log(`✅ Super admin created successfully:`, result);
    
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
    console.log(`🔧 Assigning role ${role} to user ${userId}`);
    
    const result = await makeBackendRequest('/api/admin/promote-user', 'POST', {
      userId,
      role,
      assignedBy,
      notes: notes || `Assigned by admin script`
    });
    
    console.log(`✅ Role assigned successfully:`, result);
    
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
    const result = await makeBackendRequest(`/api/admin/user-roles/${userId}`);
    return result.role || 'moderator';
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
    
    const result = await makeBackendRequest('/api/admin/list-admins');
    
    if (result.admins && result.admins.length > 0) {
      result.admins.forEach((admin: any) => {
        const status = admin.is_active ? '✅ Active' : '❌ Inactive';
        const expires = admin.expires_at ? ` (expires: ${new Date(admin.expires_at).toLocaleDateString()})` : '';
        console.log(`   - ${admin.email} (${admin.name || 'No name'}) - ${admin.role} ${status}${expires}`);
      });
    } else {
      console.log('   No admin users found');
    }
    
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
    console.log('🔍 Verifying admin setup...');
    
    // Check if backend is accessible
    try {
      await makeBackendRequest('/api/health');
      console.log('✅ Backend is accessible');
    } catch (error) {
      console.error('❌ Backend is not accessible:', error);
      return;
    }
    
    // Check if admin endpoints are available
    try {
      await makeBackendRequest('/api/admin/list-admins');
      console.log('✅ Admin endpoints are available');
    } catch (error) {
      console.error('❌ Admin endpoints are not available:', error);
      return;
    }
    
    console.log('✅ Admin setup verification completed');
    
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

  console.log('🚀 PostgreSQL Admin Setup Script');
  console.log(`   Backend URL: ${BACKEND_URL}`);
  console.log(`   Command: ${command || 'help'}`);
  console.log('');

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
        console.log(`User ${targetUserId} has role: ${userRole}`);
        break;
        
      default:
        console.log('📖 Available commands:');
        console.log('   verify                    - Verify admin setup');
        console.log('   list                      - List all admin users');
        console.log('   create-super-admin <email> [name] - Create a super admin');
        console.log('   assign-role <userId> <role> <assignedBy> [notes] - Assign admin role');
        console.log('   get-role <userId>         - Get user admin role');
        console.log('');
        console.log('📖 Available roles:');
        console.log('   - moderator');
        console.log('   - data_admin');
        console.log('   - system_admin');
        console.log('   - super_admin');
        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();