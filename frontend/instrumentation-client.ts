// Temporarily disable Sentry to fix Edge Runtime module conflicts
// import * as Sentry from "@sentry/nextjs";

// Sentry.init({
//   dsn: "https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288",

//   integrations: [
//     Sentry.replayIntegration({
//       // Mask All Text
//       maskAllText: true,
//       // Block All Media
//       blockAllMedia: true,
//     }),
//   ],

//   // Session Replay
//   replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
//   replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  
//   // Performance Monitoring
//   tracesSampleRate: 1.0,
  
//   // Enable logs
//   _experiments: {
//     enableLogs: true,
//   },
  
//   // Environment
//   environment: process.env.NODE_ENV || "development",
  
//   // Debug mode in development - only enable in development mode
//   debug: process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
// });

// Export the required hook for router transition tracking
// export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Temporary placeholder
export const onRouterTransitionStart = () => {};
