#!/usr/bin/env node

/**
 * Bundle Optimization Script
 * 
 * This script analyzes the application bundles and provides recommendations
 * for optimization to reduce bundle sizes and improve performance.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { 
  log, 
  logSection, 
  logSubsection, 
  getFileSize, 
  formatBytes 
} = require('./utils/scriptUtils');

function analyzeBundleSizes() {
  logSection('Bundle Size Analysis');
  
  const nextDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(nextDir, 'static');
  
  if (!fs.existsSync(nextDir)) {
    log('❌ .next directory not found. Run "npm run build" first.', 'red');
    return;
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
  }
}

function analyzeDependencies() {
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
    
    // Check for potential duplicates or unused dependencies
    const allDeps = { ...dependencies, ...devDependencies };
    const duplicateVersions = {};
    
    Object.entries(allDeps).forEach(([name, version]) => {
      if (!duplicateVersions[version]) {
        duplicateVersions[version] = [];
      }
      duplicateVersions[version].push(name);
    });
    
    log('\nPotential Optimizations:', 'yellow');
    Object.entries(duplicateVersions)
      .filter(([version, packages]) => packages.length > 1)
      .forEach(([version, packages]) => {
        log(`  ⚠️  Multiple packages using version ${version}: ${packages.join(', ')}`);
      });
    
  } catch (error) {
    log('❌ Error reading package.json', 'red');
  }
}

function generateOptimizationRecommendations() {
  logSubsection('Optimization Recommendations');
  
  const recommendations = [
    {
      category: 'Bundle Splitting',
      items: [
        'Implement dynamic imports for route-based code splitting',
        'Use React.lazy() for component-level code splitting',
        'Split vendor bundles from application code',
        'Consider using webpack-bundle-analyzer for detailed analysis'
      ]
    },
    {
      category: 'Tree Shaking',
      items: [
        'Ensure all dependencies support tree shaking',
        'Use ES6 modules instead of CommonJS',
        'Import specific functions instead of entire libraries',
        'Configure webpack to enable tree shaking'
      ]
    },
    {
      category: 'Image Optimization',
      items: [
        'Use Next.js Image component for automatic optimization',
        'Implement lazy loading for images',
        'Use WebP and AVIF formats when possible',
        'Optimize image sizes before upload'
      ]
    },
    {
      category: 'Caching',
      items: [
        'Implement proper cache headers',
        'Use service workers for offline caching',
        'Cache static assets aggressively',
        'Implement CDN for global distribution'
      ]
    },
    {
      category: 'Dependencies',
      items: [
        'Regularly audit and remove unused dependencies',
        'Use smaller alternatives when possible',
        'Consider using bundlephobia.com to check package sizes',
        'Implement dependency version locking'
      ]
    }
  ];
  
  recommendations.forEach(rec => {
    log(`\n${rec.category}:`, 'magenta');
    rec.items.forEach(item => {
      log(`  • ${item}`);
    });
  });
}

function checkPerformanceMetrics() {
  logSubsection('Performance Metrics');
  
  try {
    // Check if lighthouse is available
    execSync('npx lighthouse --version', { stdio: 'ignore' });
    
    log('Running Lighthouse audit...', 'blue');
    execSync('npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"', {
      stdio: 'inherit'
    });
    
    if (fs.existsSync('./lighthouse-report.json')) {
      const report = JSON.parse(fs.readFileSync('./lighthouse-report.json', 'utf8'));
      const scores = report.lhr.categories;
      
      log('\nLighthouse Scores:', 'cyan');
      Object.entries(scores).forEach(([category, data]) => {
        const score = Math.round(data.score * 100);
        const color = score >= 90 ? 'green' : score >= 50 ? 'yellow' : 'red';
        log(`  ${data.title}: ${score}/100`, color);
      });
    }
  } catch (error) {
    log('⚠️  Lighthouse not available or failed to run', 'yellow');
    log('Install with: npm install -g lighthouse', 'blue');
  }
}

function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    bundleAnalysis: {},
    recommendations: [],
    performance: {}
  };
  
  // Save report to file
  fs.writeFileSync('./bundle-optimization-report.json', JSON.stringify(report, null, 2));
  log('\n📄 Report saved to: bundle-optimization-report.json', 'green');
}

function main() {
  log('🚀 Starting Bundle Optimization Analysis...', 'bold');
  
  try {
    analyzeBundleSizes();
    analyzeDependencies();
    generateOptimizationRecommendations();
    checkPerformanceMetrics();
    generateReport();
    
    log('\n✅ Bundle optimization analysis complete!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Review the recommendations above');
    log('2. Implement code splitting where appropriate');
    log('3. Optimize images and assets');
    log('4. Remove unused dependencies');
    log('5. Run "npm run build:analyze" for detailed webpack analysis');
    
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
  analyzeBundleSizes,
  analyzeDependencies,
  generateOptimizationRecommendations,
  checkPerformanceMetrics,
  generateReport
}; 