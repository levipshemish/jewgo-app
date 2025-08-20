// Temporarily disable instrumentation to fix server-side issues
// import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Temporarily disabled to fix server-side issues
  // try {
  //   if (process.env.NEXT_RUNTIME === 'nodejs') {
  //     await import('./sentry.server.config');
  //   }

  //   if (process.env.NEXT_RUNTIME === 'edge') {
  //     await import('./sentry.edge.config');
  //   }
  // } catch (error) {
  //   console.warn('Sentry initialization failed:', error);
  // }
}

// export const onRequestError = Sentry.captureRequestError; 