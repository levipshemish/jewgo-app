import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Configure Prisma Client with proper error handling and logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    // Ensure proper Query Engine path resolution in production
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Create a singleton instance with proper error handling
let prismaInstance: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // In production, always create a new instance
  prismaInstance = prismaClientSingleton()
} else {
  // In development, use global singleton to prevent multiple instances during hot reload
  prismaInstance = global.prisma ?? prismaClientSingleton()
  global.prisma = prismaInstance
}

export const prisma = prismaInstance

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})


