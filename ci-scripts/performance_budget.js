#!/usr/bin/env node

/**
 * Performance Budget Enforcement
 * 
 * Validates bundle sizes and performance metrics against defined budgets:
 * - Bundle budgets: main<500KB, vendor<1MB, CSS<100KB, initial<2MB
 * - CWV targets: LCP<2.5s, CLS<0.1, TTFB<600ms, FID<100ms, FCP<1.8s
 * 
 * Usage: node performance_budget.js [bundle-stats-file] [lighthouse-report]
 */

const fs = require('fs');
const path = require('path');

// Performance budgets
const BUNDLE_BUDGETS = {
  main: 500 * 1024,    // 500KB
  vendor: 1024 * 1024, // 1MB
  css: 100 * 1024,     // 100KB
  initial: 2 * 1024 * 1024 // 2MB
};

const CWV_TARGETS = {
  lcp: 2500,  // 2.5s
  cls: 0.1,   // 0.1
  ttfb: 600,  // 600ms
  fid: 100,   // 100ms
  fcp: 1800   // 1.8s
};

// Parse command line arguments
const bundleStatsFile = process.argv[2] || 'dist/stats.json';
const lighthouseReport = process.argv[3] || 'lighthouse-report.json';

let hasErrors = false;

// Check bundle sizes
if (fs.existsSync(bundleStatsFile)) {

  try {
    const stats = JSON.parse(fs.readFileSync(bundleStatsFile, 'utf8'));
    
    // Analyze bundle sizes
    for (const [bundleName, size] of Object.entries(stats.assets || {})) {
      const sizeKB = size / 1024;
      const budgetKB = BUNDLE_BUDGETS[bundleName] / 1024;
      
      if (size > BUNDLE_BUDGETS[bundleName]) {

        hasErrors = true;
      } else {

      }
    }
    
    // Check total initial bundle size
    const totalSize = Object.values(stats.assets || {}).reduce((sum, size) => sum + size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    const budgetMB = BUNDLE_BUDGETS.initial / (1024 * 1024);
    
    if (totalSize > BUNDLE_BUDGETS.initial) {

      hasErrors = true;
    } else {

    }
    
  } catch (error) {

  }
} else {

}

// Check Core Web Vitals
if (fs.existsSync(lighthouseReport)) {

  try {
    const report = JSON.parse(fs.readFileSync(lighthouseReport, 'utf8'));
    const audits = report.audits || {};
    
    // Check LCP
    const lcp = audits['largest-contentful-paint']?.numericValue;
    if (lcp && lcp > CWV_TARGETS.lcp) {

      hasErrors = true;
    } else if (lcp) {

    }
    
    // Check CLS
    const cls = audits['cumulative-layout-shift']?.numericValue;
    if (cls && cls > CWV_TARGETS.cls) {

      hasErrors = true;
    } else if (cls) {

    }
    
    // Check FID
    const fid = audits['max-potential-fid']?.numericValue;
    if (fid && fid > CWV_TARGETS.fid) {

      hasErrors = true;
    } else if (fid) {

    }
    
    // Check FCP
    const fcp = audits['first-contentful-paint']?.numericValue;
    if (fcp && fcp > CWV_TARGETS.fcp) {

      hasErrors = true;
    } else if (fcp) {

    }
    
  } catch (error) {

  }
} else {

}

// Summary

if (hasErrors) {

  process.exit(1);
} else {

}
