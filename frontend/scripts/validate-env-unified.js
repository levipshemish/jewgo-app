#!/usr/bin/env node

/**
 * validate-env-unified
 * Unified Environment Validation Script
 * 
 * This script provides unified environment validation script for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category validation
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage *   node validate-env-unified.js [options]
 * 
 * Options:
 *   --build-only     Only validate build-time requirements
 *   --redis-only     Only validate Redis configuration
 *   --supabase-only  Only validate Supabase configuration
 *   --verbose        Show detailed validation information
 *   --strict         Exit on any validation failure (including warnings)
 */
 * @options *   --build-only     Only validate build-time requirements
 *   --redis-only     Only validate Redis configuration
 *   --supabase-only  Only validate Supabase configuration
 *   --verbose        Show detailed validation information
 *   --strict         Exit on any validation failure (including warnings)
 */
 * 
 * @example
 * node validate-env-unified.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
 */
const fs = require('fs');
const { defaultLogger } = require('./utils/logger');

const { defaultErrorHandler } = require('./utils/errorHandler');

const path = require('path');
/**
 * Wrap function with error handling
 */
function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}


// Configuration
const CONFIG = {
  // Required for all environments
  REQUIRED_VARS: [
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_BACKEND_URL',
  ],
  
  // Required for build-time only
  BUILD_REQUIRED_VARS: [
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_BACKEND_URL'
  ],
  
  // Optional variables (warnings only)
  OPTIONAL_VARS: [
    'NEXT_PUBLIC_GA_MEASUREMENT_ID',
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_DB',
  ],
  
  // Redis-specific variables
  REDIS_VARS: [
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_DB',
  ],
  
  // Supabase-specific variables
  SUPABASE_VARS: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  buildOnly: args.includes('--build-only'),
  redisOnly: args.includes('--redis-only'),
  supabaseOnly: args.includes('--supabase-only'),
  verbose: args.includes('--verbose'),
  strict: args.includes('--strict')
};

// Load .env.local if present to assist local checks (non-fatal if missing)
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  const fileVars = {};
  
  if (wrapSyncWithErrorHandling(() => fs.existsSync)(envPath)) {
    try {
      const envContent = wrapSyncWithErrorHandling(() => fs.readFileSync)(envPath, 'utf8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          fileVars[key] = value;
        }
      });
    } catch (e) {
      defaultLogger.warn('⚠️  Warning: failed to read .env.local:', e.message);
    }
  }
  
  return fileVars;
}

// Read environment variable with fallback to .env.local
function readEnv(key) {
  return process.env[key] ?? loadEnvFile()[key] ?? '';
}

// Check if we're in a Docker build context
function isDockerBuild() {
  return process.env.DOCKER === 'true' || process.env.CI === 'true';
}

// Validate Supabase URL format
function isValidSupabaseUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

// Check if Redis configuration is valid
function isValidRedisConfig() {
  const redisUrl = readEnv('REDIS_URL');
  const redisHost = readEnv('REDIS_HOST');
  return !!(redisUrl || redisHost);
}

// Display validation results
function displayValidationResults(results, title) {
  defaultLogger.info(`\n📋 ${title}:`);
  defaultLogger.info('='.repeat(title.length + 3));
  
  if (results.missing.length === 0 && results.invalid.length === 0) {
    defaultLogger.info('✅ All variables are valid');
    return true;
  }
  
  if (results.missing.length > 0) {
    defaultLogger.info('❌ Missing required variables:');
    results.missing.forEach(key => defaultLogger.info(`   - ${key}`));
  }
  
  if (results.invalid.length > 0) {
    defaultLogger.info('⚠️  Invalid variables:');
    results.invalid.forEach(item => defaultLogger.info(`   - ${item.key}: ${item.reason}`));
  }
  
  return false;
}

// Validate general environment variables
function validateGeneralEnv() {
  defaultLogger.info('🔍 Validating general environment variables...');
  
  const missing = [];
  const invalid = [];
  
  for (const key of CONFIG.REQUIRED_VARS) {
    const value = readEnv(key);
    if (!value || String(value).trim() === '') {
      missing.push(key);
    }
  }
  
  // Check optional variables
  const missingOptional = CONFIG.OPTIONAL_VARS.filter(key => {
    const value = readEnv(key);
    return !value || String(value).trim() === '';
  });
  
  if (options.verbose && missingOptional.length > 0) {
    defaultLogger.info('\n📝 Optional variables not set:');
    missingOptional.forEach(key => defaultLogger.info(`   - ${key}`));
  }
  
  return { missing, invalid };
}

// Validate build-time environment variables
function validateBuildEnv() {
  defaultLogger.info('🔍 Validating build-time environment variables...');
  
  // Check if we're in a Docker build context
  if (isDockerBuild()) {
    defaultLogger.info('✅ Docker build detected - skipping build-time validation');
    defaultLogger.info('📝 Full environment validation will happen at runtime');
    return { missing: [], invalid: [] };
  }
  
  const missing = [];
  const invalid = [];
  
  for (const key of CONFIG.BUILD_REQUIRED_VARS) {
    const value = readEnv(key);
    if (!value || String(value).trim() === '') {
      missing.push(key);
    }
  }
  
  return { missing, invalid };
}

