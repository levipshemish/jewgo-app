#!/usr/bin/env node

/**
 * Performance Optimization Script for JewGo Frontend
 * 
 * This script analyzes and optimizes the application for better performance.
 * Run with: npm run optimize:performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance optimization functions
const optimizations = {
  // Analyze bundle size
  analyzeBundle: () => {
    try {
      execSync('npm run analyze', { stdio: 'inherit' });
      } catch (error) {
      }
  },

  // Run Lighthouse audit
  runLighthouse: () => {
    try {
      execSync('npm run performance:audit', { stdio: 'inherit' });
      } catch (error) {
      }
  },

  // Optimize images
  optimizeImages: () => {
    try {
      execSync('npm run optimize:images', { stdio: 'inherit' });
      } catch (error) {
      }
  },

  // Clean build artifacts
  cleanBuild: () => {
    try {
      execSync('npm run clean', { stdio: 'inherit' });
      } catch (error) {
      }
  },

  // Build for production
  buildProduction: () => {
    try {
      execSync('npm run build:production', { stdio: 'inherit' });
      } catch (error) {
      process.exit(1);
    }
  },

  // Generate performance report
  generateReport: () => {
    try {
      execSync('npm run performance:report', { stdio: 'inherit' });
      } catch (error) {
      }
  },

  // Check for performance issues
  checkPerformanceIssues: () => {
    const issues = [];
    
    // Check bundle size
    const bundleStatsPath = path.join(__dirname, '../.next/bundle-analyzer/client.html');
    if (fs.existsSync(bundleStatsPath)) {
      }
    
    // Check Lighthouse report
    const lighthousePath = path.join(__dirname, '../performance-audit.json');
    if (fs.existsSync(lighthousePath)) {
      const lighthouseData = JSON.parse(fs.readFileSync(lighthousePath, 'utf8'));
      const scores = lighthouseData.lhr.categories.performance.score;
      
      if (scores < 0.9) {
        issues.push(`Lighthouse performance score is ${(scores * 100).toFixed(1)}% (target: 90%+)`);
      } else {
        .toFixed(1)}%`);
      }
    }
    
    // Check for large dependencies
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const largeDeps = ['framer-motion', 'leaflet', 'react-leaflet'];
    const foundLargeDeps = largeDeps.filter(dep => packageJson.dependencies[dep]);
    
    if (foundLargeDeps.length > 0) {
      }`);
      }
    
    if (issues.length > 0) {
      issues.forEach(issue => );
    } else {
      }
    
    },

  // Optimize CSS
  optimizeCSS: () => {
    try {
      execSync('npm run optimize:css', { stdio: 'inherit' });
      } catch (error) {
      }
  },

  // Validate environment
  validateEnvironment: () => {
    try {
      execSync('npm run validate-env', { stdio: 'inherit' });
      } catch (error) {
      }
  }
};

// Main optimization process
async function runOptimizations() {
  const steps = [
    'validateEnvironment',
    'cleanBuild',
    'optimizeImages',
    'optimizeCSS',
    'buildProduction',
    'analyzeBundle',
    'runLighthouse',
    'generateReport',
    'checkPerformanceIssues'
  ];

  for (const step of steps) {
    if (optimizations[step]) {
      optimizations[step]();
    }
  }

  }

// Run optimizations
runOptimizations().catch(error => {
  // // console.error('❌ Performance optimization failed:', error);
  process.exit(1);
});
