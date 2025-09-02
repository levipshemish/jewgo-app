// Centralized debug flag + logger
// Enable by setting NEXT_PUBLIC_DEBUG=true in the environment

export const DEBUG = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG === 'true';

export function debugLog(...args: any[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function debugInfo(...args: any[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
}

export function debugWarn(...args: any[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

