#!/usr/bin/env node

/**
 * Image Optimization Script
 * 
 * This script analyzes and optimizes images in the project for better performance.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { 
  log, 
  logSection, 
  logSubsection, 
  getFileSize, 
  formatBytes, 
  findFiles 
} = require('./utils/scriptUtils');

function analyzeImages() {
  logSection('Image Analysis');
  
  const publicDir = path.join(process.cwd(), 'public');
  const srcDir = path.join(process.cwd(), 'src');
  const appDir = path.join(process.cwd(), 'app');
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  let allImages = [];
  
  // Find images in public directory
  if (fs.existsSync(publicDir)) {
    const publicImages = findFiles(publicDir, imageExtensions);
    allImages = allImages.concat(publicImages);
  }
  
  // Find images in src directory
  if (fs.existsSync(srcDir)) {
    const srcImages = findFiles(srcDir, imageExtensions);
    allImages = allImages.concat(srcImages);
  }
  
  // Find images in app directory
  if (fs.existsSync(appDir)) {
    const appImages = findFiles(appDir, imageExtensions);
    allImages = allImages.concat(appImages);
  }
  
  if (allImages.length === 0) {
    log('No images found in the project.', 'yellow');
    return [];
  }
  
  // Group images by extension
  const imagesByType = {};
  allImages.forEach(img => {
    if (!imagesByType[img.extension]) {
      imagesByType[img.extension] = [];
    }
    imagesByType[img.extension].push(img);
  });
  
  // Display analysis
  logSubsection('Image Statistics');
  log(`Total images found: ${allImages.length}`, 'blue');
  
  Object.entries(imagesByType).forEach(([ext, images]) => {
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    const avgSize = totalSize / images.length;
    
    log(`\n${ext.toUpperCase()} files:`, 'cyan');
    log(`  Count: ${images.length}`);
    log(`  Total size: ${formatBytes(totalSize)}`);
    log(`  Average size: ${formatBytes(avgSize)}`);
    
    // Show largest files
    const largest = images.sort((a, b) => b.size - a.size).slice(0, 3);
    log(`  Largest files:`);
    largest.forEach(img => {
      const status = img.size > 500 * 1024 ? '⚠️' : '✅';
      log(`    ${status} ${img.name}: ${formatBytes(img.size)}`, img.size > 500 * 1024 ? 'yellow' : 'green');
    });
  });
  
  return allImages;
}

function generateOptimizationRecommendations(_images) {
  logSubsection('Optimization Recommendations');
  
  const recommendations = [];
  
  // Check for large images
  const largeImages = images.filter(img => img.size > 500 * 1024);
  if (largeImages.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${largeImages.length} images are larger than 500KB`,
      details: largeImages.map(img => `${img.name} (${formatBytes(img.size)})`)
    });
  }
  
  // Check for PNG files that could be WebP
  const pngImages = images.filter(img => img.extension === '.png');
  if (pngImages.length > 0) {
    recommendations.push({
      type: 'info',
      message: `${pngImages.length} PNG images could be converted to WebP for better compression`,
      details: pngImages.map(img => img.name)
    });
  }
  
  // Check for JPEG files that could be WebP
  const jpegImages = images.filter(img => ['.jpg', '.jpeg'].includes(img.extension));
  if (jpegImages.length > 0) {
    recommendations.push({
      type: 'info',
      message: `${jpegImages.length} JPEG images could be converted to WebP for better compression`,
      details: jpegImages.map(img => img.name)
    });
  }
  
  // Display recommendations
  recommendations.forEach(rec => {
    const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
    const color = rec.type === 'warning' ? 'yellow' : 'blue';
    
    log(`\n${icon} ${rec.message}`, color);
    if (rec.details && rec.details.length > 0) {
      rec.details.forEach(detail => {
        log(`  • ${detail}`);
      });
    }
  });
  
  return recommendations;
}

function checkImageOptimizationTools() {
  logSubsection('Image Optimization Tools');
  
  const tools = [
    { name: 'imagemin', command: 'npx imagemin --version', install: 'npm install -g imagemin-cli' },
    { name: 'sharp', command: 'npx sharp --version', install: 'npm install sharp' },
    { name: 'squoosh', command: 'npx @squoosh/cli --version', install: 'npm install -g @squoosh/cli' }
  ];
  
  const availableTools = [];
  
  tools.forEach(tool => {
    try {
      execSync(tool.command, { stdio: 'ignore' });
      log(`✅ ${tool.name} is available`, 'green');
      availableTools.push(tool.name);
    } catch (error) {
      log(`❌ ${tool.name} is not available`, 'red');
      log(`   Install with: ${tool.install}`, 'blue');
    }
  });
  
  return availableTools;
}

function optimizeImages(images, tools) {
  logSubsection('Image Optimization');
  
  if (images.length === 0) {
    log('No images to optimize.', 'yellow');
    return;
  }
  
  if (tools.length === 0) {
    log('No optimization tools available. Install tools first.', 'red');
    return;
  }
  
  // Create optimized directory
  const optimizedDir = path.join(process.cwd(), 'optimized-images');
  if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir);
  }
  
  log(`Optimizing ${images.length} images...`, 'blue');
  
  let optimizedCount = 0;
  let totalSaved = 0;
  
  images.forEach(img => {
    try {
      const outputPath = path.join(optimizedDir, img.name);
      const originalSize = img.size;
      
      // Use sharp for optimization (if available)
      if (tools.includes('sharp')) {
        execSync(`npx sharp "${img.path}" --output "${outputPath}" --quality 80`, { stdio: 'ignore' });
      } else if (tools.includes('imagemin')) {
        execSync(`npx imagemin "${img.path}" --out-dir="${optimizedDir}"`, { stdio: 'ignore' });
      }
      
      if (fs.existsSync(outputPath)) {
        const optimizedSize = getFileSize(outputPath);
        const saved = originalSize - optimizedSize;
        const savingsPercent = ((saved / originalSize) * 100).toFixed(1);
        
        if (saved > 0) {
          log(`✅ ${img.name}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${savingsPercent}% saved)`, 'green');
          optimizedCount++;
          totalSaved += saved;
        } else {
          log(`⚠️  ${img.name}: No optimization possible`, 'yellow');
        }
      }
    } catch (error) {
      log(`❌ Failed to optimize ${img.name}: ${error.message}`, 'red');
    }
  });
  
  log(`\n📊 Optimization complete:`, 'blue');
  log(`  Images optimized: ${optimizedCount}/${images.length}`);
  log(`  Total space saved: ${formatBytes(totalSaved)}`);
  
  if (optimizedCount > 0) {
    log(`\nOptimized images saved to: ${optimizedDir}`, 'green');
    log('Review the optimized images and replace originals if satisfied.', 'blue');
  }
}

function generateImageReport(images, recommendations) {
  const report = {
    timestamp: new Date().toISOString(),
    totalImages: images.length,
    totalSize: images.reduce((sum, img) => sum + img.size, 0),
    imagesByType: {},
    recommendations: recommendations,
    optimization: {
      largeImages: images.filter(img => img.size > 500 * 1024).length,
      pngImages: images.filter(img => img.extension === '.png').length,
      jpegImages: images.filter(img => ['.jpg', '.jpeg'].includes(img.extension)).length
    }
  };
  
  // Group by type
  images.forEach(img => {
    if (!report.imagesByType[img.extension]) {
      report.imagesByType[img.extension] = {
        count: 0,
        totalSize: 0,
        files: []
      };
    }
    report.imagesByType[img.extension].count++;
    report.imagesByType[img.extension].totalSize += img.size;
    report.imagesByType[img.extension].files.push({
      name: img.name,
      size: img.size,
      path: img.path
    });
  });
  
  // Save report
  fs.writeFileSync('./image-optimization-report.json', JSON.stringify(report, null, 2));
  log('\n📄 Image optimization report saved to: image-optimization-report.json', 'green');
}

function main() {
  log('🖼️  Starting Image Optimization Analysis...', 'bold');
  
  try {
    const images = analyzeImages();
    const recommendations = generateOptimizationRecommendations(images);
    const tools = checkImageOptimizationTools();
    
    if (images.length > 0) {
      optimizeImages(images, tools);
    }
    
    generateImageReport(images, recommendations);
    
    log('\n✅ Image optimization analysis complete!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Review the optimization recommendations');
    log('2. Install image optimization tools if needed');
    log('3. Convert large images to WebP format');
    log('4. Use Next.js Image component for automatic optimization');
    log('5. Implement lazy loading for images');
    log('6. Consider using a CDN for image delivery');
    
  } catch (error) {
    log(`❌ Error during analysis: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  analyzeImages,
  generateOptimizationRecommendations,
  checkImageOptimizationTools,
  optimizeImages,
  generateImageReport
}; 