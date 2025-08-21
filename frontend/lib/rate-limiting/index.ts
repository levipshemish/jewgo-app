/**
 * Rate limiting module selector
 * Automatically chooses between Upstash Redis (production) and Docker-compatible (development)
 */

// Check if we're in Docker environment
const isDockerEnvironment = process.env.DOCKER === 'true' || process.env.NODE_ENV === 'development';

// Export all functions with dynamic loading
export async function checkRateLimit(key: string, limitType: "anonymous_auth" | "merge_operations" | "email_upgrade", requestIP: string, forwardedFor?: string) {
  if (isDockerEnvironment) {
    const { checkRateLimit } = await import('./docker-redis');
    return checkRateLimit(key, limitType, requestIP, forwardedFor);
  } else {
    const { checkRateLimit } = await import('./upstash-redis');
    return checkRateLimit(key, limitType, requestIP, forwardedFor);
  }
}

export async function clearRateLimit(key: string, limitType?: "anonymous_auth" | "merge_operations" | "email_upgrade", requestIP?: string) {
  if (isDockerEnvironment) {
    const { clearRateLimit } = await import('./docker-redis');
    return clearRateLimit(key, limitType || "anonymous_auth", requestIP || "");
  } else {
    const { clearRateLimit } = await import('./upstash-redis');
    return clearRateLimit(key);
  }
}

export async function checkIdempotency(key: string) {
  if (isDockerEnvironment) {
    const { checkIdempotency } = await import('./docker-redis');
    return checkIdempotency(key);
  } else {
    const { checkIdempotency } = await import('./upstash-redis');
    return checkIdempotency(key);
  }
}

export async function storeIdempotencyResult(key: string, result: any, ttl?: number) {
  if (isDockerEnvironment) {
    const { storeIdempotencyResult } = await import('./docker-redis');
    return storeIdempotencyResult(key, result, ttl);
  } else {
    const { storeIdempotencyResult } = await import('./upstash-redis');
    return storeIdempotencyResult(key, result, ttl);
  }
}

// For synchronous functions, we need to import both
export { generateIdempotencyKey } from './upstash-redis';
export * from './utils';
