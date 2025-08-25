/** @type {import('next').NextConfig} */
// Ensure backend URL used in rewrites/redirects is always valid
const rawBackend = process.env["NEXT_PUBLIC_BACKEND_URL"] || '';
const normalizedBackend = rawBackend.replace(/\/+$/, '');
const BACKEND_URL = normalizedBackend
  ? normalizedBackend
  : (process.env.NODE_ENV === 'production' ? 'https://jewgo-app-oyoh.onrender.com' : 'http://127.0.0.1:8082');

// Improved environment detection
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1';
const isCI = process.env.CI === 'true' || isVercel || process.env.NODE_ENV === 'production';
const isProduction = process.env.NODE_ENV === 'production';

// Webpack optimization utilities (commented out due to missing file)
// const { optimizeWebpackConfig } = require('./scripts/webpack-optimization');

const nextConfig = {
  // Enable modern features for better performance
  experimental: {
    // Removed @prisma/client from optimizePackageImports to prevent Query Engine bundling issues
    optimizePackageImports: ['lucide-react'],
    // Disable webpackBuildWorker to avoid flaky missing vendor-chunks during dev
    webpackBuildWorker: false,
    // Disable CSS script injection to prevent CSS files from being loaded as scripts
    optimizeCss: false,
    // Optimize webpack cache performance
    // Note: turbo config moved to turbopack (stable in Next.js 15)
  },
  eslint: {
    // Fail builds in CI/production; allow relaxed checks locally
    ignoreDuringBuilds: !isCI,
  },
  typescript: {
    // TypeScript checking is handled by the build process
    // No ignoreDuringBuilds option needed here
  },
  // Image optimization - disable in Docker to prevent issues
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    // Disable image optimization in Docker to prevent issues
    unoptimized: isDocker,
  },

  // Webpack configuration to fix eval errors and CSS issues
  webpack: (config, { isServer, dev }) => {
    // Temporarily disable webpack optimizations to fix module issues
    // config = optimizeWebpackConfig(config, { isServer });

    // Optimize webpack cache performance
    const path = require('path');
    config.cache = {
      ...config.cache,
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: path.resolve(__dirname, '.next/cache'),
      compression: 'gzip',
      maxAge: 172800000, // 2 days
      // Optimize serialization for large strings
      store: 'pack',
      version: `${process.env.NODE_ENV}-${process.env.npm_package_version || '1.0.0'}`,
    };

    // Fix eval errors by configuring module resolution
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      },
    };

    // Configure CSS processing to prevent syntax errors
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (oneOfRule.test && oneOfRule.test.toString().includes('css')) {
            // Ensure CSS loaders are properly configured
            if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
              oneOfRule.use.forEach((loader) => {
                if (loader.loader && loader.loader.includes('css-loader')) {
                  // Configure CSS loader to handle syntax errors gracefully
                  loader.options = {
                    ...loader.options,
                    sourceMap: false, // Disable source maps to prevent comment issues
                    importLoaders: 1,
                    // Add options to handle long comments and special characters
                    url: false,
                    import: false,
                    // Disable CSS modules for global CSS
                    modules: false,
                  };
                }
              });
            }
          }
        });
      }
    });

    // Suppress eval-related warnings and errors
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'encoding'/,
      /Failed to parse source map/,
      /eval\(/,
      /Serializing big strings.*impacts deserialization performance/,
      // Suppress CSS-related warnings
      /vendors\.css/,
      /Invalid or unexpected token/,
      /CSS.*syntax.*error/,
    ];

    // Configure webpack to handle eval more gracefully and optimize performance
    config.optimization = {
      ...config.optimization,
      minimize: isProduction,
      minimizer: config.optimization?.minimizer || [],
      // Optimize chunk splitting to reduce serialization overhead
      splitChunks: {
        ...config.optimization?.splitChunks,
        chunks: 'all',
        cacheGroups: {
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

    // Disable CSS source maps and comments to prevent parsing issues
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (oneOfRule.test && oneOfRule.test.toString().includes('css')) {
            if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
              oneOfRule.use.forEach((loader) => {
                if (loader.loader && loader.loader.includes('css-loader')) {
                  loader.options = {
                    ...loader.options,
                    sourceMap: false,
                    importLoaders: 1,
                    url: false,
                    import: false,
                    modules: false,
                    // Disable comments to prevent parsing issues
                    comments: false,
                  };
                }
                if (loader.loader && loader.loader.includes('postcss-loader')) {
                  loader.options = {
                    ...loader.options,
                    sourceMap: false,
                  };
                }
              });
            }
          }
        });
      }
    });

    return config;
  },

  // Disable prerendering to avoid build errors
  trailingSlash: false,
  generateEtags: false,
  
  // Ensure proper MIME types for CSS files
  async headers() {
    return [
      {
        source: '/static/css/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
        ],
      },
    ];
  },

  // Redirects configuration
  async redirects() {
    return [
      // Only redirect non-Next.js API routes to backend
      { source: '/api/specials/:path*', destination: `${BACKEND_URL}/api/specials/:path*`, permanent: false },
      { source: '/api/health/:path*', destination: `${BACKEND_URL}/api/health/:path*`, permanent: false },
      { source: '/api/admin/:path*', destination: `${BACKEND_URL}/api/admin/:path*`, permanent: false },
      { source: '/api/feedback/:path*', destination: `${BACKEND_URL}/api/feedback/:path*`, permanent: false },
      { source: '/api/statistics/:path*', destination: `${BACKEND_URL}/api/statistics/:path*`, permanent: false },
      { source: '/api/kosher-types/:path*', destination: `${BACKEND_URL}/api/kosher-types/:path*`, permanent: false },
      { source: '/api/migrate/:path*', destination: `${BACKEND_URL}/api/migrate/:path*`, permanent: false },
      { source: '/api/remove-duplicates/:path*', destination: `${BACKEND_URL}/api/remove-duplicates/:path*`, permanent: false },
      { source: '/api/update-database/:path*', destination: `${BACKEND_URL}/api/update-database/:path*`, permanent: false },
      { source: '/api/test/:path*', destination: `${BACKEND_URL}/api/test/:path*`, permanent: false },
      // Note: Do not redirect '/api/restaurants/*' so that Next API routes
      // like '/api/restaurants' and '/api/restaurants/filter-options' work locally
    ];
  },
  // Rewrites configuration
  async rewrites() {
    return [
      // Only rewrite non-Next.js API routes to backend
      { source: '/api/specials/:path*', destination: `${BACKEND_URL}/api/specials/:path*` },
      { source: '/api/health/:path*', destination: `${BACKEND_URL}/api/health/:path*` },
      { source: '/api/admin/:path*', destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: '/api/feedback/:path*', destination: `${BACKEND_URL}/api/feedback/:path*` },
      { source: '/api/statistics/:path*', destination: `${BACKEND_URL}/api/statistics/:path*` },
      { source: '/api/kosher-types/:path*', destination: `${BACKEND_URL}/api/kosher-types/:path*` },
      { source: '/api/update-database/:path*', destination: `${BACKEND_URL}/api/update-database/:path*` },
      { source: '/api/test/:path*', destination: `${BACKEND_URL}/api/test/:path*` },
      // Note: Do not rewrite '/api/restaurants/*' so that Next API routes
      // like '/api/restaurants' and '/api/restaurants/filter-options' work locally
    ];
  },
};

module.exports = nextConfig;
