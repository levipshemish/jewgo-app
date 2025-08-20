/** @type {import('next').NextConfig} */
// Ensure backend URL used in rewrites/redirects is always valid
const BACKEND_URL = (
  process.env["NEXT_PUBLIC_BACKEND_URL"] &&
  /^(https?:)\/\//.test(process.env["NEXT_PUBLIC_BACKEND_URL"])
) ? process.env["NEXT_PUBLIC_BACKEND_URL"] : 'https://jewgo-app-oyoh.onrender.com';
const isCI = process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

// Import webpack optimization utilities
const { optimizeWebpackConfig } = require('./scripts/webpack-optimization');
const nextConfig = {
  eslint: {
    // Fail builds in CI/production; allow relaxed checks locally
    ignoreDuringBuilds: !isCI,
  },
  typescript: {
    // Fail builds in CI/production; allow relaxed checks locally
    ignoreBuildErrors: !isCI,
  },
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '5060e374c6d88aacf8fea324',
    NEXT_PUBLIC_BACKEND_URL: process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || Date.now().toString(),
    // Prisma Query Engine configuration
    PRISMA_QUERY_ENGINE_TYPE: process.env.PRISMA_QUERY_ENGINE_TYPE || 'library',
  },
  // Validate required env vars at build time (especially in CI/production)
  webpack: (config, { isServer }) => {
    // Ensure cache type is set to memory for all webpack configurations
    config.cache = {
      type: 'memory',
    };

    // Apply webpack optimizations to reduce serialization warnings
    config = optimizeWebpackConfig(config, { isServer });

    // Exclude archive directories from build using webpack resolve
    if (config.resolve && config.resolve.alias) {
      config.resolve.alias['@/components/archive'] = false;
    }

    // Handle Prisma Query Engine binaries for server-side rendering
    if (isServer) {
      // Ensure Prisma binaries are properly bundled
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
        type: 'javascript/auto',
      });

      const required = ['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_BACKEND_URL'];
      const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
      if (missing.length > 0) {
        // In dev, warn; in prod (Vercel/CI), fail build
        const isProd = process.env['NODE_ENV'] === 'production';
        const msg = `Missing required environment variables: ${missing.join(', ')}`;
        if (isProd) {
          throw new Error(msg);
        } else {
          // eslint-disable-next-line no-console
          console.warn(msg);
        }
      }
    }
    return config;
  },
  // Add error handling for missing environment variables
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
      // Apply nosniff only to non-static content
      {
        source: '/((?!_next/static|static|favicon.ico).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // Let Next.js handle static assets natively
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Ensure CSS files are served with correct MIME type
      {
        source: '/_next/static/css/:path*',
        headers: [
          { key: 'Content-Type', value: 'text/css' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Ensure image optimization works correctly
      {
        source: '/_next/image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Only add specific headers for non-Next.js static files
      {
        source: '/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Disable static generation for auth pages
      {
        source: '/auth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
  // Image optimization configuration
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'maps.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'jewgo.com', pathname: '/**' },
      { protocol: 'https', hostname: 'jewgo.netlify.app', pathname: '/**' },
    ],
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

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options
    
    // Disable source map upload to avoid build issues
    dryRun: true,
    silent: true,
    
    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,
    
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
    
    // Ensure webpack cache configuration is preserved
    webpack: (config, options) => {
      // Ensure cache type is set to memory for Sentry webpack configurations
      if (config.cache) {
        config.cache = {
          type: 'memory',
        };
      }
      return config;
    },
  }
);
