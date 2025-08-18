#!/usr/bin/env node

/**
 * Post-Build Fix Script
 * 
 * This script runs after the build process to fix any issues with generated CSS files,
 * particularly the invalid unicode-range values in font CSS, and ensure Prisma Query Engine
 * binaries are properly copied to the deployment directory.
 */

const { fixCssFile } = require('./fix-font-css');
const fs = require('fs');
const path = require('path');

function copyPrismaBinaries() {
  console.log('🔧 Copying Prisma Query Engine binaries...');
  
  const prismaClientDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
  const nextServerDir = path.join(process.cwd(), '.next', 'server');
  
  if (!fs.existsSync(prismaClientDir)) {
    console.log('⚠️  Prisma client directory not found, skipping binary copy');
    return false;
  }
  
  if (!fs.existsSync(nextServerDir)) {
    console.log('⚠️  Next.js server directory not found, skipping binary copy');
    return false;
  }
  
  try {
    const files = fs.readdirSync(prismaClientDir);
    let copiedCount = 0;
    
    files.forEach(file => {
      if (file.endsWith('.node') || file.includes('query_engine')) {
        const sourcePath = path.join(prismaClientDir, file);
        const destPath = path.join(nextServerDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          copiedCount++;
          console.log(`📦 Copied: ${file}`);
        }
      }
    });
    
    if (copiedCount > 0) {
      console.log(`✅ Prisma binaries copied: ${copiedCount} file(s)`);
      return true;
    } else {
      console.log('ℹ️  No Prisma binaries found to copy');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error copying Prisma binaries:', error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Running post-build fixes...');
  
  // Copy Prisma Query Engine binaries
  copyPrismaBinaries();
  
  // Fix CSS files - Next.js 15 might have different structure
  const cssDir = path.join(process.cwd(), '.next', 'static', 'css');
  const alternativeCssDir = path.join(process.cwd(), '.next', 'css');
  
  let cssDirectory = null;
  if (fs.existsSync(cssDir)) {
    cssDirectory = cssDir;
  } else if (fs.existsSync(alternativeCssDir)) {
    cssDirectory = alternativeCssDir;
  }
  
  if (!cssDirectory) {
    console.log('ℹ️  No CSS directory found, skipping CSS fixes.');
    return;
  }
  
  try {
    const files = fs.readdirSync(cssDirectory);
    let fixedCount = 0;
    
    files.forEach(file => {
      if (file.endsWith('.css')) {
        const filePath = path.join(cssDirectory, file);
        const wasFixed = fixCssFile(filePath);
        if (wasFixed) {
          fixedCount++;
        }
      }
    });
    
    if (fixedCount > 0) {
      console.log(`✅ CSS fixes completed: ${fixedCount} file(s) fixed`);
    } else {
      console.log('ℹ️  No CSS fixes needed in post-build step');
    }
    
  } catch (error) {
    console.error('❌ Error during CSS fixes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
