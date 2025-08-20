#!/usr/bin/env node

/**
 * Build-time environment validation script
 * This script validates only the basic requirements needed for building
 * Full validation happens at runtime
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running build-time environment validation...');

// Check if we're in a Docker build context
const isDockerBuild = process.env.DOCKER === 'true' || process.env.CI === 'true';

if (isDockerBuild) {
    console.log('✅ Docker build detected - skipping build-time validation');
    console.log('📝 Full environment validation will happen at runtime');
    process.exit(0);
}

// For non-Docker builds, do basic validation
const requiredVars = [
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_BACKEND_URL'
];

const missing = [];

for (const varName of requiredVars) {
    if (!process.env[varName]) {
        missing.push(varName);
    }
}

if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('');
    console.error('💡 Please set these variables in your environment or .env.local file');
    process.exit(1);
}

console.log('✅ Build-time environment validation passed');
console.log('📝 Runtime validation will check additional variables');
