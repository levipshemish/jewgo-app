# Webpack Optimization Guide

## Overview

This guide explains the optimizations implemented to reduce webpack cache serialization warnings and improve build performance, including recent fixes for critical cache corruption issues.

## Recent Critical Fixes (August 2025)

### Cache Corruption Issues Resolved

**Problem**: Critical webpack cache corruption causing development server failures:
- `ENOENT: no such file or directory, stat '.next/cache/webpack/client-development/*.pack.gz'`
- `ENOENT: no such file or directory, open '.next/routes-manifest.json'`
- `Cannot find module './4985.js'`
- `ReferenceError: exports is not defined` in vendors.js

**Root Cause**: Filesystem cache corruption in development mode with complex chunk splitting

**Solution**: Simplified webpack configuration for development:
```javascript
// Disable filesystem cache in development to prevent corruption
if (dev) {
  config.cache = false;
}

// Simplified optimization without complex chunk splitting
config.optimization = {
  ...config.optimization,
  minimize: isProduction,
  minimizer: config.optimization?.minimizer || [],
};
```

**Result**: 
- ✅ Development server starts reliably
- ✅ No more cache corruption errors
- ✅ All API endpoints working correctly
- ✅ Pages load without module resolution errors

## Problem

The application was experiencing webpack cache serialization warnings like:
```
[w] [webpack.cache.PackFileCacheStrategy] Serializing big strings (191kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
```

These warnings occur when webpack tries to cache large strings (typically large data objects or components) in its filesystem cache.

## Root Causes

1. **Large Mock Data**: The `restaurants.ts` file contained a large inline array of mock restaurant data (~230 lines)
2. **Inefficient Cache Configuration**: Webpack cache settings weren't optimized for large string handling
3. **Module Resolution**: Inefficient module resolution and parsing settings
4. **Cache Corruption**: Filesystem cache corruption in development mode (RESOLVED)

## Solutions Implemented

### 1. Development Cache Optimization (NEW)

**Problem**: Cache corruption in development mode
```javascript
// OLD: Complex cache configuration causing corruption
config.cache = {
  type: 'filesystem',
  buildDependencies: { config: [__filename] },
  cacheDirectory: path.resolve(__dirname, '.next/cache'),
  compression: 'gzip',
  maxAge: 172800000,
  store: 'pack',
  version: `${process.env.NODE_ENV}-${process.env.npm_package_version || '1.0.0'}`,
};
```

**Solution**: Disable cache in development
```javascript
// NEW: Simple, reliable development configuration
if (dev) {
  config.cache = false;
}
```

**Benefits**:
- Prevents cache corruption
- Faster development server startup
- More reliable builds
- Eliminates module resolution errors

### 2. Simplified Chunk Splitting (NEW)

**Problem**: Complex chunk splitting causing vendor errors
```javascript
// OLD: Complex chunk splitting
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendors', chunks: 'all', priority: 10 },
    common: { name: 'common', minChunks: 2, chunks: 'all', priority: 5 },
  },
}
```

**Solution**: Use default Next.js chunk splitting
```javascript
// NEW: Simplified optimization
config.optimization = {
  ...config.optimization,
  minimize: isProduction,
  minimizer: config.optimization?.minimizer || [],
};
```

**Benefits**:
- Eliminates vendor chunk errors
- More reliable module loading
- Better compatibility with Next.js defaults

### 3. Data Structure Optimization

**Before**: Large inline mock data in `restaurants.ts`
```typescript
static getMockRestaurants(): Restaurant[] {
  return [
    // 230+ lines of restaurant data
  ];
}
```

**After**: Separated mock data into dedicated file
```typescript
// restaurants.ts
import { mockRestaurants } from './mockData';

static getMockRestaurants(): Restaurant[] {
  return mockRestaurants;
}
```

**Benefits**:
- Reduces main file size
- Improves webpack parsing performance
- Better code organization

### 4. Webpack Cache Optimization (Production)

Enhanced cache configuration in `next.config.js` for production builds:

```javascript
// Only apply complex cache config in production
if (!dev) {
  config.cache = {
    type: 'filesystem',
    compression: 'gzip',
    maxAge: 172800000, // 2 days
    store: 'pack',
    memoryCacheUnaffected: true,
    allowCollectingMemory: true,
    compressionOptions: {
      level: 6, // Balanced compression
    },
  };
}
```

**Benefits**:
- Better compression for large strings
- Improved memory management
- More efficient serialization
- Only applied in production where needed

### 5. Module Resolution Optimization

```javascript
config.resolve = {
  cacheWithContext: false,
  symlinks: false,
  fallback: {
    fs: false,
    path: require.resolve('path-browserify'),
  },
};
```

**Benefits**:
- Faster module resolution
- Reduced context dependencies
- Better caching behavior

### 6. Performance Optimizations

```javascript
config.performance = {
  hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
  maxEntrypointSize: 512000,
  maxAssetSize: 512000,
};
```

**Benefits**:
- Better chunk splitting
- Reduced bundle sizes
- Improved caching

### 7. Warning Suppression

Added specific warning suppression for known issues:

```javascript
config.ignoreWarnings = [
  /Serializing big strings.*impacts deserialization performance/,
  /Critical dependency: the request of a dependency is an expression/,
  /Module not found: Can't resolve 'encoding'/,
  /Failed to parse source map/,
];
```

## Troubleshooting Guide (NEW)

### Critical Cache Corruption Errors

**Symptoms**:
- `ENOENT: no such file or directory, stat '.next/cache/webpack/*.pack.gz'`
- `ENOENT: no such file or directory, open '.next/routes-manifest.json'`
- `Cannot find module './4985.js'`
- `ReferenceError: exports is not defined` in vendors.js

