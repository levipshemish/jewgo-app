/**
 * Unified Build and Deployment Utilities
 * ======================================
 * 
 * Centralized build and deployment utility functions to eliminate code duplication.
 * This module consolidates common build, deployment, and validation functions
 * used across the frontend scripts.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Environment configuration templates
 */
const ENV_TEMPLATES = {
  VERCEL: {
    // SMTP Configuration
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'your-smtp-user@example.com',
    SMTP_PASS: 'your-smtp-password',
    SMTP_FROM: 'noreply@example.com',
    
    // Application URLs
    NEXT_PUBLIC_URL: 'https://jewgo-app.vercel.app',
    NEXTAUTH_URL: 'https://jewgo-app.vercel.app',
    
    // Database
    DATABASE_URL: 'postgresql://username:password@host:5432/database_name?sslmode=require',
    
    // NextAuth
    NEXTAUTH_SECRET: 'your-nextauth-secret',
    
    // Google OAuth
    GOOGLE_CLIENT_ID: 'your-google-client-id',
    GOOGLE_CLIENT_SECRET: 'your-google-client-secret',
    
    // Backend URL
    NEXT_PUBLIC_BACKEND_URL: 'https://jewgo.onrender.com',
    
    // Google Maps
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: '5060e374c6d88aacf8fea324',
    
    // Environment
    NODE_ENV: 'production'
  },
  
  RENDER: {
    // SMTP Configuration
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'your-smtp-user@example.com',
    SMTP_PASS: 'your-smtp-password',
    SMTP_FROM: 'noreply@example.com',
    
    // Database
    DATABASE_URL: 'postgresql://username:password@host:5432/database_name?sslmode=require',
    
    // Security Tokens
    ADMIN_TOKEN: 'your-secure-admin-token',
    SCRAPER_TOKEN: 'your-secure-scraper-token',
    
    // Application URLs
    FRONTEND_URL: 'https://jewgo-app.vercel.app',
    BACKEND_URL: 'https://jewgo.onrender.com',
    
    // Redis Configuration
    REDIS_URL: 'redis://user:password@host:6379',
    REDIS_HOST: 'your-redis-host.com',
    REDIS_PORT: '6379',
    REDIS_DB: '0',
    REDIS_USERNAME: 'default',
    REDIS_PASSWORD: 'your-redis-password',
    
    // Google Places API
    GOOGLE_PLACES_API_KEY: 'your-google-places-api-key',
    
    // Sentry
    SENTRY_DSN: 'your-sentry-dsn',
    
    // Environment
    ENVIRONMENT: 'production',
    FLASK_ENV: 'production'
  }
};

/**
 * Required environment variables for validation
 */
const REQUIRED_ENV_VARS = {
  FRONTEND: [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'NEXT_PUBLIC_URL',
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ],
  
  BACKEND: [
    'DATABASE_URL',
    'ADMIN_TOKEN',
    'SCRAPER_TOKEN',
    'FRONTEND_URL',
    'BACKEND_URL',
    'REDIS_URL',
    'GOOGLE_PLACES_API_KEY'
  ]
};

/**
 * Required files for validation
 */
const REQUIRED_FILES = {
  FRONTEND: [
    'lib/email.ts',
    'lib/api-config.ts',
    'app/api/auth/register/route.ts',
    'app/api/auth/verify-email/route.ts',
    'app/api/auth/reset-password/route.ts',
    'app/api/auth/reset-password/confirm/route.ts',
    'app/auth/forgot-password/page.tsx',
    'app/auth/reset-password/page.tsx',
    'vercel.json',
    'prisma/schema.prisma'
  ],
  
  BACKEND: [
    'app.py',
    'requirements.txt',
    'config/config.py',
    'database/database_manager.py',
    'services/base_service.py'
  ]
};

/**
 * Generate a secure random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate scraper token
 */
function generateScraperToken() {
  return generateSecureToken(32);
}

/**
 * Create environment file
 */
function createEnvFile(envVars, filename) {
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(filename, envContent);
  console.log(`✅ Created ${filename}`);
}

/**
 * Validate environment variables
 */
