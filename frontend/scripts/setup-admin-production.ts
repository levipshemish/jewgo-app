#!/usr/bin/env tsx
/**
 * Admin Setup Script for JewGo Production Environment
 * 
 * This script provides administrative functionality for managing admin users
 * in the JewGo application. It can create super admins, verify admin access,
 * and list existing administrators.
 * 
 * Usage:
 *   npm run admin:verify
 *   npm run admin:create-super-admin <email> "<name>"
 *   npm run admin:test <email>
 *   npm run admin:list
 */

import fetch from 'node-fetch';
import readline from 'readline';
import { promisify } from 'util';

// Environment configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api/v5`;

// Interface definitions
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  roles: Array<{ role: string; level: number }>;
  email_verified: boolean;
}

interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class AdminSetupManager {
  private backendUrl: string;
  private apiBase: string;

  constructor() {
    this.backendUrl = BACKEND_URL;
    this.apiBase = API_BASE;
  }

  /**
   * Make an API request with proper error handling
   */
  private async makeRequest(
    endpoint: string, 
    options: any = {}, 
    token?: string
  ): Promise<ApiResponse> {
    try {
      const url = `${this.apiBase}${endpoint}`;
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'JewGo-Admin-Setup/1.0'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      let responseData: any;
      try {
        responseData = await response.json();
      } catch (_e) {
        responseData = { success: false, error: 'Invalid JSON response' };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return responseData;
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    console.log(`🔗 Testing connection to ${this.backendUrl}...`);
    
    try {
      const response = await this.makeRequest('/auth/health');
      if (response.success) {
        console.log('✅ Backend connection successful');
        return true;
      } else {
        console.log(`❌ Backend health check failed: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Cannot connect to backend: ${error}`);
      return false;
    }
  }

  /**
   * Register a new user account
   */
  async registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: UserData; tokens?: TokenData; error?: string }> {
    console.log(`👤 Creating user account: ${email}`);

    const registerData = {
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      terms_accepted: true
    };

    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData)
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      user: response.data?.user,
      tokens: response.data?.tokens
    };
  }

  /**
   * Authenticate a user and get tokens
   */
  async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: UserData; tokens?: TokenData; error?: string }> {
    console.log(`🔐 Authenticating user: ${email}`);

    const loginData = {
      email: email.toLowerCase().trim(),
      password,
      remember_me: false
    };

    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      user: response.data?.user,
      tokens: response.data?.tokens
    };
  }

  /**
   * Assign admin role to a user (requires direct database access)
   */
  async assignAdminRole(userId: string, role: string = 'super_admin'): Promise<boolean> {
    console.log(`👑 Assigning ${role} role to user ${userId}...`);
    
    // Note: This requires direct database access since it's a bootstrap operation
    // In a real production environment, you would use the admin API endpoints
    // For now, we'll provide SQL instructions for manual execution
    
    const sqlCommand = `
-- Assign super_admin role to user
INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)
VALUES ('${userId}', '${role}', 100, NOW(), 'system', TRUE)
ON CONFLICT (user_id, role) 
DO UPDATE SET 
  level = EXCLUDED.level,
  granted_at = EXCLUDED.granted_at,
  is_active = TRUE;
`;

    console.log('📝 Manual SQL execution required:');
    console.log('   Connect to your PostgreSQL database and execute:');
    console.log(`   ${sqlCommand.trim().replace(/\n/g, '\n   ')}`);
    console.log('');
    
    return true;
  }

  /**
   * Verify user has admin access
   */
  async verifyAdminAccess(email: string, password: string): Promise<boolean> {
    console.log(`🔍 Verifying admin access for: ${email}`);

    // First authenticate
    const authResult = await this.authenticateUser(email, password);
    if (!authResult.success) {
      console.log(`❌ Authentication failed: ${authResult.error}`);
      return false;
    }

    const user = authResult.user!;
    const tokens = authResult.tokens!;

    // Check roles
    const hasAdminRole = user.roles.some(role => 
      ['super_admin', 'system_admin', 'data_admin', 'moderator'].includes(role.role)
    );

    if (!hasAdminRole) {
      console.log('❌ User does not have admin roles');
      return false;
    }

    // Test admin API access
    const adminResponse = await this.makeRequest('/admin/health/system', {
      method: 'GET'
    }, tokens.access_token);

    if (adminResponse.success) {
      console.log('✅ Admin access verified successfully');
      console.log(`   User: ${user.name} (${user.email})`);
      console.log(`   Roles: ${user.roles.map(r => `${r.role}(${r.level})`).join(', ')}`);
      return true;
    } else {
      console.log(`❌ Admin API access denied: ${adminResponse.error}`);
      return false;
    }
  }

  /**
   * Create a new super admin user
   */
  async createSuperAdmin(email: string, name: string, password: string = 'Jewgo123'): Promise<boolean> {
    console.log('🚀 Creating new super admin user...');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log('');

    // Test connection first
    if (!(await this.testConnection())) {
      return false;
    }

    // Check if user already exists by trying to authenticate
    const existingAuth = await this.authenticateUser(email, password);
    if (existingAuth.success) {
      console.log('ℹ️  User already exists, checking admin access...');
      return await this.verifyAdminAccess(email, password);
    }

    // Create new user
    const createResult = await this.registerUser(email, password, name);
    if (!createResult.success) {
      console.log(`❌ Failed to create user: ${createResult.error}`);
      return false;
    }

    console.log('✅ User created successfully');
    const userId = createResult.user!.id;

    // Assign admin role
    await this.assignAdminRole(userId, 'super_admin');

    console.log('');
    console.log('🎉 Super admin user setup initiated!');
    console.log('');
    console.log('⚠️  IMPORTANT: Execute the SQL command above to complete the setup.');
    console.log(`    Then run: npm run admin:test ${email}`);
    console.log('');

    return true;
  }

  /**
   * List admin users (requires admin access)
   */
  async listAdmins(): Promise<void> {
    console.log('📋 Listing admin users...');
    
    // This would require an authenticated admin user to access the admin API
    console.log('ℹ️  This feature requires an existing admin user to authenticate.');
    console.log('   Use "npm run admin:test <email>" to test admin access first.');
  }

  /**
   * Verify system configuration
   */
  async verifySystem(): Promise<boolean> {
    console.log('🔧 Verifying JewGo admin system configuration...');
    console.log('');

    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log(`   BACKEND_URL: ${this.backendUrl}`);
    console.log(`   API_BASE: ${this.apiBase}`);
    console.log('');

    // Test backend connection
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ System verification failed - cannot connect to backend');
      return false;
    }

    // Test auth endpoints
    console.log('🔍 Testing authentication endpoints...');
    const healthResponse = await this.makeRequest('/auth/health');
    if (healthResponse.success) {
      console.log('✅ Authentication service is healthy');
    } else {
      console.log(`❌ Authentication service issues: ${healthResponse.error}`);
      return false;
    }

    console.log('');
    console.log('✅ System verification completed successfully');
    console.log('');
    console.log('📚 Available commands:');
    console.log('   npm run admin:create-super-admin <email> "<name>"');
    console.log('   npm run admin:test <email>');
    console.log('   npm run admin:list');
    console.log('');

    return true;
  }
}

