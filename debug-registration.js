#!/usr/bin/env node
/**
 * Debug Registration - Check Each Step
 */

const API_BASE = 'https://api.jewgo.app/api/v5';

async function debugRegistration() {
  console.log('🔍 Debug Registration Process');
  console.log('=============================\n');

  try {
    // Step 1: Test backend health
    console.log('1. Testing backend health...');
    const healthResponse = await fetch(`${API_BASE}/auth/health`);
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Health: ${JSON.stringify(healthData, null, 2)}\n`);

    // Step 2: Get CSRF token
    console.log('2. Getting CSRF token...');
    const csrfResponse = await fetch(`${API_BASE}/auth/csrf`, {
      headers: { 'User-Agent': 'JewGo-Debug/1.0' }
    });
    const csrfData = await csrfResponse.json();
    console.log(`   Status: ${csrfResponse.status}`);
    console.log(`   CSRF: ${JSON.stringify(csrfData, null, 2)}\n`);

    if (!csrfData.success || !csrfData.data?.csrf_token) {
      throw new Error('Failed to get CSRF token');
    }

    const csrfToken = csrfData.data.csrf_token;

    // Step 3: Test with minimal user data
    console.log('3. Testing registration with minimal data...');
    const minimalUser = {
      email: 'debug@jewgo.app',
      password: 'Debug123!',
      name: 'Debug User',
      terms_accepted: true
    };

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JewGo-Debug/1.0',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(minimalUser)
    });

    const registerData = await registerResponse.json();
    console.log(`   Status: ${registerResponse.status}`);
    console.log(`   Registration: ${JSON.stringify(registerData, null, 2)}\n`);

    if (registerResponse.ok && registerData.success) {
      console.log('✅ Registration successful!');
      console.log(`   User ID: ${registerData.data?.user?.id}`);
      
      // Step 4: Test authentication
      console.log('4. Testing authentication...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JewGo-Debug/1.0',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          email: 'debug@jewgo.app',
          password: 'Debug123!'
        })
      });

      const loginData = await loginResponse.json();
      console.log(`   Auth Status: ${loginResponse.status}`);
      console.log(`   Auth Data: ${JSON.stringify(loginData, null, 2)}\n`);

      if (loginResponse.ok && loginData.success) {
        console.log('✅ Authentication successful!');
        console.log('🎉 Registration API is working correctly!');
      } else {
        console.log('❌ Authentication failed but registration worked');
      }
    } else {
      console.log('❌ Registration failed');
      
      // Try to get more specific error details
      if (registerData.error === 'Failed to create user account') {
        console.log('\n🔍 This suggests a database constraint issue.');
        console.log('   Possible causes:');
        console.log('   - Missing required database fields');
        console.log('   - Database constraint violations');
        console.log('   - User already exists');
        console.log('   - Database connection issues');
      }
    }

  } catch (error) {
    console.error(`❌ Debug Error: ${error.message}`);
  }
}

debugRegistration();