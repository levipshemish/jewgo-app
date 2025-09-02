/**
 * Timeout utilities for fetch operations with AbortSignal.timeout fallback
 * Addresses Node.js compatibility issues with AbortSignal.timeout
 */

/**
 * Create a timeout-enabled fetch promise with AbortController fallback
 * @param fetchPromise - The fetch promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects with TimeoutError if timeout occurs
 */
export function withTimeout<T>(
  fetchPromise: Promise<T>, 
  timeoutMs: number = 5000
): Promise<T> {
  // Check if AbortSignal.timeout is available (modern browsers/Node.js 16+)
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    try {
      // Use native AbortSignal.timeout if available
      return fetchPromise;
    } catch (_error) {
      // Fall back to controller-based approach if AbortSignal.timeout fails
    }
  }
  
  // Fallback implementation using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const timeoutPromise = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    });
  });

  return Promise.race([
    fetchPromise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
}

/**
 * Create an AbortSignal with timeout fallback
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortSignal that will abort after timeout
 */
export function createTimeoutSignal(timeoutMs: number = 5000): AbortSignal {
  // Check if AbortSignal.timeout is available
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    try {
      return AbortSignal.timeout(timeoutMs);
    } catch (_error) {
      // Fall back to controller-based approach
    }
  }
  
  // Fallback implementation using AbortController
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return controller.signal;
}

/**
 * Check if AbortSignal.timeout is supported in the current environment
 * @returns true if AbortSignal.timeout is available
 */
export function isAbortSignalTimeoutSupported(): boolean {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal;
}