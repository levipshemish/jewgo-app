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
  
  process.env.DATABASE_URL = 'postgresql://temp:temp@localhost:5432/temp'; // TEMP: Remove by 2025-12-31
  
  console.log('✅ Temporary DATABASE_URL set for Prisma generation');
}

// Check if Prisma schema exists
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Prisma schema not found at:', schemaPath);
  process.exit(1);
}

console.log('✅ Prisma schema found');
console.log('✅ Build environment check completed');

module.exports = {
  isBuildTime,
  hasDatabaseUrl,
  isVercel,
  isCI
};
