#!/usr/bin/env node

/**
 * check-environment
 * Environment Variables Check Script
 * 
 * This script provides environment variables check script for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category setup
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node check-environment.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node check-environment.js --verbose --config=production
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


// Required environment variables
const requiredEnvVars = {
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': 'Google Maps API key for maps and places functionality',
  'NEXT_PUBLIC_BACKEND_URL': 'Backend API URL (optional, has default)',
  'NEXTAUTH_URL': 'NextAuth URL (optional, has default)',
  'NEXTAUTH_SECRET': 'NextAuth secret (optional, has default)',
};

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = wrapSyncWithErrorHandling(() => fs.existsSync)(envPath);

if (!envExists) {
  defaultLogger.info('❌ .env.local file not found');
  defaultLogger.info('Please create a .env.local file with the following variables:');
} else {
  // Load and parse .env.local
  const envContent = wrapSyncWithErrorHandling(() => fs.readFileSync)(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  let allGood = true;
  
  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    const value = envVars[key];
    const hasValue = value && value !== '';
    
    if (hasValue) {
      defaultLogger.info(`✅ ${key}: ${description}`);
    } else {
      defaultLogger.info(`❌ ${key}: ${description} - NOT SET`);
      allGood = false;
    }
  });
  
  if (allGood) {
    defaultLogger.info('\n🎉 All required environment variables are configured!');
    wrapSyncWithErrorHandling(() => process.exit)(0);
  } else {
    defaultLogger.info('\n⚠️  Some required environment variables are missing.');
  }
}

Object.entries(requiredEnvVars).forEach(([key, description]) => {
  defaultLogger.info(`${key}=your_${key.toLowerCase().replace(/next_public_/g, '').replace(/_/g, '_')}_here`);
});
wrapSyncWithErrorHandling(() => process.exit)(1); 