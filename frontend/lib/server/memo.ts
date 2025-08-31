import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

// AsyncLocalStorage for per-request isolation
const requestStore = new AsyncLocalStorage<Map<string, any>>();

/**
 * Run function with isolated request store
 * Essential for preventing cross-request data leaks
 */
export function withReqStore<T>(fn: () => Promise<T>): Promise<T> {
  const store = new Map<string, any>();
  return requestStore.run(store, fn);
}

/**
 * Get or set value in request-local storage with lazy computation
 * Prevents duplicate expensive operations within the same request
 */
export function memoGetOrSet<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const store = requestStore.getStore();
  if (!store) {
    return compute(); // fallback without caching
  }

  if (store.has(key)) {
    return Promise.resolve(store.get(key));
  }

  const result = compute();
  store.set(key, result);
  return result;
}

/**
 * Set request ID for correlation across logs
 */
export function setRequestId(requestId: string): void {
  const store = requestStore.getStore();
  if (store) {
    store.set('requestId', requestId);
  }
}

/**
 * Get current request ID for logging correlation
 */
export function getRequestId(): string {
  const store = requestStore.getStore();
  return store?.get('requestId') || 'unknown';
}

/**
 * Get value from request store
 */
export function getStoreValue<T>(key: string): T | undefined {
  const store = requestStore.getStore();
  return store?.get(key);
}

/**
 * Set value in request store
 */
export function setStoreValue<T>(key: string, value: T): void {
  const store = requestStore.getStore();
  if (store) {
    store.set(key, value);
  }
}

/**
 * Check if running within request store context
 */
export function hasRequestStore(): boolean {
  return !!requestStore.getStore();
}

/**
 * Clear all values from request store (for testing)
 */
export function clearRequestStore(): void {
  const store = requestStore.getStore();
  if (store) {
    store.clear();
  }
}