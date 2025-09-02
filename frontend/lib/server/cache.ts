import 'server-only';
import { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } from '@/lib/config/environment';

let redis: any | null = null;

async function getRedis() {
  if (redis) return redis;
  const Redis = await import('ioredis');
  if (REDIS_URL) {
    redis = new (Redis as any).default(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
  } else {
    redis = new (Redis as any).default({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      db: REDIS_DB,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  try { await redis.ping(); } catch { /* ignore */ }
  return redis;
}

const PREFIX = process.env.CACHE_PREFIX || 'jewgo:cache:';
const DEFAULT_TTL = process.env.CACHE_TTL_SECONDS ? parseInt(process.env.CACHE_TTL_SECONDS) : 300;

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (process.env.CACHE_ENABLED === 'false') return null;
  try {
    const r = await getRedis();
    const raw = await r.get(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T = any>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
  if (process.env.CACHE_ENABLED === 'false') return;
  try {
    const r = await getRedis();
    await r.setex(PREFIX + key, ttlSeconds, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const r = await getRedis();
    await r.del(PREFIX + key);
  } catch {
    // ignore
  }
}

// Metrics cache keys and helpers
export function keyDashboardMetrics(): string {
  return 'dashboard:metrics';
}

export function keyStoreMetrics(vendorId: string | null): string {
  return `store:metrics:${vendorId || 'global'}`;
}

export async function invalidateDashboardMetrics(): Promise<void> {
  await cacheDel(keyDashboardMetrics());
}

export async function invalidateStoreMetrics(vendorId?: string | null): Promise<void> {
  await cacheDel(keyStoreMetrics(vendorId || null));
}

// Convenience helper to invalidate all vendor-related caches (extend as needed)
export async function invalidateVendorCaches(vendorId: string): Promise<void> {
  await invalidateStoreMetrics(vendorId);
}
