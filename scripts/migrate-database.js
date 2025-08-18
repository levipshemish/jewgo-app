#!/usr/bin/env node

/**
 * Database Migration Script
 * Adds migration tracking tables for NextAuth to Supabase migration
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Running database migration...\n');

try {
  // Change to frontend directory
  process.chdir(path.join(__dirname, '..', 'frontend'));
  
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🗄️  Running database migration...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Database migration completed successfully!');
  console.log('\n📋 Migration Summary:');
  console.log('  - Added supabaseId field to User model');
  console.log('  - Created MigrationLog model for tracking');
  console.log('  - Updated User relations');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