function validateEnvironment(platform = 'FRONTEND') {
  const requiredVars = REQUIRED_ENV_VARS[platform] || [];
  const missing = [];
  const warnings = [];
  
  // Check required environment variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Validate file structure
 */
function validateFileStructure(platform = 'FRONTEND') {
  const requiredFiles = REQUIRED_FILES[platform] || [];
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => {
      console.error(`   - ${file}`);
    });
    console.error('');
  }
  
  return {
    isValid: missingFiles.length === 0,
    missingFiles
  };
}

/**
 * Check for hardcoded secrets
 */
function checkHardcodedSecrets(platform = 'FRONTEND') {
  const filesToCheck = REQUIRED_FILES[platform] || [];
  const suspiciousPatterns = [
    /your-smtp-password/,
    /your-smtp-user@example\.com/,
    /noreply@example\.com/,
    /your-secure-admin-token/,
    /your-secure-scraper-token/,
    /your-google-maps-api-key/,
    /your-sentry-dsn/
  ];
  
  const hardcodedSecrets = [];
  
  filesToCheck.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        suspiciousPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            hardcodedSecrets.push(`${file}: ${pattern.source}`);
          }
        });
      } catch (error) {
        console.warn(`⚠️  Could not read file: ${file}`);
      }
    }
  });
  
  if (hardcodedSecrets.length > 0) {
    console.error('❌ Potential hardcoded secrets found:');
    hardcodedSecrets.forEach(secret => {
      console.error(`   - ${secret}`);
    });
    console.error('');
  }
  
  return {
    isValid: hardcodedSecrets.length === 0,
    hardcodedSecrets
  };
}

/**
 * Validate database configuration
 */
function validateDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return false;
  }
  
  // Check if it's a valid PostgreSQL URL
  if (!databaseUrl.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL should be a PostgreSQL connection string');
    return false;
  }
  
  return true;
}

/**
 * Validate email configuration
 */
function validateEmail() {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing email configuration:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    return false;
  }
  
  return true;
}

/**
 * Run comprehensive validation
 */
function runValidation(platform = 'FRONTEND') {
  console.log(`🔍 Validating ${platform.toLowerCase()} deployment...`);
  
  const envValidation = validateEnvironment(platform);
  const fileValidation = validateFileStructure(platform);
  const secretsValidation = checkHardcodedSecrets(platform);
  const dbValidation = validateDatabase();
  const emailValidation = validateEmail();
  
  const hasErrors = !envValidation.isValid || 
                   !fileValidation.isValid || 
                   !secretsValidation.isValid || 
                   !dbValidation || 
                   !emailValidation;
  
  if (hasErrors) {
    console.error('❌ Deployment validation failed!');
    console.error('Please fix the issues above before deploying.');
    process.exit(1);
  } else {
    console.log('✅ Deployment validation passed!');
  }
  
  return {
    envValidation,
    fileValidation,
    secretsValidation,
    dbValidation,
    emailValidation,
    isValid: !hasErrors
  };
}

/**
 * Setup deployment environment
 */
function setupDeployment(platform = 'VERCEL') {
  console.log(`🚀 Setting up ${platform} deployment...`);
  
  const envVars = ENV_TEMPLATES[platform];
  if (!envVars) {
    console.error(`❌ Unknown platform: ${platform}`);
    return false;
  }
  
  // Generate secure tokens if needed
  if (platform === 'RENDER' && envVars.SCRAPER_TOKEN === 'your-secure-scraper-token') {
    envVars.SCRAPER_TOKEN = generateScraperToken();
  }
  
  // Create environment file
  const filename = `${platform.toLowerCase()}.env.production`;
  createEnvFile(envVars, filename);
  
  console.log(`✅ ${platform} deployment setup complete!`);
  return true;
}

/**
 * Build application
 */