// CLI Interface
async function promptPassword(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = promisify(rl.question).bind(rl);
  
  try {
    // Simple password prompt (in production, use a proper password prompt library)
    const password = await question('Enter password (or press Enter for default "Jewgo123"): ');
    rl.close();
    return (password as unknown as string).trim() || 'Jewgo123';
  } catch (_error) {
    rl.close();
    return 'Jewgo123';
  }
}

async function main() {
  const manager = new AdminSetupManager();
  const command = process.argv[2];
  const email = process.argv[3];
  const name = process.argv[4];

  console.log('🎯 JewGo Admin Setup Tool');
  console.log('========================');
  console.log('');

  switch (command) {
    case 'verify':
      await manager.verifySystem();
      break;

    case 'create-super-admin':
      if (!email) {
        console.log('❌ Usage: npm run admin:create-super-admin <email> "<name>"');
        console.log('   Example: npm run admin:create-super-admin admin@jewgo.app "JewGo Administrator"');
        process.exit(1);
      }
      
      const userName = name || 'JewGo Administrator';
      const password = await promptPassword();
      await manager.createSuperAdmin(email, userName, password);
      break;

    case 'test':
      if (!email) {
        console.log('❌ Usage: npm run admin:test <email>');
        process.exit(1);
      }
      
      const testPassword = await promptPassword();
      const hasAccess = await manager.verifyAdminAccess(email, testPassword);
      process.exit(hasAccess ? 0 : 1);
      break;

    case 'list':
      await manager.listAdmins();
      break;

    default:
      console.log('❌ Unknown command. Available commands:');
      console.log('   verify              - Verify system configuration');
      console.log('   create-super-admin  - Create a new super admin user');
      console.log('   test               - Test admin user access');
      console.log('   list               - List admin users');
      console.log('');
      console.log('Examples:');
      console.log('   npm run admin:verify');
      console.log('   npm run admin:create-super-admin admin@jewgo.app "JewGo Administrator"');
      console.log('   npm run admin:test admin@jewgo.app');
      process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { AdminSetupManager };