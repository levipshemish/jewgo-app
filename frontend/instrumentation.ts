// Re-enable Sentry with proper error handling
import * as Sentry from '@sentry/nextjs';

export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config');
    }
  } catch (error) {
    // Silently handle Sentry initialization errors
    console.warn('Sentry initialization failed:', error);
  }
}

export const onRequestError = Sentry.captureRequestError; 