/** @type {import('next').NextConfig} */
// Ensure backend URL used in rewrites/redirects is always valid
const BACKEND_URL = (
  process.env["NEXT_PUBLIC_BACKEND_URL"] &&
  /^(https?:)\/\//.test(process.env["NEXT_PUBLIC_BACKEND_URL"])
) ? process.env["NEXT_PUBLIC_BACKEND_URL"] : 'https://jewgo.onrender.com';
const isCI = process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
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
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://jewgo-app.vercel.app',
    // Do not provide a fallback for NEXTAUTH_SECRET in production. Fail build if missing.
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '5060e374c6d88aacf8fea324',
    NEXT_PUBLIC_BACKEND_URL: process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || Date.now().toString(),
    // Prisma Query Engine configuration
    PRISMA_QUERY_ENGINE_TYPE: process.env.PRISMA_QUERY_ENGINE_TYPE || 'library',
  },
  // Validate required env vars at build time (especially in CI/production)
  webpack: (config, { isServer }) => {
    // Suppress OpenTelemetry warnings from Sentry
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'encoding'/,
    ];

    // Exclude archive directories from build
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      exclude: /components\/archive/,
    });

    // Handle Prisma Query Engine binaries for server-side rendering
    if (isServer) {
      // Copy Prisma Query Engine binaries to the output directory
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
      });

      // Ensure Prisma binaries are properly bundled
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
        type: 'javascript/auto',
      });

      const required = ['NEXTAUTH_SECRET', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_BACKEND_URL'];
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
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
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
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Only add specific headers for non-Next.js static files
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'jewgo.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },
  // Configure experimental features for optimal performance
  experimental: {
    // Enable modern features for better performance
    // Removed @prisma/client from optimizePackageImports to prevent Query Engine bundling issues
    optimizePackageImports: ['lucide-react'],
  },
  // Disable prerendering to avoid build errors
  trailingSlash: false,
  generateEtags: false,
  // Redirects configuration
  async redirects() {
    return [
      // Only redirect non-Next.js API routes to backend
      {
        source: '/api/specials/:path*',
        destination: `${BACKEND_URL}/api/specials/:path*`,
        permanent: false,
      },
      {
        source: '/api/health/:path*',
        destination: `${BACKEND_URL}/api/health/:path*`,
        permanent: false,
      },
      {
        source: '/api/admin/:path*',
        destination: `${BACKEND_URL}/api/admin/:path*`,
        permanent: false,
      },
      {
        source: '/api/feedback/:path*',
        destination: `${BACKEND_URL}/api/feedback/:path*`,
        permanent: false,
      },
      {
        source: '/api/statistics/:path*',
        destination: `${BACKEND_URL}/api/statistics/:path*`,
        permanent: false,
      },

      {
        source: '/api/kosher-types/:path*',
        destination: `${BACKEND_URL}/api/kosher-types/:path*`,
        permanent: false,
      },
      {
        source: '/api/migrate/:path*',
        destination: `${BACKEND_URL}/api/migrate/:path*`,
        permanent: false,
      },
      {
        source: '/api/remove-duplicates/:path*',
        destination: `${BACKEND_URL}/api/remove-duplicates/:path*`,
        permanent: false,
      },
      {
        source: '/api/update-database/:path*',
        destination: `${BACKEND_URL}/api/update-database/:path*`,
        permanent: false,
      },
      {
        source: '/api/test/:path*',
        destination: `${BACKEND_URL}/api/test/:path*`,
        permanent: false,
      },
    ];
  },
  // Rewrites configuration
  async rewrites() {
    return [
      // Only rewrite non-Next.js API routes to backend
      {
        source: '/api/specials/:path*',
        destination: `${BACKEND_URL}/api/specials/:path*`,
      },
      {
        source: '/api/health/:path*',
        destination: `${BACKEND_URL}/api/health/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${BACKEND_URL}/api/admin/:path*`,
      },
      {
        source: '/api/feedback/:path*',
        destination: `${BACKEND_URL}/api/feedback/:path*`,
      },
      {
        source: '/api/statistics/:path*',
        destination: `${BACKEND_URL}/api/statistics/:path*`,
      },

      {
        source: '/api/kosher-types/:path*',
        destination: `${BACKEND_URL}/api/kosher-types/:path*`,
      },
      {
        source: '/api/migrate/:path*',
        destination: `${BACKEND_URL}/api/migrate/:path*`,
      },
      {
        source: '/api/remove-duplicates/:path*',
        destination: `${BACKEND_URL}/api/remove-duplicates/:path*`,
      },
      {
        source: '/api/update-database/:path*',
        destination: `${BACKEND_URL}/api/update-database/:path*`,
      },
      {
        source: '/api/test/:path*',
        destination: `${BACKEND_URL}/api/test/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "seller-optimization-llc",
    project: "jewgo-app",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
