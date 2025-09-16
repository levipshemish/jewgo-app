#!/usr/bin/env node
/**
 * Careful Admin User Creator - Respects Rate Limits
 * 
 * This script creates the admin user Admin@jewgo.app with password Jewgo123
 * while being respectful of API rate limits.
 */

// Configuration
const BACKEND_URL = 'https://api.jewgo.app';
const API_BASE = `${BACKEND_URL}/api/v5`;

const ADMIN_EMAIL = 'Admin@jewgo.app';
const ADMIN_PASSWORD = 'Jewgo123';
const ADMIN_NAME = 'JewGo Administrator';

// Helper to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to make API requests with retry logic
async function makeApiRequest(endpoint, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'JewGo-Admin-Creator/1.0',
        ...options.headers
      };

      console.log(`🔗 Attempt ${attempt}: ${url}`);
      
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

      console.log(`📋 Status: ${response.status}`);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = responseData.rate_limit?.retry_after || 60;
        console.log(`⏱️  Rate limited. Waiting ${retryAfter} seconds...`);
        
        if (attempt < retries) {
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        data: responseData
      };
    } catch (error) {
      console.error(`❌ Request failed (attempt ${attempt}):`, error.message);
      
      if (attempt < retries) {
        console.log(`⏱️  Retrying in 5 seconds...`);
        await sleep(5000);
        continue;
      }
      
      return {
        ok: false,
        error: error.message
      };
    }
  }
}

// Create user account
async function createAdminUser() {
  console.log('🎯 JewGo Admin User Creator (Rate-Limit Aware)');
  console.log('===============================================');
  console.log('');
  console.log(`Creating admin user: ${ADMIN_EMAIL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');

  // Step 1: Test connection
  console.log('🔗 Testing backend connection...');
  const healthResponse = await makeApiRequest('/auth/health');
  
  if (!healthResponse.ok) {
    console.log('❌ Cannot connect to backend');
    return false;
  }
  
  console.log('✅ Backend is healthy');
  console.log('');

  // Step 2: Try to register user
  console.log('👤 Creating user account...');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Name: ${ADMIN_NAME}`);
  
  const userData = {
    email: ADMIN_EMAIL.toLowerCase(),
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
    terms_accepted: true
  };

  const registerResponse = await makeApiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });

  if (registerResponse.ok && registerResponse.data.success) {
    console.log('✅ User created successfully!');
    const userId = registerResponse.data.data?.user?.id;
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${registerResponse.data.data?.user?.email}`);
    
    // Generate SQL for admin role
    console.log('');
    console.log('👑 Admin Role Assignment');
    console.log('========================');
    console.log('');
    console.log('📝 Execute this SQL in your PostgreSQL database:');
    console.log('');
    console.log(`-- Assign super_admin role to ${ADMIN_EMAIL}`);
    console.log(`INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)`);
    console.log(`VALUES ('${userId}', 'super_admin', 100, NOW(), 'system', TRUE)`);
    console.log(`ON CONFLICT (user_id, role) DO UPDATE SET`);
    console.log(`  level = EXCLUDED.level,`);
    console.log(`  granted_at = EXCLUDED.granted_at,`);
    console.log(`  is_active = TRUE;`);
    console.log('');
    
    // Test authentication after a delay
    console.log('⏱️  Waiting 5 seconds before testing authentication...');
    await sleep(5000);
    
    console.log('🔐 Testing authentication...');
    const loginData = {
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      remember_me: false
    };

    const authResponse = await makeApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    if (authResponse.ok && authResponse.data.success) {
      console.log('✅ Authentication successful!');
      console.log(`   User: ${authResponse.data.data?.user?.name}`);
      console.log(`   Roles: ${JSON.stringify(authResponse.data.data?.user?.roles || [])}`);
    } else {
      console.log(`⚠️  Authentication test failed: ${authResponse.data?.error}`);
    }
    
    console.log('');
    console.log('🎉 Admin User Creation Complete!');
    console.log('================================');
    console.log('');
    console.log('✅ User account created:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   User ID: ${userId}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Execute the SQL command above in your PostgreSQL database');
    console.log('2. Test admin access: npm run admin:test admin@jewgo.app');
    console.log('3. Verify system: npm run admin:verify');
    console.log('');
    
    return true;
  } else {
    const error = registerResponse.data?.error || 'Unknown error';
    console.log(`❌ User creation failed: ${error}`);
    
    // Check if user already exists
    if (error.includes('already registered') || error.includes('already exists')) {
      console.log('');
      console.log('ℹ️  User already exists. Testing authentication...');
      
      await sleep(2000); // Brief delay
      
      const loginData = {
        email: ADMIN_EMAIL.toLowerCase(),
        password: ADMIN_PASSWORD,
        remember_me: false
      };

      const authResponse = await makeApiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });

      if (authResponse.ok && authResponse.data.success) {
        console.log('✅ Existing user authentication successful!');
        const userId = authResponse.data.data?.user?.id;
        const roles = authResponse.data.data?.user?.roles || [];
        
        console.log(`   User ID: ${userId}`);
        console.log(`   Current roles: ${JSON.stringify(roles)}`);
        
        const hasAdminRole = roles.some(role => 
          ['super_admin', 'system_admin', 'data_admin', 'moderator'].includes(role.role)
        );
        
        if (hasAdminRole) {
          console.log('✅ User already has admin privileges!');
        } else {
          console.log('⚠️  User exists but needs admin role assignment');
          console.log('');
          console.log('📝 Execute this SQL to assign admin role:');
          console.log(`INSERT INTO user_roles (user_id, role, level, granted_at, granted_by, is_active)`);
          console.log(`VALUES ('${userId}', 'super_admin', 100, NOW(), 'system', TRUE)`);
          console.log(`ON CONFLICT (user_id, role) DO UPDATE SET is_active = TRUE;`);
        }
        
        return true;
      } else {
        console.log(`❌ Authentication failed: ${authResponse.data?.error}`);
        return false;
      }
    }
    
    return false;
  }
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  createAdminUser().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}