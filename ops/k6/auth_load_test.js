/*
K6 Load Testing Script for JWT Authentication System

This script tests the authentication endpoints under realistic load conditions,
including login, token refresh, and concurrent user scenarios.
*/

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const refreshSuccessRate = new Rate('refresh_success_rate');
const loginLatency = new Trend('login_latency');
const refreshLatency = new Trend('refresh_latency');
const authErrors = new Counter('auth_errors');
const tokenReuseDetected = new Counter('token_reuse_detected');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 20 },   // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    login_success_rate: ['rate>0.95'], // Login success rate must be above 95%
    refresh_success_rate: ['rate>0.98'], // Refresh success rate must be above 98%
    login_latency: ['p(95)<1500'], // 95% of logins must complete below 1.5s
    refresh_latency: ['p(95)<500'], // 95% of refreshes must complete below 500ms
    auth_errors: ['count<100'], // Less than 100 auth errors total
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TEST_EMAIL_PREFIX = 'loadtest';
const TEST_PASSWORD = 'LoadTest123!';

// User session state
class UserSession {
  constructor(userId) {
    this.userId = userId;
    this.email = `${TEST_EMAIL_PREFIX}_${userId}@example.com`;
    this.accessToken = null;
    this.refreshToken = null;
    this.csrfToken = null;
  }

  async getCsrfToken() {
    const response = http.get(`${BASE_URL}/api/auth/csrf`);
    if (response.status === 200) {
      const data = JSON.parse(response.body);
      this.csrfToken = data.token;
    }
    return this.csrfToken;
  }

  async login() {
    await this.getCsrfToken();
    
    const payload = {
      email: this.email,
      password: TEST_PASSWORD,
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const startTime = Date.now();
    const response = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify(payload),
      { headers, timeout: '30s' }
    );
    const endTime = Date.now();

    const latency = endTime - startTime;
    loginLatency.add(latency);

    const success = check(response, {
      'login status is 200': (r) => r.status === 200,
      'login response has tokens': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.tokens && data.tokens.access_token;
        } catch {
          return false;
        }
      },
    });

    loginSuccessRate.add(success);

    if (success && response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        this.accessToken = data.tokens.access_token;
        this.refreshToken = data.tokens.refresh_token;
        return true;
      } catch (e) {
        authErrors.add(1);
        return false;
      }
    } else {
      authErrors.add(1);
      return false;
    }
  }

  async refresh() {
    if (!this.refreshToken) {
      authErrors.add(1);
      return false;
    }

    await this.getCsrfToken();

    const payload = {
      refresh_token: this.refreshToken,
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const startTime = Date.now();
    const response = http.post(
      `${BASE_URL}/api/auth/refresh`,
      JSON.stringify(payload),
      { headers, timeout: '30s' }
    );
    const endTime = Date.now();

    const latency = endTime - startTime;
    refreshLatency.add(latency);

    const success = check(response, {
      'refresh status is 200': (r) => r.status === 200,
      'refresh response has new tokens': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.access_token && data.refresh_token;
        } catch {
          return false;
        }
      },
    });

    refreshSuccessRate.add(success);

    if (success && response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        const oldRefreshToken = this.refreshToken;
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        
        // Verify token rotation happened
        if (oldRefreshToken === this.refreshToken) {
          console.warn('Token was not rotated!');
          authErrors.add(1);
        }
        
        return true;
      } catch (e) {
        authErrors.add(1);
        return false;
      }
    } else {
      authErrors.add(1);
      return false;
    }
  }

  async testTokenReuse() {
    // Attempt to use the same refresh token twice (should fail on second use)
    if (!this.refreshToken) return;

    const oldToken = this.refreshToken;
    
    // First refresh should succeed
    const firstRefresh = await this.refresh();
    
    if (firstRefresh) {
      // Attempt to use the old token again (should fail)
      await this.getCsrfToken();
      
      const response = http.post(
        `${BASE_URL}/api/auth/refresh`,
        JSON.stringify({ refresh_token: oldToken }),
        { 
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.csrfToken,
          },
          timeout: '30s'
        }
      );

      // This should fail (token reuse detection)
      if (response.status !== 200) {
        tokenReuseDetected.add(1);
      } else {
        console.warn('Token reuse was not detected!');
        authErrors.add(1);
      }
    }
  }

  async getUserProfile() {
    if (!this.accessToken) return false;

    const response = http.get(
      `${BASE_URL}/api/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        timeout: '30s'
      }
    );

    return check(response, {
      'profile request successful': (r) => r.status === 200,
    });
  }
}

export default function () {
  const userId = `${__VU}_${__ITER}`;
  const session = new UserSession(userId);

  group('Authentication Flow', () => {
    group('User Login', () => {
      const loginSuccess = session.login();
      
      if (!loginSuccess) {
        console.error(`Login failed for user ${userId}`);
        return;
      }
      
      // Small delay to simulate user behavior
      sleep(0.5);
    });

    group('Token Operations', () => {
      // Test getting user profile with access token
      session.getUserProfile();
      
      // Wait a bit, then refresh token
      sleep(1);
      
      // Test token refresh
      const refreshSuccess = session.refresh();
      
      if (refreshSuccess) {
        // Test profile access with new token
        session.getUserProfile();
      }
      
      // Occasionally test token reuse detection
      if (Math.random() < 0.1) { // 10% of the time
        session.testTokenReuse();
      }
    });
  });

  // Random delay between iterations (1-3 seconds)
  sleep(1 + Math.random() * 2);
}

// Concurrent refresh test (separate scenario)
export function concurrentRefresh() {
  const userId = `concurrent_${__VU}`;
  const session = new UserSession(userId);

  // First login to get tokens
  if (!session.login()) {
    return;
  }

  // Multiple concurrent refresh attempts with the same token
  const refreshPromises = [];
  for (let i = 0; i < 5; i++) {
    refreshPromises.push(session.refresh());
  }

  // Only one should succeed, others should fail
  Promise.all(refreshPromises).then(results => {
    const successCount = results.filter(r => r).length;
    if (successCount > 1) {
      console.warn(`Multiple concurrent refreshes succeeded: ${successCount}`);
      authErrors.add(successCount - 1);
    }
  });
}

// Guest user load test
export function guestUserTest() {
  group('Guest User Flow', () => {
    const response = http.post(
      `${BASE_URL}/api/auth/guest`,
      '{}',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: '30s'
      }
    );

    check(response, {
      'guest creation successful': (r) => r.status === 200,
      'guest has tokens': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.tokens && data.tokens.access_token;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(0.5);
}

// Export test scenarios
export const scenarios = {
  // Main authentication flow test
  auth_flow: {
    executor: 'ramping-vus',
    exec: 'default',
    stages: options.stages,
    gracefulRampDown: '30s',
  },
  
  // Concurrent refresh test (smaller load)
  concurrent_refresh: {
    executor: 'constant-vus',
    exec: 'concurrentRefresh',
    vus: 10,
    duration: '2m',
    startTime: '1m',
  },
  
  // Guest user test
  guest_users: {
    executor: 'constant-arrival-rate',
    exec: 'guestUserTest',
    rate: 5, // 5 guest creations per second
    timeUnit: '1s',
    duration: '5m',
    preAllocatedVUs: 10,
    maxVUs: 20,
    startTime: '30s',
  },
};

// Setup function (runs once at start)
export function setup() {
  console.log('Starting JWT Authentication Load Test');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test stages: ${JSON.stringify(options.stages)}`);
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/api/auth/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  
  console.log('Auth service health check passed');
  return { startTime: Date.now() };
}

