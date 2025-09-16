#!/usr/bin/env node
/**
 * Direct API Test Script to Create Admin User
 * 
 * This script creates the admin user Admin@jewgo.app with password Jewgo123
 * using direct API calls to the JewGo backend.
 */

// Using Node.js built-in fetch (Node 18+)
// const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
const API_BASE = `${BACKEND_URL}/api/v5`;

const ADMIN_EMAIL = 'Admin@jewgo.app';
const ADMIN_PASSWORD = 'Jewgo123';
const ADMIN_NAME = 'JewGo Administrator';

// Helper function to make API requests
async function makeApiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'JewGo-Admin-Creator/1.0',
      ...options.headers
    };

    console.log(`🔗 Making request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { error: 'Invalid JSON response', status: response.status };
    }

    console.log(`📋 Response Status: ${response.status}`);
    console.log(`📄 Response Data:`, JSON.stringify(responseData, null, 2));

    return {
      ok: response.ok,
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return {
      ok: false,
      error: error.message
    };
  }
}

// Test backend connection
async function testConnection() {
  console.log('🔗 Testing backend connection...');
  
  try {
    const response = await makeApiRequest('/auth/health');
    if (response.ok) {
      console.log('✅ Backend is reachable and healthy');
      return true;
    } else {
      console.log(`❌ Backend health check failed: ${response.data?.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot connect to backend: ${error.message}`);
    return false;
  }
}

// Create user account
async function createUser() {
  console.log('👤 Creating user account...');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Name: ${ADMIN_NAME}`);
  
  const userData = {
    email: ADMIN_EMAIL.toLowerCase(),
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
    terms_accepted: true
  };

  const response = await makeApiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });

  if (response.ok && response.data.success) {
    console.log('✅ User created successfully!');
    console.log(`   User ID: ${response.data.data?.user?.id}`);
    console.log(`   Email: ${response.data.data?.user?.email}`);
    return {
      success: true,
      user: response.data.data.user,
      tokens: response.data.data.tokens
    };
  } else {
    console.log(`❌ User creation failed: ${response.data?.error || 'Unknown error'}`);
    return { success: false, error: response.data?.error };
  }
}

// Test authentication
async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  const loginData = {
    email: ADMIN_EMAIL.toLowerCase(),
    password: ADMIN_PASSWORD,
    remember_me: false
  };

  const response = await makeApiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginData)
  });

  if (response.ok && response.data.success) {
    console.log('✅ Authentication successful!');
    return {
      success: true,
      user: response.data.data.user,
      tokens: response.data.data.tokens
    };
  } else {
    console.log(`❌ Authentication failed: ${response.data?.error || 'Unknown error'}`);
    return { success: false, error: response.data?.error };
  }
}

// Generate SQL command to assign admin role
function generateAdminRoleSQL(userId) {
  const sqlCommand = `
-- Assign super_admin role to the created user
INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)
VALUES ('${userId}', 'super_admin', 100, NOW(), 'system', TRUE)
ON CONFLICT (user_id, role) 
DO UPDATE SET 
  level = EXCLUDED.level,
  granted_at = EXCLUDED.granted_at,
  is_active = TRUE;

-- Verify the role assignment
SELECT u.email, ur.role, ur.level, ur.granted_at, ur.is_active
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.id = '${userId}';
`;

  return sqlCommand;
}

// Main execution
async function main() {
  console.log('🎯 JewGo Admin User Creator');
  console.log('===========================');
  console.log('');
  console.log(`Creating admin user: ${ADMIN_EMAIL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');

  // Step 1: Test connection
  if (!(await testConnection())) {
    console.log('❌ Cannot proceed without backend connection');
    process.exit(1);
  }
  console.log('');

  // Step 2: Try authentication first (in case user already exists)
  console.log('🔍 Checking if user already exists...');
  const existingAuth = await testAuthentication();
  console.log('');

  let userId, tokens;

  if (existingAuth.success) {
    console.log('ℹ️  User already exists!');
    userId = existingAuth.user.id;
    tokens = existingAuth.tokens;
    
    // Check if user already has admin roles
    const roles = existingAuth.user.roles || [];
    const adminRoles = roles.filter(role => 
      ['super_admin', 'system_admin', 'data_admin', 'moderator'].includes(role.role)
    );
    
    if (adminRoles.length > 0) {
      console.log('✅ User already has admin roles:');
      adminRoles.forEach(role => {
        console.log(`   - ${role.role} (level ${role.level})`);
      });
    } else {
      console.log('⚠️  User exists but has no admin roles');
    }
  } else {
    // Step 3: Create user
    const createResult = await createUser();
    console.log('');

    if (!createResult.success) {
      console.log('❌ Cannot proceed without user creation');
      process.exit(1);
    }

    userId = createResult.user.id;
    tokens = createResult.tokens;

    // Step 4: Test authentication with new user
    console.log('🔐 Verifying new user authentication...');
    const authResult = await testAuthentication();
    console.log('');

    if (!authResult.success) {
      console.log('⚠️  User created but authentication failed');
    }
  }

  // Step 5: Generate SQL for admin role assignment
  console.log('👑 Admin Role Assignment');
  console.log('========================');
  console.log('');
  console.log('📝 Execute the following SQL in your PostgreSQL database:');
  console.log('');
  console.log(generateAdminRoleSQL(userId));
  console.log('');

  // Step 6: Provide next steps
  console.log('🎉 Setup Complete!');
  console.log('==================');
  console.log('');
  console.log('✅ User created successfully:');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   User ID: ${userId}`);
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Execute the SQL commands above in your PostgreSQL database');
  console.log('2. Test admin access with: npm run admin:test admin@jewgo.app');
  console.log('3. Verify system: npm run admin:verify');
  console.log('');

  // Step 7: Test access token if we have one
  if (tokens?.access_token) {
    console.log('🔍 Testing API access with current token...');
    const profileResponse = await makeApiRequest('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (profileResponse.ok) {
      console.log('✅ API access with token successful');
      console.log(`   Current roles: ${JSON.stringify(profileResponse.data.user?.roles || [])}`);
    } else {
      console.log(`⚠️  API access test failed: ${profileResponse.data?.error}`);
    }
    console.log('');
  }

  console.log('🚀 Admin user setup completed successfully!');
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}