#!/usr/bin/env node

/**
 * Build optimization script to reduce webpack serialization warnings
 * Run this script before building to optimize the build process
 */

const fs = require('fs');
const path = require('path');

/**
 * Clean webpack cache to force fresh builds
 */
function cleanWebpackCache() {
  const cacheDir = path.join(process.cwd(), '.next', 'cache');
  
  if (fs.existsSync(cacheDir)) {
    console.log('🧹 Cleaning webpack cache...');
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Webpack cache cleaned');
  } else {
    console.log('ℹ️  No webpack cache found to clean');
  }
}

/**
 * Optimize large data files by checking for potential serialization issues
 */
function checkLargeDataFiles() {
  console.log('🔍 Checking for large data files that might cause serialization issues...');
  
  const srcDir = path.join(process.cwd(), 'lib', 'api');
  const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.ts'));
  
  let totalSize = 0;
  const largeFiles = [];
  
  files.forEach(file => {
    const filePath = path.join(srcDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    
    if (sizeKB > 50) { // Files larger than 50KB
      largeFiles.push({ file, sizeKB });
    }
    totalSize += sizeKB;
  });
  
  if (largeFiles.length > 0) {
    console.log('⚠️  Found large files that might cause serialization issues:');
    largeFiles.forEach(({ file, sizeKB }) => {
      console.log(`   - ${file}: ${sizeKB}KB`);
    });
    console.log(`📊 Total API files size: ${totalSize}KB`);
  } else {
    console.log('✅ No large files detected');
  }
  
  return largeFiles;
}

/**
 * Generate optimization report
 */
function generateOptimizationReport() {
  console.log('\n📋 Webpack Optimization Report');
  console.log('==============================');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);
  
  // Check available memory
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
  };
  console.log(`Memory usage: ${memUsageMB.heapUsed}MB / ${memUsageMB.heapTotal}MB`);
  
  // Check environment
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CI: ${process.env.CI || 'false'}`);
  
  // Recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('1. Use dynamic imports for large data files');
  console.log('2. Consider code splitting for large components');
  console.log('3. Optimize images and assets');
  console.log('4. Use webpack bundle analyzer to identify large chunks');
}

/**
 * Main optimization function
 */
function optimizeBuild() {
  console.log('🚀 Starting build optimization...\n');
  
  try {
    // Clean webpack cache
    cleanWebpackCache();
    
    // Check for large data files
    const largeFiles = checkLargeDataFiles();
    
    // Generate report
    generateOptimizationReport();
    
    if (largeFiles.length > 0) {
      console.log('\n⚠️  Consider optimizing large files to reduce webpack serialization warnings');
    }
    
    console.log('\n✅ Build optimization complete!');
    console.log('💡 Run "npm run build" to start the optimized build process');
    
  } catch (error) {
    console.error('❌ Build optimization failed:', error.message);
    process.exit(1);
  }
}

// Run optimization if this script is executed directly
if (require.main === module) {
  optimizeBuild();
}

module.exports = {
  optimizeBuild,
  cleanWebpackCache,
  checkLargeDataFiles,
  generateOptimizationReport,
};
