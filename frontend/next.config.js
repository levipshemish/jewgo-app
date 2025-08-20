/** @type {import('next').NextConfig} */
// Ensure backend URL used in rewrites/redirects is always valid
const BACKEND_URL = (
  process.env["NEXT_PUBLIC_BACKEND_URL"] &&
  /^(https?:)\/\//.test(process.env["NEXT_PUBLIC_BACKEND_URL"])
) ? process.env["NEXT_PUBLIC_BACKEND_URL"] : 'https://jewgo-app-oyoh.onrender.com';

// Improved environment detection
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1';
const isCI = process.env.CI === 'true' || isVercel || process.env.NODE_ENV === 'production';
const isProduction = process.env.NODE_ENV === 'production';

// Import webpack optimization utilities
const { optimizeWebpackConfig } = require('./scripts/webpack-optimization');
const nextConfig = {
  // Enable node middleware for nodejs runtime support
  experimental: {
    nodeMiddleware: true,
  },
  eslint: {
    // Fail builds in CI/production; allow relaxed checks locally
    ignoreDuringBuilds: !isCI,
  },
  typescript: {
    // Fail builds in CI/production; allow relaxed checks locally
    ignoreBuildErrors: !isCI,
  },
  // Font optimization to prevent preload warnings
  optimizeFonts: true,
  // Image optimization
  images: {
    domains: ['res.cloudinary.com', 'maps.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    unoptimized: false,
  },
  // Configure experimental features for optimal performance
  experimental: {
    // Enable modern features for better performance
    // Removed @prisma/client from optimizePackageImports to prevent Query Engine bundling issues
    optimizePackageImports: ['lucide-react'],
    // Optimize webpack cache to reduce serialization warnings
    webpackBuildWorker: true,
  },

  // Disable prerendering to avoid build errors
  trailingSlash: false,
  generateEtags: false,

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
      { source: '/api/migrate/:path*', destination: `${BACKEND_URL}/api/migrate/:path*` },
      { source: '/api/remove-duplicates/:path*', destination: `${BACKEND_URL}/api/remove-duplicates/:path*` },
      { source: '/api/update-database/:path*', destination: `${BACKEND_URL}/api/update-database/:path*` },
      { source: '/api/test/:path*', destination: `${BACKEND_URL}/api/test/:path*` },
    ];
  },
};

// Temporarily disable Sentry to fix Edge Runtime module conflicts
// const { withSentryConfig } = require("@sentry/nextjs");

// module.exports = withSentryConfig(
//   nextConfig,
//   {
//     // For all available options, see:
//     // https://www.npmjs.com/package/@sentry/webpack-plugin#options
//     
//     // Disable source map upload to avoid build issues
//     dryRun: true,
//     silent: true,
//     
//     // Upload a larger set of source maps for prettier stack traces (increases build time)
//     widenClientFileUpload: true,
//     
//     // Automatically tree-shake Sentry logger statements to reduce bundle size
//     disableLogger: true,
//     
//     // Ensure webpack cache configuration is preserved
//     webpack: (config, options) => {
//       // Ensure cache type is set to memory for Sentry webpack configurations
//       if (config.cache) {
//         config.cache = {
//           type: 'memory',
//         };
//       }
//       return config;
//     },
//   }
// );

module.exports = nextConfig;
