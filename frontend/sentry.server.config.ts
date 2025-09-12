// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Check if we're in a Docker environment
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1';
const isProduction = process.env.NODE_ENV === 'production';

// Only initialize Sentry in production and when not in Docker
if (isProduction && !isDocker) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288",
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_BUILD_ID,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Configure for Docker compatibility
    transport: isDocker ? undefined : undefined, // Use default transport
    integrations: [
      // Add any additional integrations here
    ],

    // Configure for better Docker compatibility
    beforeSend(event) {
      // Filter out events that might cause issues in Docker
      if (isDocker && event.exception) {
        // Skip certain types of errors in Docker
        return null;
      }
      return event;
    },
  });
} else {
  // No-op initialization for development and Docker environments
  Sentry.init({
    dsn: "",
    enabled: false,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_BUILD_ID,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  });
}