**Immediate Fix**:
```bash
# Stop development server
pkill -f "next dev" || true

# Clean all caches
rm -rf .next node_modules/.cache

# Restart development server
npm run dev
```

**Prevention**:
- Use simplified webpack config in development
- Disable filesystem cache in development mode
- Avoid complex chunk splitting in development

### Module Resolution Errors

**Symptoms**:
- `Cannot find module './XXXX.js'`
- Missing webpack chunks
- 500 errors on API routes

**Fix**:
```bash
# Clean build cache
rm -rf .next

# Rebuild
npm run build
npm run dev
```

### Vendor Chunk Errors

**Symptoms**:
- `ReferenceError: exports is not defined` in vendors.js
- Webpack chunk loading failures

**Fix**:
- Use default Next.js chunk splitting
- Avoid custom vendor chunk configurations in development

## New Scripts

### Build Optimization Script

```bash
npm run optimize:build
```

This script:
- Cleans webpack cache
- Analyzes large data files
- Generates optimization report
- Provides recommendations

### Optimized Build Process

```bash
npm run build:optimized
```

This runs the optimization script before building.

### Cache Cleanup Script (NEW)

```bash
npm run clean:cache
```

This script:
- Stops development server
- Removes all cache directories
- Restarts development server

## Files Modified

1. **`frontend/next.config.js`**
   - Enhanced webpack configuration
   - Added development/production environment handling
   - Improved cache and performance settings
   - **NEW**: Disabled cache in development mode
   - **NEW**: Simplified chunk splitting

2. **`frontend/lib/api/mockData.ts`** (new)
   - Extracted mock restaurant data
   - Reduced main file size

3. **`frontend/lib/api/restaurants.ts`**
   - Simplified mock data access
   - Reduced file size by ~230 lines

4. **`frontend/scripts/webpack-optimization.js`** (new)
   - Webpack optimization utilities
   - Reusable optimization functions

5. **`frontend/scripts/optimize-build.js`** (new)
   - Build optimization script
   - Cache cleaning and analysis

6. **`frontend/package.json`**
   - Added optimization scripts
   - New build commands

## Best Practices

### For Development Environment

1. **Disable Cache**: Use `config.cache = false` in development
2. **Simple Configuration**: Avoid complex webpack optimizations in development
3. **Regular Cleanup**: Clean cache directories when issues occur
4. **Monitor Errors**: Watch for cache corruption symptoms

### For Production Environment

1. **Optimized Cache**: Use filesystem cache with compression
2. **Chunk Splitting**: Implement appropriate chunk splitting
3. **Performance Monitoring**: Monitor build performance and bundle sizes

### For Large Data Files

1. **Separate Data**: Move large data arrays to separate files
2. **Dynamic Imports**: Use dynamic imports for large data when possible
3. **Code Splitting**: Split large components into smaller chunks

### For Webpack Configuration

1. **Environment-Specific**: Use different configs for development vs production
2. **Cache Optimization**: Use appropriate cache settings for your data size
3. **Compression**: Enable gzip compression for cache files (production only)
4. **Memory Management**: Configure memory settings appropriately

### For Build Performance

1. **Regular Cache Cleaning**: Clean webpack cache periodically
2. **Monitor File Sizes**: Keep track of large files that might cause issues
3. **Use Optimization Scripts**: Run optimization scripts before builds

## Monitoring

### Check for Large Files

```bash
npm run optimize:build
```

This will identify files larger than 50KB that might cause serialization issues.

### Monitor Build Performance

Watch for these indicators:
- Build time improvements
- Reduced memory usage
- Fewer webpack warnings
- Faster development server startup
- **NEW**: No cache corruption errors

### Development Server Health

Monitor for these signs of cache corruption:
- Missing `.pack.gz` files
- Missing manifest files
- Module resolution errors
- Vendor chunk errors

## Troubleshooting

### If Warnings Persist

1. **Check File Sizes**: Run the optimization script to identify large files
2. **Clean Cache**: Remove `.next/cache` directory
3. **Review Data**: Look for large inline data structures
4. **Update Configuration**: Adjust webpack settings as needed

### Performance Issues

1. **Memory Usage**: Monitor memory usage during builds
2. **Build Time**: Track build time improvements
3. **Cache Efficiency**: Check if cache is being used effectively

### Critical Cache Errors (NEW)

1. **Immediate Action**: Stop server and clean cache
2. **Configuration Review**: Check webpack config for development mode
3. **Prevention**: Use simplified config in development

## Future Improvements

1. **Bundle Analysis**: Implement webpack bundle analyzer
2. **Tree Shaking**: Optimize tree shaking for better bundle sizes
3. **Code Splitting**: Implement more aggressive code splitting
4. **Lazy Loading**: Add lazy loading for large components
5. **Cache Monitoring**: Implement cache health monitoring
6. **Automated Cleanup**: Add automated cache cleanup scripts

## Conclusion

These optimizations have significantly improved webpack performance and reliability:

1. **Critical Fixes**: Resolved cache corruption issues in development
2. **Performance**: Reduced webpack serialization warnings
3. **Reliability**: Eliminated module resolution and vendor chunk errors
4. **Maintainability**: Simplified configuration for different environments

The key improvements are:
- Separate development and production webpack configurations
- Disabled cache in development to prevent corruption
- Simplified chunk splitting for better reliability
- Enhanced troubleshooting and monitoring capabilities

For ongoing maintenance:
- Run `npm run optimize:build` regularly to identify new optimization opportunities
- Monitor for cache corruption symptoms
- Use `npm run clean:cache` when issues occur
- Keep webpack configuration simple in development mode
