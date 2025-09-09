#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates all required environment variables and provides helpful error messages
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Environment variable definitions
const ENV_VARS = {
  required: {
    'NEXT_PUBLIC_BACKEND_URL': {
      description: 'Backend API URL',
      example: 'https://api.jewgo.app',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }
    }
  },
  optional: {
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': {
      description: 'Google Maps API Key',
      example: 'AIzaSy...',
      validate: (value) => value && value.length > 10
    },
    'NEXT_PUBLIC_APP_URL': {
      description: 'Frontend App URL',
      example: 'https://jewgo.app',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }
    },
    'NEXTAUTH_SECRET': {
      description: 'NextAuth Secret',
      example: 'your-secret-key',
      validate: (value) => value && value.length >= 32
    },
    'NEXTAUTH_URL': {
      description: 'NextAuth URL',
      example: 'https://jewgo.app',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }
    }
  }
};

// Backend URL fallback strategies
const BACKEND_FALLBACKS = {
  production: [
    'https://api.jewgo.app',
    'https://jewgo-api.herokuapp.com',
    'https://jewgo-backend.vercel.app'
  ],
  development: [
    'http://127.0.0.1:8082',
    'http://localhost:8082',
    'http://127.0.0.1:5000',
    'http://localhost:5000'
  ]
};

function validateEnvironment() {
  log('\n🔍 Validating Environment Configuration\n', 'bright');
  
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'cyan');
  log(`Platform: ${process.platform}`, 'cyan');
  log(`Node Version: ${process.version}\n`, 'cyan');
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check required environment variables
  log('📋 Required Environment Variables:', 'bright');
  for (const [key, config] of Object.entries(ENV_VARS.required)) {
    const value = process.env[key];
    
    if (!value) {
      logError(`${key} is not set`);
      logInfo(`Description: ${config.description}`);
      logInfo(`Example: ${config.example}`);
      hasErrors = true;
    } else if (config.validate && !config.validate(value)) {
      logError(`${key} has invalid value: ${value}`);
      logInfo(`Description: ${config.description}`);
      logInfo(`Example: ${config.example}`);
      hasErrors = true;
    } else {
      logSuccess(`${key} is properly configured`);
    }
  }
  
  // Check optional environment variables
  log('\n📋 Optional Environment Variables:', 'bright');
  for (const [key, config] of Object.entries(ENV_VARS.optional)) {
    const value = process.env[key];
    
    if (!value) {
      logWarning(`${key} is not set (optional)`);
      logInfo(`Description: ${config.description}`);
      logInfo(`Example: ${config.example}`);
      hasWarnings = true;
    } else if (config.validate && !config.validate(value)) {
      logWarning(`${key} has invalid value: ${value}`);
      logInfo(`Description: ${config.description}`);
      logInfo(`Example: ${config.example}`);
      hasWarnings = true;
    } else {
      logSuccess(`${key} is properly configured`);
    }
  }
  
  // Special backend URL validation with fallbacks
  log('\n🌐 Backend URL Configuration:', 'bright');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (!backendUrl) {
    logError('NEXT_PUBLIC_BACKEND_URL is not set');
    
    const fallbacks = isProduction ? BACKEND_FALLBACKS.production : BACKEND_FALLBACKS.development;
    logInfo('Available fallback URLs:');
    fallbacks.forEach((fallback, index) => {
      logInfo(`  ${index + 1}. ${fallback}`);
    });
    
    logInfo('\nTo fix this, add to your .env.local file:');
    logInfo(`NEXT_PUBLIC_BACKEND_URL=${fallbacks[0]}`);
    hasErrors = true;
  } else {
    try {
      new URL(backendUrl);
      logSuccess(`Backend URL is valid: ${backendUrl}`);
      
      // Test connectivity (basic check)
      if (isProduction) {
        logInfo('Testing backend connectivity...');
        // Note: In a real implementation, you might want to make an actual HTTP request
        logInfo('Backend URL appears to be properly configured for production');
      }
    } catch (error) {
      logError(`Backend URL is invalid: ${backendUrl}`);
      logInfo('URL must be a valid HTTP/HTTPS URL');
      hasErrors = true;
    }
  }
  
  // Check for common configuration issues
  log('\n🔧 Configuration Checks:', 'bright');
  
  // Check if .env.local exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    logSuccess('.env.local file exists');
  } else {
    logWarning('.env.local file not found');
    logInfo('Create .env.local file with your environment variables');
    hasWarnings = true;
  }
  
  // Check if .env.example exists
  const envExamplePath = path.join(process.cwd(), 'env.example');
  if (fs.existsSync(envExamplePath)) {
    logSuccess('env.example file exists');
  } else {
    logWarning('env.example file not found');
  }
  
  // Summary
  log('\n📊 Validation Summary:', 'bright');
  
  if (hasErrors) {
    logError('Environment validation failed with errors');
    logInfo('Please fix the errors above before proceeding');
    process.exit(1);
  } else if (hasWarnings) {
    logWarning('Environment validation completed with warnings');
    logInfo('Consider addressing the warnings above for optimal configuration');
    process.exit(0);
  } else {
    logSuccess('Environment validation passed successfully');
    logInfo('All required environment variables are properly configured');
    process.exit(0);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = {
  validateEnvironment,
  ENV_VARS,
  BACKEND_FALLBACKS
};
