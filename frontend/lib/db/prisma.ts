import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

  // Add connection error handling
  client.$connect()
    .then(() => {
      console.log('[PRISMA] Database connected successfully');
    })
    .catch((error) => {
      console.error('[PRISMA] Database connection failed:', error);
    });

  return client;
};

export const prisma: PrismaClient = global.__prisma__ || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}

