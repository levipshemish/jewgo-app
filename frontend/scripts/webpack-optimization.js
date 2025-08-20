/**
 * Webpack optimization utilities to reduce serialization warnings
 * This script provides utilities to optimize webpack configuration for better performance
 */

const path = require('path');

/**
 * Optimize webpack cache configuration to reduce serialization warnings
 * @param {Object} config - Webpack configuration object
 * @returns {Object} Optimized webpack configuration
 */
function optimizeWebpackCache(config) {
  // Ensure cache type is set to memory for compatibility
  config.cache = {
    type: 'memory',
  };

  return config;
}

/**
 * Add module optimization rules to reduce serialization issues
 * @param {Object} config - Webpack configuration object
 * @returns {Object} Optimized webpack configuration
 */
function optimizeModuleRules(config) {
  // Optimize module resolution
  config.resolve = {
    ...config.resolve,
    cacheWithContext: false,
    symlinks: false,
    // Add fallbacks for better performance - but be more careful with path-browserify
    fallback: {
      ...config.resolve?.fallback,
      fs: false,
      // Only add path-browserify if it's available and needed
      ...(config.resolve?.fallback?.path ? {} : { path: false }),
    },
    // Fix module system issues
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js', '.ts', '.tsx'],
    },
  };

  // Optimize module parsing - but don't disable dynamic imports
  config.module = {
    ...config.module,
    parser: {
      ...config.module.parser,
      javascript: {
        ...config.module.parser?.javascript,
        // Keep dynamic imports enabled for proper module resolution
        // dynamicImport: false, // Removed to fix module resolution issues
        // Optimize parsing for large files
        requireEnsure: false,
      },
    },
  };

  return config;
}

/**
 * Add performance optimizations
 * @param {Object} config - Webpack configuration object
 * @returns {Object} Optimized webpack configuration
 */
function addPerformanceOptimizations(config) {
  // Add performance hints
  config.performance = {
    ...config.performance,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  };

  // Optimize chunk splitting
  config.optimization = {
    ...config.optimization,
    splitChunks: {
      ...config.optimization?.splitChunks,
      chunks: 'all',
      cacheGroups: {
        ...config.optimization?.splitChunks?.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
        },
      },
    },
  };

  return config;
}

/**
 * Suppress webpack warnings for known issues
 * @param {Object} config - Webpack configuration object
 * @returns {Object} Optimized webpack configuration
 */
function suppressWarnings(config) {
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    // Suppress webpack cache serialization warnings for large strings
    /Serializing big strings.*impacts deserialization performance/,
    // Suppress other common warnings
    /Critical dependency: the request of a dependency is an expression/,
    /Module not found: Can't resolve 'encoding'/,
    /Failed to parse source map/,
  ];

  return config;
}

/**
 * Main optimization function that applies all optimizations
 * @param {Object} config - Webpack configuration object
 * @param {Object} options - Additional options
 * @returns {Object} Fully optimized webpack configuration
 */
function optimizeWebpackConfig(config, options = {}) {
  const { isServer = false } = options;

  // Apply all optimizations
  config = optimizeWebpackCache(config);
  config = optimizeModuleRules(config);
  config = addPerformanceOptimizations(config);
  config = suppressWarnings(config);

  // Server-specific optimizations
  if (isServer) {
    // Optimize server-side bundle
    config.externals = config.externals || [];
    config.externals.push({
      '@prisma/client': 'commonjs @prisma/client',
    });
  }

  return config;
}

module.exports = {
  optimizeWebpackConfig,
  optimizeWebpackCache,
  optimizeModuleRules,
  addPerformanceOptimizations,
  suppressWarnings,
};
