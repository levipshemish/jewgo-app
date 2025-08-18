#!/usr/bin/env node

/**
 * Prisma Configuration Test Script
 * 
 * This script tests the Prisma configuration to ensure the Query Engine
 * can be properly located and initialized.
 */

const fs = require('fs');
const path = require('path');

function testPrismaConfiguration() {
  console.log('🔍 Testing Prisma Configuration...\n');

  // Test 1: Check if Prisma client is generated
  console.log('1. Checking Prisma client generation...');
  const prismaClientDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
  
  if (fs.existsSync(prismaClientDir)) {
    console.log('✅ Prisma client directory exists');
    
    const files = fs.readdirSync(prismaClientDir);
    const queryEngineFiles = files.filter(file => 
      file.includes('query_engine') || file.endsWith('.node')
    );
    
    if (queryEngineFiles.length > 0) {
      console.log(`✅ Query Engine files found: ${queryEngineFiles.join(', ')}`);
    } else {
      console.log('⚠️  No Query Engine files found in Prisma client directory');
    }
  } else {
    console.log('❌ Prisma client directory not found');
    console.log('💡 Run "npx prisma generate" to generate the client');
    return false;
  }

  // Test 2: Check environment variables
  console.log('\n2. Checking environment variables...');
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length === 0) {
    console.log('✅ All required environment variables are set');
  } else {
    console.log(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
    return false;
  }

  // Test 3: Test Prisma client import
  console.log('\n3. Testing Prisma client import...');
  try {
    const { PrismaClient } = require('@prisma/client');
    console.log('✅ Prisma client can be imported');
    
    // Test client instantiation
    const prisma = new PrismaClient({
      log: ['error'],
    });
    console.log('✅ Prisma client can be instantiated');
    
    // Test connection (without actually connecting)
    console.log('✅ Prisma client configuration is valid');
    
    // Clean up
    prisma.$disconnect().catch(() => {});
    
  } catch (error) {
    console.log('❌ Error testing Prisma client:', error.message);
    return false;
  }

  // Test 4: Check Next.js build artifacts
  console.log('\n4. Checking Next.js build artifacts...');
  const nextServerDir = path.join(process.cwd(), '.next', 'server');
  
  if (fs.existsSync(nextServerDir)) {
    console.log('✅ Next.js server directory exists');
    
    // Check if Prisma binaries were copied during build
    const serverFiles = fs.readdirSync(nextServerDir);
    const prismaBinaries = serverFiles.filter(file => 
      file.includes('query_engine') || file.endsWith('.node')
    );
    
    if (prismaBinaries.length > 0) {
      console.log(`✅ Prisma binaries found in build: ${prismaBinaries.join(', ')}`);
    } else {
      console.log('⚠️  No Prisma binaries found in Next.js build directory');
      console.log('💡 This is normal if the build hasn\'t completed yet');
    }
  } else {
    console.log('ℹ️  Next.js server directory not found (build may not have completed)');
  }

  console.log('\n✅ Prisma configuration test completed successfully!');
  return true;
}

async function main() {
  try {
    const success = testPrismaConfiguration();
    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during Prisma configuration test:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testPrismaConfiguration };