// Validate Redis environment variables
function validateRedisEnv() {
  defaultLogger.info('🔍 Validating Redis environment variables...');
  
  const missing = [];
  const invalid = [];
  
  // Check if Redis configuration is valid
  if (!isValidRedisConfig()) {
    defaultLogger.warn('\n⚠️  Redis configuration is not set');
    defaultLogger.warn('Rate limiting will be disabled. This is not recommended for production.');
    
    if (options.verbose) {
      defaultLogger.warn('\n🔧 TO ENABLE RATE LIMITING:');
      defaultLogger.warn('1. Go to your Vercel dashboard');
      defaultLogger.warn('2. Go to Settings > Environment Variables');
      defaultLogger.warn('3. Add either REDIS_URL or REDIS_HOST configuration');
      defaultLogger.warn('4. Redeploy your project');
      defaultLogger.warn('\n📚 CONFIGURATION OPTIONS:');
      defaultLogger.warn('Option 1: Use REDIS_URL (recommended)');
      defaultLogger.warn('  REDIS_URL=redis://username:password@host:port/database');
      defaultLogger.warn('\nOption 2: Use individual variables');
      defaultLogger.warn('  REDIS_HOST=your-redis-host');
      defaultLogger.warn('  REDIS_PORT=6379');
      defaultLogger.warn('  REDIS_PASSWORD=your-redis-password');
      defaultLogger.warn('  REDIS_DB=0');
    }
    
    if (options.strict) {
      missing.push('REDIS_URL or REDIS_HOST');
    }
  } else {
    const redisUrl = readEnv('REDIS_URL');
    if (redisUrl) {
      defaultLogger.info(`✅ Redis URL configured: ${redisUrl}`);
    } else {
      const redisHost = readEnv('REDIS_HOST');
      const redisPort = readEnv('REDIS_PORT') || '6379';
      const redisDb = readEnv('REDIS_DB') || '0';
      defaultLogger.info(`✅ Redis configured: ${redisHost}:${redisPort} (DB: ${redisDb})`);
    }
  }
  
  return { missing, invalid };
}

// Validate Supabase environment variables
function validateSupabaseEnv() {
  defaultLogger.info('🔍 Validating Supabase environment variables...');
  
  const missing = [];
  const invalid = [];
  
  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  } else if (!isValidSupabaseUrl(supabaseUrl)) {
    invalid.push({
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      reason: 'Invalid format - should be https://your-project-id.supabase.co'
    });
  }
  
  if (!supabaseAnonKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  if (options.verbose && supabaseUrl && supabaseAnonKey) {
    defaultLogger.info(`✅ Supabase URL: ${supabaseUrl}`);
    defaultLogger.info(`✅ Supabase Key: ${supabaseAnonKey.substring(0, 20)}...`);
  }
  
  return { missing, invalid };
}

// Main validation function
function main() {
  defaultLogger.info('🔐 Unified Environment Validation');
  defaultLogger.info('==================================');
  
  let allValid = true;
  let exitCode = 0;
  
  try {
    // Determine what to validate based on options
    if (options.buildOnly) {
      const results = validateBuildEnv();
      allValid = displayValidationResults(results, 'Build-time Environment Variables');
      if (!allValid) exitCode = 1;
    } else if (options.redisOnly) {
      const results = validateRedisEnv();
      allValid = displayValidationResults(results, 'Redis Environment Variables');
      if (!allValid && options.strict) exitCode = 1;
    } else if (options.supabaseOnly) {
      const results = validateSupabaseEnv();
      allValid = displayValidationResults(results, 'Supabase Environment Variables');
      if (!allValid) exitCode = 1;
    } else {
      // Full validation
      const generalResults = validateGeneralEnv();
      const buildResults = validateBuildEnv();
      const redisResults = validateRedisEnv();
      const supabaseResults = validateSupabaseEnv();
      
      const generalValid = displayValidationResults(generalResults, 'General Environment Variables');
      const buildValid = displayValidationResults(buildResults, 'Build-time Environment Variables');
      const redisValid = displayValidationResults(redisResults, 'Redis Environment Variables');
      const supabaseValid = displayValidationResults(supabaseResults, 'Supabase Environment Variables');
      
      allValid = generalValid && buildValid && (redisValid || !options.strict) && supabaseValid;
      
      if (!allValid) {
        exitCode = 1;
        defaultLogger.info('\n❌ Environment validation failed');
      } else {
        defaultLogger.info('\n✅ All environment validations passed!');
      }
    }
    
  } catch (error) {
    defaultLogger.error('\n💥 Validation error:', error.message);
    exitCode = 1;
  }
  
  wrapSyncWithErrorHandling(() => process.exit)(exitCode);
}

// Run validation
main();
