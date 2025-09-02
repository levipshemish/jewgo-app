#!/usr/bin/env node

/**
 * Build Environment Check Script
 * 
 * This script checks environment variables during build time and handles
 * database connection issues gracefully. It's designed to prevent build
 * failures when DATABASE_URL is not available during CI/CD builds.
 */

const fs = require('fs');
const path = require('path');

// Environment detection
const isVercel = process.env.VERCEL === '1';
const isCI = process.env.CI === 'true';
const isBuildTime = process.env.NODE_ENV === 'production' && (isVercel || isCI);

// Check if DATABASE_URL is available
const hasDatabaseUrl = !!process.env.DATABASE_URL;

console.log('🔍 Build Environment Check');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Is Vercel: ${isVercel}`);
console.log(`Is CI: ${isCI}`);
console.log(`Is Build Time: ${isBuildTime}`);
console.log(`Has DATABASE_URL: ${hasDatabaseUrl}`);

// If we're in build time and don't have DATABASE_URL, create a temporary one
if (isBuildTime && !hasDatabaseUrl) {
  console.log('⚠️  Build time detected without DATABASE_URL - using temporary connection');
  
  // Use a more realistic temporary connection string for Prisma generation
  process.env.DATABASE_URL = 'postgresql://temp:temp@localhost:5432/temp?schema=public';
  
  console.log('✅ Temporary DATABASE_URL set for Prisma generation');
  console.log('ℹ️  Note: Database connection will be skipped during build time');
}

// Check if Prisma schema exists
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Prisma schema not found at:', schemaPath);
  process.exit(1);
}

console.log('✅ Prisma schema found');

// Set environment variable to indicate build time for Prisma client
if (isBuildTime) {
  process.env.SKIP_DB_ACCESS = 'true';
  console.log('✅ SKIP_DB_ACCESS set for build time');
}

// Ensure proper build environment for Vercel
if (isVercel) {
  // Set environment variables that might be needed for Vercel builds
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  process.env.NODE_ENV = 'production';
  console.log('✅ Vercel-specific environment variables set');
}

console.log('✅ Build environment check completed');

module.exports = {
  isBuildTime,
  hasDatabaseUrl,
  isVercel,
  isCI
};
