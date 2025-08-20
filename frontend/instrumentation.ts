// Temporarily disable Sentry to fix Edge Runtime module conflicts
// import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Temporarily disabled to fix Edge Runtime module conflicts
  // try {
  //   if (process.env.NEXT_RUNTIME === 'nodejs') {
  //     await import('./sentry.server.config');
  //   }

  //   if (process.env.NEXT_RUNTIME === 'edge') {
  //     await import('./sentry.edge.config');
  //   }
  // } catch (error) {
  //   // Silently handle Sentry initialization errors to prevent crashes
  //   console.warn('Sentry initialization failed:', error);
  // }
}

// export const onRequestError = Sentry.captureRequestError; 