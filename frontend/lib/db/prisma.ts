/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// Check if we're in a build-time environment where database connection should be avoided
const isBuildTime = process.env.NODE_ENV === 'production' && 
  (process.env.VERCEL === '1' || process.env.CI === 'true') &&
  typeof window === 'undefined';

// Check if we're in a static generation context
const isStaticGeneration = typeof window === 'undefined' && 
  process.env.NODE_ENV === 'production' && 
  (process.env.VERCEL === '1' || process.env.CI === 'true');

// Check if database access should be skipped
const shouldSkipDbAccess = process.env.SKIP_DB_ACCESS === 'true' || isBuildTime || isStaticGeneration;

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

  // Only attempt connection if not in build time or static generation
  if (!shouldSkipDbAccess) {
    client.$connect()
      .catch((error) => {
        console.error('[PRISMA] Database connection failed:', error);
      });
  } else {
    console.log('[PRISMA] Skipping database connection during build/static generation');
  }

  return client;
};

// Lazy-loaded Prisma client
let _prisma: PrismaClient | undefined;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) {
      if (shouldSkipDbAccess) {
        console.log('[PRISMA] Skipping Prisma client initialization during build/static generation');
        // Return a no-op function for any method calls during build time
        return () => Promise.resolve([]);
      } else {
        _prisma = global.__prisma__ || createPrismaClient();
        if (process.env.NODE_ENV !== 'production') {
          global.__prisma__ = _prisma;
        }
      }
    }
    return _prisma[prop as keyof PrismaClient];
  }
});
