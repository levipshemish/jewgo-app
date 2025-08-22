#!/usr/bin/env node

/**
 * Performance Regression Tracking
 * 
 * Compares current performance metrics against baseline from last main build.
 * Prevents gradual performance decay by enforcing regression thresholds.
 * 
 * Usage: node performance_regression.js [current-metrics-file] [baseline-metrics-file]
 */

const fs = require('fs');
const path = require('path');

// Performance regression thresholds
const REGRESSION_THRESHOLDS = {
  lcp: 100,    // 100ms max regression
  cls: 0.01,   // 0.01 max regression
  fid: 50,     // 50ms max regression
  fcp: 100,    // 100ms max regression
  ttfb: 50,    // 50ms max regression
  bundleSize: 0.05  // 5% max regression
};

// Parse command line arguments
const currentMetricsFile = process.argv[2] || 'current-metrics.json';
const baselineMetricsFile = process.argv[3] || 'baseline-metrics.json';

// Check if files exist
if (!fs.existsSync(currentMetricsFile)) {

  process.exit(1);
}

if (!fs.existsSync(baselineMetricsFile)) {

  fs.copyFileSync(currentMetricsFile, baselineMetricsFile);

  process.exit(0);
}

/**
 * Load metrics from file
 */
function loadMetrics(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading metrics from ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange(current, baseline) {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Format metric value for display
 */
function formatMetric(name, value) {
  switch (name) {
    case 'lcp':
    case 'fcp':
    case 'fid':
    case 'ttfb':
      return `${(value / 1000).toFixed(2)}s`;
    case 'cls':
      return value.toFixed(3);
    case 'bundleSize':
      return `${(value / 1024 / 1024).toFixed(2)}MB`;
    default:
      return value.toString();
  }
}

/**
 * Check if metric has regressed beyond threshold
 */
function hasRegressed(current, baseline, threshold, metricName) {
  const change = current - baseline;
  const percentageChange = calculatePercentageChange(current, baseline);
  
  // For bundle size, check percentage change
  if (metricName === 'bundleSize') {
    return percentageChange > threshold * 100; // threshold is already a percentage
  }
  
  // For time-based metrics, check absolute change
  return change > threshold;
}

// Load current and baseline metrics
const currentMetrics = loadMetrics(currentMetricsFile);
const baselineMetrics = loadMetrics(baselineMetricsFile);

// Track regressions
const regressions = [];
const improvements = [];
const stable = [];

// Check each metric
Object.keys(REGRESSION_THRESHOLDS).forEach(metricName => {
  const current = currentMetrics[metricName];
  const baseline = baselineMetrics[metricName];
  const threshold = REGRESSION_THRESHOLDS[metricName];
  
  if (current === undefined || baseline === undefined) {

    return;
  }
  
  const change = current - baseline;
  const percentageChange = calculatePercentageChange(current, baseline);

  if (hasRegressed(current, baseline, threshold, metricName)) {

    regressions.push({
      metric: metricName,
      current,
      baseline,
      change,
      percentageChange,
      threshold
    });
  } else if (change < 0) {

    improvements.push({
      metric: metricName,
      current,
      baseline,
      change,
      percentageChange
    });
  } else {

    stable.push({
      metric: metricName,
      current,
      baseline,
      change,
      percentageChange
    });
  }

});

// Summary

// Report regressions
if (regressions.length > 0) {

  regressions.forEach(regression => {
    const threshold = regression.metric === 'bundleSize' 
      ? `${(REGRESSION_THRESHOLDS[regression.metric] * 100).toFixed(1)}%`
      : formatMetric(regression.metric, REGRESSION_THRESHOLDS[regression.metric]);

  });

  process.exit(1);
}

// Report improvements
if (improvements.length > 0) {

  improvements.forEach(improvement => {

  });

}

// Update baseline if no regressions

// Optional: Auto-update baseline for improvements
if (improvements.length > 0) {

  fs.copyFileSync(currentMetricsFile, baselineMetricsFile);

}
