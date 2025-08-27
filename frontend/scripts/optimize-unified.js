#!/usr/bin/env node

/**
 * Unified Optimization Orchestrator
 * =================================
 * 
 * This script consolidates all optimization functionality from:
 * - optimize-build.js (build optimization)
 * - optimize-bundles.js (bundle analysis)
 * - optimize-images.js (image optimization)
 * - optimize-css.js (CSS optimization)
 * - performance-optimization.js (performance analysis)
 * - webpack-optimization.js (webpack optimization)
 * - enhanced-image-optimizer.js (advanced image optimization)
 * 
 * Usage:
 *   node optimize-unified.js [command] [options]
 * 
 * Commands:
 *   build                    Optimize build process
 *   bundles                  Analyze and optimize bundles
 *   images                   Optimize images
 *   css                      Optimize CSS
 *   performance              Run performance analysis
 *   webpack                  Optimize webpack configuration
 *   all                      Run all optimizations
 *   analyze                  Analyze current state
 *   report                   Generate optimization report
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

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'bright');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(50)}`, 'bright');
}

function logSubsection(title) {
  log(`\n${'-'.repeat(30)}`, 'blue');
  log(`  ${title}`, 'blue');
  log(`${'-'.repeat(30)}`, 'blue');
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function findFiles(dir, extensions) {
  const files = [];
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip build directories
          if (!['node_modules', '.next', 'out', 'dist', 'build', '.git'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            files.push({
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
  return files;
}

class OptimizationOrchestrator {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      build: {},
      bundles: {},
      images: {},
      css: {},
      performance: {},
      webpack: {},
      summary: {}
    };
  }

  // Build Optimization
  optimizeBuild() {
    logSection('Build Optimization');
    
    try {
      // Clean webpack cache
      const cacheDir = path.join(this.projectRoot, '.next', 'cache');
      if (fs.existsSync(cacheDir)) {
        log('🧹 Cleaning webpack cache...', 'cyan');
        fs.rmSync(cacheDir, { recursive: true, force: true });
        log('✅ Webpack cache cleaned', 'green');
      } else {
        log('ℹ️  No webpack cache found to clean', 'yellow');
      }

      // Check large data files
      logSubsection('Large File Analysis');
      const srcDir = path.join(this.projectRoot, 'lib', 'api');
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.ts'));
        let totalSize = 0;
        const largeFiles = [];
        
        files.forEach(file => {
          const filePath = path.join(srcDir, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          
          if (sizeKB > 50) {
            largeFiles.push({ file, sizeKB });
          }
          totalSize += sizeKB;
        });
        
        if (largeFiles.length > 0) {
          log('⚠️  Found large files that might cause serialization issues:', 'yellow');
          largeFiles.forEach(({ file, sizeKB }) => {
            log(`   - ${file}: ${sizeKB}KB`, 'yellow');
          });
        } else {
          log('✅ No large files detected', 'green');
        }
        
        this.results.build.largeFiles = largeFiles;
        this.results.build.totalSize = totalSize;
      }

      // Generate build optimization report
      logSubsection('Build Environment');
      const nodeVersion = process.version;
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      };
      
      log(`Node.js version: ${nodeVersion}`, 'cyan');
      log(`Memory usage: ${memUsageMB.heapUsed}MB / ${memUsageMB.heapTotal}MB`, 'cyan');
      log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'cyan');
      
      this.results.build.environment = {
        nodeVersion,
        memoryUsage: memUsageMB,
        environment: process.env.NODE_ENV || 'development'
      };

      log('✅ Build optimization completed', 'green');
      return true;
      
    } catch (error) {
      log(`❌ Build optimization failed: ${error.message}`, 'red');
      return false;
    }
  }

  // Bundle Analysis
  analyzeBundles() {
    logSection('Bundle Analysis');
    
    try {
      const nextDir = path.join(this.projectRoot, '.next');
      const staticDir = path.join(nextDir, 'static');
      
      if (!fs.existsSync(nextDir)) {
        log('❌ .next directory not found. Run "npm run build" first.', 'red');
        return false;
      }

      // Analyze JavaScript bundles
      logSubsection('JavaScript Bundles');
      const jsDir = path.join(staticDir, 'chunks');
      if (fs.existsSync(jsDir)) {
        const jsFiles = fs.readdirSync(jsDir)
          .filter(file => file.endsWith('.js'))
          .map(file => {
            const filePath = path.join(jsDir, file);
            const size = getFileSize(filePath);
            return { name: file, size, path: filePath };
          })
          .sort((a, b) => b.size - a.size);
        
        jsFiles.forEach(file => {
          const sizeFormatted = formatBytes(file.size);
          const status = file.size > 500 * 1024 ? '⚠️' : '✅';
          log(`${status} ${file.name}: ${sizeFormatted}`, file.size > 500 * 1024 ? 'yellow' : 'green');
        });
        
        const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
        log(`\n📊 Total JavaScript: ${formatBytes(totalJsSize)}`, 'blue');
        
        this.results.bundles.jsFiles = jsFiles;
        this.results.bundles.totalJsSize = totalJsSize;
      }

      // Analyze CSS bundles
      logSubsection('CSS Bundles');
      const cssDir = path.join(staticDir, 'css');
      if (fs.existsSync(cssDir)) {
        const cssFiles = fs.readdirSync(cssDir)
          .filter(file => file.endsWith('.css'))
          .map(file => {
            const filePath = path.join(cssDir, file);
            const size = getFileSize(filePath);
            return { name: file, size, path: filePath };
          })
          .sort((a, b) => b.size - a.size);
        
        cssFiles.forEach(file => {
          const sizeFormatted = formatBytes(file.size);
          const status = file.size > 100 * 1024 ? '⚠️' : '✅';
          log(`${status} ${file.name}: ${sizeFormatted}`, file.size > 100 * 1024 ? 'yellow' : 'green');
        });
        
        const totalCssSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
        log(`\n📊 Total CSS: ${formatBytes(totalCssSize)}`, 'blue');
        
        this.results.bundles.cssFiles = cssFiles;
        this.results.bundles.totalCssSize = totalCssSize;
      }

      // Analyze dependencies
      logSubsection('Dependency Analysis');
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};
        
        log('Production Dependencies:', 'cyan');
        Object.entries(dependencies).forEach(([name, version]) => {
          log(`  📦 ${name}: ${version}`);
        });
        
        log('\nDevelopment Dependencies:', 'cyan');
        Object.entries(devDependencies).forEach(([name, version]) => {
          log(`  🔧 ${name}: ${version}`);
        });
        
        this.results.bundles.dependencies = { dependencies, devDependencies };
        
      } catch (error) {
        log(`❌ Error analyzing dependencies: ${error.message}`, 'red');
      }

      log('✅ Bundle analysis completed', 'green');
      return true;
      
    } catch (error) {
      log(`❌ Bundle analysis failed: ${error.message}`, 'red');
      return false;
    }
  }

  // Image Optimization
  optimizeImages() {
    logSection('Image Optimization');
    
    try {
      const publicDir = path.join(this.projectRoot, 'public');
      const srcDir = path.join(this.projectRoot, 'src');
      const appDir = path.join(this.projectRoot, 'app');
      
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
        this.results.images.totalImages = 0;
        return true;
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
      
      // Generate optimization recommendations
      logSubsection('Optimization Recommendations');
      const largeImages = allImages.filter(img => img.size > 500 * 1024);
      if (largeImages.length > 0) {
        log(`⚠️  ${largeImages.length} images are larger than 500KB`, 'yellow');
        log('Recommendations:', 'cyan');
        log('1. Convert large images to WebP format', 'cyan');
        log('2. Use responsive images with multiple sizes', 'cyan');
        log('3. Implement lazy loading for images', 'cyan');
        log('4. Consider using a CDN for image delivery', 'cyan');
      } else {
        log('✅ All images are reasonably sized', 'green');
      }
      
      this.results.images.totalImages = allImages.length;
      this.results.images.imagesByType = imagesByType;
      this.results.images.largeImages = largeImages;
      
      log('✅ Image optimization analysis completed', 'green');
      return true;
      
    } catch (error) {
      log(`❌ Image optimization failed: ${error.message}`, 'red');
      return false;
    }
  }

  // CSS Optimization
  optimizeCSS() {
    logSection('CSS Optimization');
    
    try {
      const cssFiles = [];
      const cssDir = path.join(this.projectRoot, 'app');
      
      function findCSSFiles(dir) {
        try {
          const files = fs.readdirSync(dir);
          
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              findCSSFiles(filePath);
            } else if (file.endsWith('.css')) {
              cssFiles.push(filePath);
            }
          });
        } catch (error) {
          // Directory might not exist or be accessible
        }
      }
      
      findCSSFiles(cssDir);
      
      if (cssFiles.length === 0) {
        log('No CSS files found in app directory.', 'yellow');
        this.results.css.totalFiles = 0;
        return true;
      }
      
      logSubsection('CSS File Analysis');
      cssFiles.forEach(file => {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        log(`📄 ${path.relative(this.projectRoot, file)}: ${sizeKB} KB`);
      });
      
      // Analyze globals.css specifically
      const globalsPath = path.join(this.projectRoot, 'app/globals.css');
      if (fs.existsSync(globalsPath)) {
        logSubsection('globals.css Analysis');
        const content = fs.readFileSync(globalsPath, 'utf8');
        const lines = content.split('\n');
        const totalLines = lines.length;
        const emptyLines = lines.filter(line => line.trim() === '').length;
        const commentLines = lines.filter(line => line.trim().startsWith('/*') || line.trim().startsWith('//')).length;
        const actualCodeLines = totalLines - emptyLines - commentLines;
        
        log(`📊 globals.css analysis: ${totalLines} lines, ${actualCodeLines} code lines, ${(fs.statSync(globalsPath).size / 1024).toFixed(2)} KB`);
        
        // Check for optimization opportunities
        logSubsection('CSS Optimization Checks');
        const checks = [
          {
            name: 'Duplicate selectors',
            pattern: /([^{}]+)\s*{[^}]*}\s*\1\s*{[^}]*}/g,
            found: content.match(/([^{}]+)\s*{[^}]*}\s*\1\s*{[^}]*}/g)?.length || 0
          },
          {
            name: 'Empty rules',
            pattern: /[^{}]+{\s*}/g,
            found: content.match(/[^{}]+{\s*}/g)?.length || 0
          },
          {
            name: 'Unused media queries',
            pattern: /@media[^{]+{[^}]*}/g,
            found: content.match(/@media[^{]+{[^}]*}/g)?.length || 0
          },
          {
            name: 'Long selectors',
            pattern: /[^{}]{50,}\s*{/g,
            found: content.match(/[^{}]{50,}\s*{/g)?.length || 0
          }
        ];
        
        checks.forEach(check => {
          if (check.found > 0) {
            log(`⚠️  ${check.name}: ${check.found} found`, 'yellow');
          } else {
            log(`✅ ${check.name}: None found`, 'green');
          }
        });
        
        this.results.css.globalsAnalysis = {
          totalLines,
          actualCodeLines,
          emptyLines,
          commentLines,
          sizeKB: (fs.statSync(globalsPath).size / 1024).toFixed(2),
          checks
        };
      }
      
      this.results.css.totalFiles = cssFiles.length;
      this.results.css.files = cssFiles;
      
      log('✅ CSS optimization analysis completed', 'green');
      return true;
      
    } catch (error) {
      log(`❌ CSS optimization failed: ${error.message}`, 'red');
      return false;
    }
  }

  // Performance Analysis
  analyzePerformance() {
    logSection('Performance Analysis');
    
    try {
      logSubsection('Performance Checks');
      
      // Check bundle analyzer report
      const bundleStatsPath = path.join(this.projectRoot, '.next/bundle-analyzer/client.html');
      if (fs.existsSync(bundleStatsPath)) {
        log('✅ Bundle analyzer report found', 'green');
      } else {
        log('ℹ️  Bundle analyzer report not found (run "npm run analyze" first)', 'yellow');
      }
      
      // Check Lighthouse report
      const lighthousePath = path.join(this.projectRoot, 'performance-audit.json');
      if (fs.existsSync(lighthousePath)) {
        try {
          const lighthouseData = JSON.parse(fs.readFileSync(lighthousePath, 'utf8'));
          const scores = lighthouseData.lhr.categories.performance.score;
          
          if (scores < 0.9) {
            log(`⚠️  Lighthouse performance score is ${(scores * 100).toFixed(1)}% (target: 90%+)`, 'yellow');
          } else {
            log(`✅ Lighthouse performance score: ${(scores * 100).toFixed(1)}%`, 'green');
          }
          
          this.results.performance.lighthouseScore = scores;
        } catch (error) {
          log(`❌ Error reading Lighthouse report: ${error.message}`, 'red');
        }
      } else {
        log('ℹ️  Lighthouse report not found (run "npm run performance:audit" first)', 'yellow');
      }
      
      // Check for large dependencies
      logSubsection('Dependency Analysis');
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const largeDeps = ['framer-motion', 'leaflet', 'react-leaflet'];
        const foundLargeDeps = largeDeps.filter(dep => packageJson.dependencies[dep]);
        
        if (foundLargeDeps.length > 0) {
          log(`⚠️  Large dependencies found: ${foundLargeDeps.join(', ')}`, 'yellow');
          log('Consider lazy loading these dependencies', 'cyan');
        } else {
          log('✅ No large dependencies detected', 'green');
        }
        
        this.results.performance.largeDependencies = foundLargeDeps;
      } catch (error) {
        log(`❌ Error analyzing dependencies: ${error.message}`, 'red');
      }
      
      // Performance recommendations
      logSubsection('Performance Recommendations');
      log('1. Use dynamic imports for large components', 'cyan');
      log('2. Implement code splitting', 'cyan');
      log('3. Optimize images and use WebP format', 'cyan');
      log('4. Use React.memo for expensive components', 'cyan');
      log('5. Implement proper caching strategies', 'cyan');
      
      log('✅ Performance analysis completed', 'green');
      return true;
      
    } catch (error) {
      log(`❌ Performance analysis failed: ${error.message}`, 'red');
      return false;
    }
  }

  // Webpack Optimization
  optimizeWebpack() {
    logSection('Webpack Optimization');
    
    try {
      logSubsection('Webpack Configuration Analysis');
      
      // Check for webpack configuration files
      const webpackConfigs = [
        'next.config.js',
        'webpack.config.js',
        'webpack.config.local.js'
      ];
      
      const foundConfigs = webpackConfigs.filter(config => fs.existsSync(config));
      
      if (foundConfigs.length > 0) {
        log('Found webpack configuration files:', 'cyan');
        foundConfigs.forEach(config => {
          log(`  📄 ${config}`, 'cyan');
        });
      } else {
        log('ℹ️  No custom webpack configuration found (using Next.js defaults)', 'yellow');
      }
      
      // Check .next directory for build artifacts
      const nextDir = path.join(this.projectRoot, '.next');
      if (fs.existsSync(nextDir)) {
        logSubsection('Build Artifacts');
        const buildStats = fs.statSync(nextDir);
        const sizeMB = (buildStats.size / 1024 / 1024).toFixed(2);
        log(`Build directory size: ${sizeMB} MB`, 'cyan');
        
        // Check for specific build artifacts
        const artifacts = [
          'static',
          'server',
          'cache',
          'trace'
        ];
        
        artifacts.forEach(artifact => {
          const artifactPath = path.join(nextDir, artifact);
          if (fs.existsSync(artifactPath)) {
            const stats = fs.statSync(artifactPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            log(`  📁 ${artifact}: ${sizeKB} KB`, 'cyan');
          }
        });
        
        this.results.webpack.buildSize = sizeMB;
        this.results.webpack.artifacts = artifacts.filter(artifact => 
          fs.existsSync(path.join(nextDir, artifact))
        );
      }
      
      // Webpack optimization recommendations
      logSubsection('Webpack Optimization Recommendations');
      log('1. Enable webpack bundle analyzer', 'cyan');
      log('2. Configure proper chunk splitting', 'cyan');
      log('3. Optimize module resolution', 'cyan');
      log('4. Use tree shaking effectively', 'cyan');
      log('5. Configure proper caching strategies', 'cyan');
      
      log('✅ Webpack optimization analysis completed', 'green');
      return true;
      
    } catch (error) {
      log(`❌ Webpack optimization failed: ${error.message}`, 'red');
      return false;
    }
  }

  // Generate comprehensive report
  generateReport() {
    logSection('Optimization Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        build: this.results.build,
        bundles: this.results.bundles,
        images: this.results.images,
        css: this.results.css,
        performance: this.results.performance,
        webpack: this.results.webpack
      },
      recommendations: []
    };
    
    // Generate recommendations based on analysis
    if (this.results.build.largeFiles?.length > 0) {
      report.recommendations.push({
        type: 'warning',
        category: 'build',
        message: `${this.results.build.largeFiles.length} large files detected`,
        action: 'Consider code splitting or dynamic imports'
      });
    }
    
    if (this.results.bundles.totalJsSize > 1024 * 1024) {
      report.recommendations.push({
        type: 'warning',
        category: 'bundles',
        message: `Large JavaScript bundle: ${formatBytes(this.results.bundles.totalJsSize)}`,
        action: 'Implement code splitting and lazy loading'
      });
    }
    
    if (this.results.images.largeImages?.length > 0) {
      report.recommendations.push({
        type: 'warning',
        category: 'images',
        message: `${this.results.images.largeImages.length} large images detected`,
        action: 'Convert to WebP format and implement lazy loading'
      });
    }
    
    if (this.results.css.globalsAnalysis?.checks?.some(check => check.found > 0)) {
      report.recommendations.push({
        type: 'warning',
        category: 'css',
        message: 'CSS optimization opportunities found',
        action: 'Remove duplicate selectors and empty rules'
      });
    }
    
    if (this.results.performance.largeDependencies?.length > 0) {
      report.recommendations.push({
        type: 'warning',
        category: 'performance',
        message: `Large dependencies: ${this.results.performance.largeDependencies.join(', ')}`,
        action: 'Consider lazy loading these dependencies'
      });
    }
    
    // Display recommendations
    if (report.recommendations.length > 0) {
      logSubsection('Optimization Recommendations');
      report.recommendations.forEach(rec => {
        const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
        log(`${icon} ${rec.message}`, rec.type === 'warning' ? 'yellow' : 'cyan');
        log(`   Action: ${rec.action}`, 'cyan');
      });
    } else {
      log('✅ No optimization issues detected', 'green');
    }
    
    // Save report to file
    const reportPath = path.join(this.projectRoot, 'optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Report saved to: ${reportPath}`, 'blue');
    
    this.results.summary = report;
    return report;
  }

  // Run all optimizations
  async runAll() {
    logSection('Running All Optimizations');
    
    const results = {
      build: this.optimizeBuild(),
      bundles: this.analyzeBundles(),
      images: this.optimizeImages(),
      css: this.optimizeCSS(),
      performance: this.analyzePerformance(),
      webpack: this.optimizeWebpack()
    };
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    logSection('Optimization Summary');
    log(`✅ Completed: ${successCount}/${totalCount} optimizations`, successCount === totalCount ? 'green' : 'yellow');
    
    Object.entries(results).forEach(([name, success]) => {
      const status = success ? '✅' : '❌';
      log(`${status} ${name}`, success ? 'green' : 'red');
    });
    
    // Generate final report
    this.generateReport();
    
    return results;
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const orchestrator = new OptimizationOrchestrator();
  
  switch (command) {
    case 'build':
      orchestrator.optimizeBuild();
      break;
    case 'bundles':
      orchestrator.analyzeBundles();
      break;
    case 'images':
      orchestrator.optimizeImages();
      break;
    case 'css':
      orchestrator.optimizeCSS();
      break;
    case 'performance':
      orchestrator.analyzePerformance();
      break;
    case 'webpack':
      orchestrator.optimizeWebpack();
      break;
    case 'all':
      orchestrator.runAll();
      break;
    case 'report':
      orchestrator.generateReport();
      break;
    case 'help':
    default:
      log('Unified Optimization Orchestrator', 'bright');
      log('==================================', 'bright');
      log('');
      log('Usage: node optimize-unified.js [command]', 'cyan');
      log('');
      log('Commands:', 'cyan');
      log('  build        Optimize build process', 'cyan');
      log('  bundles      Analyze and optimize bundles', 'cyan');
      log('  images       Optimize images', 'cyan');
      log('  css          Optimize CSS', 'cyan');
      log('  performance  Run performance analysis', 'cyan');
      log('  webpack      Optimize webpack configuration', 'cyan');
      log('  all          Run all optimizations', 'cyan');
      log('  report       Generate optimization report', 'cyan');
      log('  help         Show this help message', 'cyan');
      log('');
      log('Examples:', 'cyan');
      log('  node optimize-unified.js all', 'cyan');
      log('  node optimize-unified.js images', 'cyan');
      log('  node optimize-unified.js performance', 'cyan');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = OptimizationOrchestrator;
