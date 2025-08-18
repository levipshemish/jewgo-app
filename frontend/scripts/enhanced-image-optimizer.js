#!/usr/bin/env node

/**
 * Enhanced Image Optimization Script
 * Uses Sharp and Squoosh for modern image optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

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

function findImageFiles(dir, extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']) {
  const images = [];
  
  function scanDirectory(_currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, .next, and other build directories
          if (!['node_modules', '.next', 'out', 'dist', 'build', '.git'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            images.push({
              name: item,
              path: fullPath,
              size: stat.size,
              extension: ext,
              relativePath: path.relative(process.cwd(), fullPath)
            });
          }
        }
      }
    } catch (error) {
      log(`Error scanning directory ${currentDir}: ${error.message}`, 'red');
    }
  }
  
  scanDirectory(dir);
  return images;
}

async function optimizeWithSharp(imagePath, outputPath, options = {}) {
  const {
    quality = 80,
    format = 'webp',
    width,
    height,
    fit = 'inside'
  } = options;

  try {
    let sharpInstance = sharp(imagePath);
    
    // Resize if dimensions provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, { fit });
    }
    
    // Convert to specified format
    switch (format) {
      case 'webp':
        await sharpInstance.webp({ quality }).toFile(outputPath);
        break;
      case 'avif':
        await sharpInstance.avif({ quality }).toFile(outputPath);
        break;
      case 'jpeg':
        await sharpInstance.jpeg({ quality }).toFile(outputPath);
        break;
      case 'png':
        await sharpInstance.png({ quality }).toFile(outputPath);
        break;
      default:
        await sharpInstance.webp({ quality }).toFile(outputPath);
    }
    
    return true;
  } catch (error) {
    log(`Sharp optimization failed for ${imagePath}: ${error.message}`, 'red');
    return false;
  }
}

async function optimizeWithSquoosh(inputPath, outputPath, options = {}) {
  const {
    quality = 80,
    format = 'webp'
  } = options;

  try {
    const command = `npx @squoosh/cli --webp quality=${quality} "${inputPath}" -d "${path.dirname(outputPath)}"`;
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (error) {
    log(`Squoosh optimization failed for ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

async function analyzeImages(_images) {
  logSubsection('Image Analysis');
  
  const analysis = {
    totalImages: images.length,
    totalSize: 0,
    byExtension: {},
    largeImages: [],
    recommendations: []
  };
  
  images.forEach(img => {
    analysis.totalSize += img.size;
    
    // Group by extension
    if (!analysis.byExtension[img.extension]) {
      analysis.byExtension[img.extension] = [];
    }
    analysis.byExtension[img.extension].push(img);
    
    // Identify large images (> 500KB)
    if (img.size > 500 * 1024) {
      analysis.largeImages.push(img);
    }
  });
  
  // Generate recommendations
  if (analysis.largeImages.length > 0) {
    analysis.recommendations.push(`${analysis.largeImages.length} images are larger than 500KB and should be optimized`);
  }
  
  const pngImages = analysis.byExtension['.png'] || [];
  if (pngImages.length > 0) {
    analysis.recommendations.push(`${pngImages.length} PNG images could be converted to WebP for better compression`);
  }
  
  const jpegImages = analysis.byExtension['.jpg'] || [];
  const jpegImages2 = analysis.byExtension['.jpeg'] || [];
  if (jpegImages.length + jpegImages2.length > 0) {
    analysis.recommendations.push(`${jpegImages.length + jpegImages2.length} JPEG images could be converted to WebP for better compression`);
  }
  
  return analysis;
}

async function optimizeImages(images, analysis) {
  logSubsection('Image Optimization');
  
  if (images.length === 0) {
    log('No images to optimize.', 'yellow');
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
  // const results = [];
  for (const img of images) {
    try {
      const outputName = path.basename(img.name, img.extension) + '.webp';
      const outputPath = path.join(optimizedDir, outputName);
      const originalSize = img.size;
      
      let success = false;
      
      // Try Sharp first, then Squoosh as fallback
      success = await optimizeWithSharp(img.path, outputPath, {
        quality: 80,
        format: 'webp'
      });
      
      if (!success) {
        success = await optimizeWithSquoosh(img.path, outputPath, {
          quality: 80,
          format: 'webp'
        });
      }
      
      if (success && fs.existsSync(outputPath)) {
        const optimizedSize = getFileSize(outputPath);
        const saved = originalSize - optimizedSize;
        const savingsPercent = ((saved / originalSize) * 100).toFixed(1);
        
        if (saved > 0) {
          log(`✅ ${img.name}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${savingsPercent}% saved)`, 'green');
          optimizedCount++;
          totalSaved += saved;
          
          results.push({
            original: img,
            optimized: {
              path: outputPath,
              size: optimizedSize,
              savings: saved,
              savingsPercent
            }
          });
        } else {
          log(`⚠️  ${img.name}: No optimization possible`, 'yellow');
        }
      } else {
        log(`❌ Failed to optimize ${img.name}`, 'red');
      }
    } catch (error) {
      log(`❌ Error optimizing ${img.name}: ${error.message}`, 'red');
    }
  }
  
  log(`\n📊 Optimization complete:`, 'blue');
  log(`  Images optimized: ${optimizedCount}/${images.length}`);
  log(`  Total space saved: ${formatBytes(totalSaved)}`);
  
  if (optimizedCount > 0) {
    log(`\nOptimized images saved to: ${optimizedDir}`, 'green');
    log('Review the optimized images and replace originals if satisfied.', 'blue');
  }
  
  return results;
}

function generateReport(analysis, results) {
  // const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalImages: analysis.totalImages,
      totalOriginalSize: formatBytes(analysis.totalSize),
      optimizedCount: results.length,
      totalSaved: formatBytes(results.reduce((sum, r) => sum + r.optimized.savings, 0))
    },
    analysis,
    results,
    recommendations: analysis.recommendations
  };
  const reportPath = './image-optimization-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'green');
  
  return report;
}

async function main() {
  log('🖼️  Enhanced Image Optimization Tool', 'bright');
  log('Using Sharp and Squoosh for modern image optimization\n', 'blue');
  
  try {
    // Find all images
    logSection('Scanning for Images');
    const images = findImageFiles(process.cwd());
    log(`Found ${images.length} images`, 'green');
    
    if (images.length === 0) {
      log('No images found to optimize.', 'yellow');
      return;
    }
    
    // Analyze images
    const analysis = await analyzeImages(images);
    
    log(`\n📊 Analysis Summary:`, 'blue');
    log(`  Total images: ${analysis.totalImages}`);
    log(`  Total size: ${formatBytes(analysis.totalSize)}`);
    log(`  Large images (>500KB): ${analysis.largeImages.length}`);
    
    if (analysis.recommendations.length > 0) {
      log(`\n💡 Recommendations:`, 'yellow');
      analysis.recommendations.forEach(rec => log(`  • ${rec}`, 'yellow'));
    }
    
    // Optimize images
    // const results = await optimizeImages(images, analysis);
    // Generate report
    generateReport(analysis, results);
    
    log('\n✅ Enhanced image optimization complete!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Review optimized images in the optimized-images/ directory');
    log('2. Replace original images with optimized versions if satisfied');
    log('3. Use Next.js Image component for automatic optimization in your app');
    log('4. Consider implementing lazy loading for better performance');
    
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
  findImageFiles,
  analyzeImages,
  optimizeImages,
  optimizeWithSharp,
  optimizeWithSquoosh
};