// Teardown function (runs once at end) 
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(1)} seconds`);
}

// Helper function to run specific test scenarios
export function handleSummary(data) {
  const summary = {
    'Test Summary': {
      'Total Requests': data.metrics.http_reqs.count,
      'Request Rate': `${data.metrics.http_reqs.rate.toFixed(2)}/sec`,
      'Average Response Time': `${data.metrics.http_req_duration.avg.toFixed(2)}ms`,
      'P95 Response Time': `${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms`,
      'Error Rate': `${((data.metrics.http_req_failed.rate || 0) * 100).toFixed(2)}%`,
    },
    'Authentication Metrics': {
      'Login Success Rate': `${((data.metrics.login_success_rate.rate || 0) * 100).toFixed(2)}%`,
      'Refresh Success Rate': `${((data.metrics.refresh_success_rate.rate || 0) * 100).toFixed(2)}%`,
      'Average Login Latency': `${(data.metrics.login_latency.avg || 0).toFixed(2)}ms`,
      'Average Refresh Latency': `${(data.metrics.refresh_latency.avg || 0).toFixed(2)}ms`,
      'Auth Errors': data.metrics.auth_errors.count || 0,
      'Token Reuse Detected': data.metrics.token_reuse_detected.count || 0,
    }
  };

  console.log('\n' + '='.repeat(50));
  console.log('JWT AUTHENTICATION LOAD TEST RESULTS');
  console.log('='.repeat(50));
  
  Object.entries(summary).forEach(([section, metrics]) => {
    console.log(`\n${section}:`);
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
  
  console.log('\n' + '='.repeat(50));

  return {
    'summary.json': JSON.stringify(summary, null, 2),
    stdout: '', // Don't duplicate output
  };
}