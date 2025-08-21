/**
 * Rate limiting module selector
 * Automatically chooses between Upstash Redis (production) and Docker-compatible (development)
 */

// Check if we're in Docker environment
const isDockerEnvironment = process.env.DOCKER === 'true' || process.env.NODE_ENV === 'development';

// Export all functions with dynamic loading
export async function checkRateLimit(...args: any[]) {
  if (isDockerEnvironment) {
    const { checkRateLimit } = await import('./docker-redis');
    return checkRateLimit(...args);
  } else {
    const { checkRateLimit } = await import('./upstash-redis');
    return checkRateLimit(...args);
  }
}

export async function clearRateLimit(...args: any[]) {
  if (isDockerEnvironment) {
    const { clearRateLimit } = await import('./docker-redis');
    return clearRateLimit(...args);
  } else {
    const { clearRateLimit } = await import('./upstash-redis');
    return clearRateLimit(...args);
  }
}

export async function checkIdempotency(...args: any[]) {
  if (isDockerEnvironment) {
    const { checkIdempotency } = await import('./docker-redis');
    return checkIdempotency(...args);
  } else {
    const { checkIdempotency } = await import('./upstash-redis');
    return checkIdempotency(...args);
  }
}

export async function storeIdempotencyResult(...args: any[]) {
  if (isDockerEnvironment) {
    const { storeIdempotencyResult } = await import('./docker-redis');
    return storeIdempotencyResult(...args);
  } else {
    const { storeIdempotencyResult } = await import('./upstash-redis');
    return storeIdempotencyResult(...args);
  }
}

// For synchronous functions, we need to import both
export { generateIdempotencyKey } from './upstash-redis';
export * from './utils';
