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

console.log('📈 Performance Regression Tracking');
console.log('==================================');

// Parse command line arguments
const currentMetricsFile = process.argv[2] || 'current-metrics.json';
const baselineMetricsFile = process.argv[3] || 'baseline-metrics.json';

// Check if files exist
if (!fs.existsSync(currentMetricsFile)) {
  console.log(`❌ Current metrics file not found: ${currentMetricsFile}`);
  console.log('💡 Run performance tests to generate current metrics');
  process.exit(1);
}

if (!fs.existsSync(baselineMetricsFile)) {
  console.log(`⚠️  Baseline metrics file not found: ${baselineMetricsFile}`);
  console.log('💡 Creating baseline from current metrics');
  fs.copyFileSync(currentMetricsFile, baselineMetricsFile);
  console.log('✅ Baseline created from current metrics');
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

console.log(`Current metrics: ${currentMetricsFile}`);
console.log(`Baseline metrics: ${baselineMetricsFile}`);
console.log('');

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
    console.log(`⚠️  Missing metric: ${metricName}`);
    return;
  }
  
  const change = current - baseline;
  const percentageChange = calculatePercentageChange(current, baseline);
  
  console.log(`${metricName.toUpperCase()}:`);
  console.log(`  Current: ${formatMetric(metricName, current)}`);
  console.log(`  Baseline: ${formatMetric(metricName, baseline)}`);
  console.log(`  Change: ${change > 0 ? '+' : ''}${formatMetric(metricName, change)} (${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`);
  
  if (hasRegressed(current, baseline, threshold, metricName)) {
    console.log(`  ❌ REGRESSION: Exceeds threshold of ${metricName === 'bundleSize' ? (threshold * 100).toFixed(1) + '%' : formatMetric(metricName, threshold)}`);
    regressions.push({
      metric: metricName,
      current,
      baseline,
      change,
      percentageChange,
      threshold
    });
  } else if (change < 0) {
    console.log(`  ✅ IMPROVEMENT: Better than baseline`);
    improvements.push({
      metric: metricName,
      current,
      baseline,
      change,
      percentageChange
    });
  } else {
    console.log(`  ➡️  STABLE: Within acceptable range`);
    stable.push({
      metric: metricName,
      current,
      baseline,
      change,
      percentageChange
    });
  }
  console.log('');
});

// Summary
console.log('📊 Performance Regression Summary');
console.log('==================================');
console.log(`Regressions: ${regressions.length}`);
console.log(`Improvements: ${improvements.length}`);
console.log(`Stable: ${stable.length}`);
console.log('');

// Report regressions
if (regressions.length > 0) {
  console.log('❌ PERFORMANCE REGRESSIONS DETECTED:');
  regressions.forEach(regression => {
    const threshold = regression.metric === 'bundleSize' 
      ? `${(REGRESSION_THRESHOLDS[regression.metric] * 100).toFixed(1)}%`
      : formatMetric(regression.metric, REGRESSION_THRESHOLDS[regression.metric]);
    
    console.log(`  ${regression.metric.toUpperCase()}: ${formatMetric(regression.metric, regression.current)} (baseline: ${formatMetric(regression.metric, regression.baseline)})`);
    console.log(`    Threshold: ${threshold}, Change: ${regression.percentageChange.toFixed(1)}%`);
  });
  console.log('');
  console.log('💡 Performance optimization suggestions:');
  console.log('   - Code splitting and lazy loading');
  console.log('   - Image optimization and compression');
  console.log('   - Bundle analysis and tree shaking');
  console.log('   - Caching strategies');
  console.log('   - Server-side optimizations');
  console.log('');
  console.log('🚨 FAIL: Performance regressions must be addressed before merging');
  process.exit(1);
}

// Report improvements
if (improvements.length > 0) {
  console.log('✅ PERFORMANCE IMPROVEMENTS:');
  improvements.forEach(improvement => {
    console.log(`  ${improvement.metric.toUpperCase()}: ${formatMetric(improvement.metric, improvement.current)} (improved by ${Math.abs(improvement.percentageChange).toFixed(1)}%)`);
  });
  console.log('');
}

// Update baseline if no regressions
console.log('✅ No performance regressions detected');
console.log('💡 Consider updating baseline if improvements are significant');

// Optional: Auto-update baseline for improvements
if (improvements.length > 0) {
  console.log('🔄 Updating baseline with current metrics...');
  fs.copyFileSync(currentMetricsFile, baselineMetricsFile);
  console.log('✅ Baseline updated');
}
