#!/usr/bin/env node

/**
 * Vercel Build Fix Script
 * 
 * This script helps fix common Vercel build issues, particularly
 * the routes-manifest.json missing error that can occur with Next.js 15.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Vercel Build Fix Script');

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';
const isCI = process.env.CI === 'true';

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Is Vercel: ${isVercel}`);
console.log(`Is CI: ${isCI}`);

// Ensure proper environment variables for Vercel builds
if (isVercel) {
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  process.env.NODE_ENV = 'production';
  console.log('✅ Vercel environment variables set');
}

// Check if .next directory exists and has required files
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('✅ .next directory found');
  
  // Check for routes-manifest.json
  const routesManifestPath = path.join(nextDir, 'routes-manifest.json');
  if (fs.existsSync(routesManifestPath)) {
    console.log('✅ routes-manifest.json found');
    
    // Verify the file is valid JSON
    try {
      const manifest = JSON.parse(fs.readFileSync(routesManifestPath, 'utf8'));
      console.log(`✅ routes-manifest.json is valid JSON with ${Object.keys(manifest).length} keys`);
    } catch (error) {
      console.error('❌ routes-manifest.json is not valid JSON:', error.message);
    }
  } else {
    console.log('⚠️  routes-manifest.json not found');
  }
  
  // List all files in .next directory
  const files = fs.readdirSync(nextDir);
  console.log(`📁 .next directory contains ${files.length} files:`);
  files.forEach(file => {
    const filePath = path.join(nextDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      console.log(`  📄 ${file}`);
    } else {
      console.log(`  📁 ${file}/`);
    }
  });
} else {
  console.log('⚠️  .next directory not found - this is expected before build');
}

// Check if we're in the right directory for the build
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`✅ Package.json found: ${packageJson.name} v${packageJson.version}`);
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message);
  }
} else {
  console.log('⚠️  package.json not found in current directory');
}

console.log('✅ Vercel build fix script completed');

module.exports = {
  isVercel,
  isCI
};
