import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Environment detection
const isVercel = process.env.VERCEL === '1';
const isCI = process.env.CI === 'true';
const isBuildTime = process.env.NODE_ENV === 'production' && (isVercel || isCI);

// Create Prisma client with connection error handling
const createPrismaClient = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  } catch (error) {
    console.warn('Failed to create Prisma client:', error);
    return undefined;
  }
};

// Only create Prisma client if not in build time or if DATABASE_URL is available
const shouldCreateClient = () => {
  // Skip during build time if DATABASE_URL is not available
  if (isBuildTime && !process.env.DATABASE_URL) {
    console.log('Skipping Prisma client creation during build time - no DATABASE_URL');
    return false;
  }
  
  // In development or other environments, always create client
  return true;
};

export const prisma = globalForPrisma.prisma ?? (shouldCreateClient() ? createPrismaClient() : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export a safe version that handles undefined client
export const getPrismaClient = () => {
  if (!prisma) {
    throw new Error('Prisma client not available - database connection not configured for this environment');
  }
  return prisma;
};

// Export environment info for debugging
export const prismaEnvironment = {
  isBuildTime,
  isVercel,
  isCI,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
};

export default prisma;
