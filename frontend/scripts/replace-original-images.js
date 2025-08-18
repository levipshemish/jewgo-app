#!/usr/bin/env node

/**
 * Replace Original Images with Optimized Versions
 * Automatically replaces original images with their optimized WebP counterparts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  }

function logSection(_title) {
  log(`\n${'='.repeat(50)}`, 'bright');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(50)}`, 'bright');
}

function logSubsection(_title) {
  log(`\n${'-'.repeat(30)}`, 'blue');
  log(`  ${title}`, 'blue');
  log(`${'-'.repeat(30)}`, 'blue');
}

function getFileSize(_filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(_bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Mapping of original images to optimized versions
const imageReplacements = [
  {
    original: 'public/images/default-restaurant.jpg',
    optimized: 'optimized-images/default-restaurant.webp',
    target: 'public/images/default-restaurant.webp'
  },
  {
    original: 'public/icon.svg',
    optimized: 'optimized-images/icon.webp',
    target: 'public/icon.webp'
  },
  {
    original: 'public/favicon.svg',
    optimized: 'optimized-images/favicon.webp',
    target: 'public/favicon.webp'
  },
  {
    original: 'public/logo.svg',
    optimized: 'optimized-images/logo.webp',
    target: 'public/logo.webp'
  },
  {
    original: 'public/logo-dark.svg',
    optimized: 'optimized-images/logo-dark.webp',
    target: 'public/logo-dark.webp'
  }
];

function backupOriginalImage(_filePath) {
  const backupPath = filePath + '.backup';
  if (fs.existsSync(filePath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    log(`✅ Backed up: ${filePath}`, 'green');
    return true;
  }
  return false;
}

function replaceImage(_replacement) {
  const { original, optimized, target } = replacement;
  
  try {
    // Check if optimized version exists
    if (!fs.existsSync(optimized)) {
      log(`❌ Optimized image not found: ${optimized}`, 'red');
      return false;
    }

    // Backup original if it exists
    if (fs.existsSync(original)) {
      backupOriginalImage(original);
    }

    // Copy optimized version to target location
    fs.copyFileSync(optimized, target);
    
    const originalSize = fs.existsSync(original) ? getFileSize(original) : 0;
    const optimizedSize = getFileSize(target);
    const savings = originalSize - optimizedSize;
    const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;
    
    log(`✅ Replaced: ${original} → ${target}`, 'green');
    if (originalSize > 0) {
      log(`   Size: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${savingsPercent}% saved)`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ Error replacing ${original}: ${error.message}`, 'red');
    return false;
  }
}

function updateImageReferences() {
  logSubsection('Updating Image References');
  
  const filesToUpdate = [
    'components/ui/Logo.tsx',
    'components/restaurant/RestaurantCard.tsx',
    'components/restaurant/ImageCarousel.tsx'
  ];
  
  let updatedCount = 0;
  
  filesToUpdate.forEach(filePath => {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        log(`⚠️  File not found: ${filePath}`, 'yellow');
        return;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let fileUpdated = false;
      
      // Update image references
      const replacements = [
        { from: '/icon.svg', to: '/icon.webp' },
        { from: '/favicon.svg', to: '/favicon.webp' },
        { from: '/logo.svg', to: '/logo.webp' },
        { from: '/logo-dark.svg', to: '/logo-dark.webp' },
        { from: '/images/default-restaurant.jpg', to: '/images/default-restaurant.webp' }
      ];
      
      replacements.forEach(({ from, to }) => {
        if (content.includes(from)) {
          content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
          fileUpdated = true;
        }
      });
      
      if (fileUpdated) {
        fs.writeFileSync(fullPath, content);
        log(`✅ Updated: ${filePath}`, 'green');
        updatedCount++;
      }
    } catch (error) {
      log(`❌ Error updating ${filePath}: ${error.message}`, 'red');
    }
  });
  
  return updatedCount;
}

function createImageOptimizationReport() {
  logSubsection('Image Optimization Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    replacements: [],
    totalOriginalSize: 0,
    totalOptimizedSize: 0,
    totalSavings: 0
  };
  
  imageReplacements.forEach(replacement => {
    const { original, target } = replacement;
    
    const originalSize = fs.existsSync(original) ? getFileSize(original) : 0;
    const optimizedSize = fs.existsSync(target) ? getFileSize(target) : 0;
    const savings = originalSize - optimizedSize;
    
    report.replacements.push({
      original,
      target,
      originalSize,
      optimizedSize,
      savings,
      savingsPercent: originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0
    });
    
    report.totalOriginalSize += originalSize;
    report.totalOptimizedSize += optimizedSize;
    report.totalSavings += savings;
  });
  
  report.totalSavingsPercent = report.totalOriginalSize > 0 ? 
    ((report.totalSavings / report.totalOriginalSize) * 100).toFixed(1) : 0;
  
  // Save report
  const reportPath = './image-replacement-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Display summary
  log(`📊 Replacement Summary:`, 'blue');
  log(`  Total original size: ${formatBytes(report.totalOriginalSize)}`);
  log(`  Total optimized size: ${formatBytes(report.totalOptimizedSize)}`);
  log(`  Total savings: ${formatBytes(report.totalSavings)} (${report.totalSavingsPercent}%)`);
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'green');
  
  return report;
}

function main() {
  log('🔄 Image Replacement Tool', 'bright');
  log('Replacing original images with optimized WebP versions\n', 'blue');
  
  try {
    // Replace images
    logSection('Replacing Images');
    let successCount = 0;
    
    imageReplacements.forEach(replacement => {
      if (replaceImage(replacement)) {
        successCount++;
      }
    });
    
    log(`\n✅ Successfully replaced ${successCount}/${imageReplacements.length} images`, 'green');
    
    // Update references
    const updatedFiles = updateImageReferences();
    log(`\n✅ Updated ${updatedFiles} files with new image references`, 'green');
    
    // Generate report
    createImageOptimizationReport();
    
    log('\n🎉 Image replacement complete!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Test the application to ensure images load correctly');
    log('2. Run performance tests to verify improvements');
    log('3. Consider removing original image files to save space');
    log('4. Update any remaining hardcoded image references');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  replaceImage,
  updateImageReferences,
  createImageOptimizationReport
};
