// Global polyfill for webpack chunks
// This ensures webpack chunks are available in all environments

// Ensure webpack chunk is available in Node.js environment
if (typeof global !== 'undefined') {
  if (!global.webpackChunk_N_E) {
    global.webpackChunk_N_E = [];
  }
}

// Ensure webpack chunk is available in browser environment
if (typeof window !== 'undefined') {
  if (!window.webpackChunk_N_E) {
    window.webpackChunk_N_E = [];
  }
}

// Ensure webpack chunk is available on globalThis
if (typeof globalThis !== 'undefined') {
  if (!globalThis.webpackChunk_N_E) {
    globalThis.webpackChunk_N_E = [];
  }
}

// End of polyfill