function buildApplication() {
  console.log('🔨 Building application...');
  
  try {
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Run type checking
    console.log('🔍 Running type checking...');
    execSync('npm run typecheck', { stdio: 'inherit' });
    
    // Run linting
    console.log('🧹 Running linting...');
    execSync('npm run lint', { stdio: 'inherit' });
    
    // Run tests
    console.log('🧪 Running tests...');
    execSync('npm run test', { stdio: 'inherit' });
    
    // Build application
    console.log('🏗️  Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('✅ Build completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

/**
 * Deploy application
 */
function deployApplication(platform = 'VERCEL') {
  console.log(`🚀 Deploying to ${platform}...`);
  
  try {
    if (platform === 'VERCEL') {
      execSync('vercel --prod', { stdio: 'inherit' });
    } else if (platform === 'RENDER') {
      execSync('git push render main', { stdio: 'inherit' });
    } else {
      console.error(`❌ Unknown deployment platform: ${platform}`);
      return false;
    }
    
    console.log(`✅ Deployment to ${platform} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Deployment to ${platform} failed:`, error.message);
    return false;
  }
}

/**
 * Run health checks
 */
function runHealthChecks() {
  console.log('🏥 Running health checks...');
  
  const healthChecks = [
    { name: 'Frontend', url: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000' },
    { name: 'Backend', url: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000' }
  ];
  
  const results = [];
  
  healthChecks.forEach(check => {
    try {
      const response = fetch(`${check.url  }/health`);
      if (response.ok) {
        console.log(`✅ ${check.name} health check passed`);
        results.push({ name: check.name, status: 'healthy' });
      } else {
        console.error(`❌ ${check.name} health check failed`);
        results.push({ name: check.name, status: 'unhealthy' });
      }
    } catch (error) {
      console.error(`❌ ${check.name} health check failed:`, error.message);
      results.push({ name: check.name, status: 'error' });
    }
  });
  
  return results;
}

/**
 * Clean up build artifacts
 */
function cleanupBuildArtifacts() {
  console.log('🧹 Cleaning up build artifacts...');
  
  const artifactsToClean = [
    '.next',
    'node_modules/.cache',
    'coverage',
    'dist',
    'build'
  ];
  
  artifactsToClean.forEach(artifact => {
    const artifactPath = path.join(process.cwd(), artifact);
    if (fs.existsSync(artifactPath)) {
      try {
        fs.rmSync(artifactPath, { recursive: true, force: true });
        console.log(`✅ Cleaned up ${artifact}`);
      } catch (error) {
        console.warn(`⚠️  Could not clean up ${artifact}:`, error.message);
      }
    }
  });
  
  console.log('✅ Build artifacts cleanup completed!');
}

/**
 * Get deployment status
 */
function getDeploymentStatus(platform = 'VERCEL') {
  console.log(`📊 Getting ${platform} deployment status...`);
  
  try {
    if (platform === 'VERCEL') {
      const output = execSync('vercel ls', { encoding: 'utf8' });
      console.log(output);
    } else if (platform === 'RENDER') {
      console.log('Render deployment status check not implemented');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Could not get ${platform} deployment status:`, error.message);
    return false;
  }
}

/**
 * Rollback deployment
 */
function rollbackDeployment(platform = 'VERCEL', deploymentId = null) {
  console.log(`🔄 Rolling back ${platform} deployment...`);
  
  try {
    if (platform === 'VERCEL') {
      if (deploymentId) {
        execSync(`vercel rollback ${deploymentId}`, { stdio: 'inherit' });
      } else {
        execSync('vercel rollback', { stdio: 'inherit' });
      }
    } else if (platform === 'RENDER') {
      console.log('Render rollback not implemented');
    }
    
    console.log(`✅ ${platform} deployment rollback completed!`);
    return true;
  } catch (error) {
    console.error(`❌ ${platform} deployment rollback failed:`, error.message);
    return false;
  }
}

module.exports = {
  // Environment management
  generateSecureToken,
  generateScraperToken,
  createEnvFile,
  setupDeployment,
  
  // Validation
  validateEnvironment,
  validateFileStructure,
  checkHardcodedSecrets,
  validateDatabase,
  validateEmail,
  runValidation,
  
  // Build and deployment
  buildApplication,
  deployApplication,
  runHealthChecks,
  cleanupBuildArtifacts,
  getDeploymentStatus,
  rollbackDeployment,
  
  // Configuration
  ENV_TEMPLATES,
  REQUIRED_ENV_VARS,
  REQUIRED_FILES
};
