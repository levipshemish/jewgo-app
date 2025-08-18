// Self polyfill for browser environment only
// This ensures 'self' is available in the browser context

if (typeof window !== 'undefined' && typeof self === 'undefined') {
  // In browser environment, set self to window
  window.self = window;
}

// Ensure webpack chunk is available in browser
if (typeof window !== 'undefined') {
  if (!window.webpackChunk_N_E) {
    window.webpackChunk_N_E = [];
  }
  if (!self.webpackChunk_N_E) {
    self.webpackChunk_N_E = [];
  }
}

// Only log in browser environment
if (typeof window !== 'undefined') {
  }
