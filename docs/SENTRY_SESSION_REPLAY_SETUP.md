# Sentry Session Replay Setup for JewGo App

## Overview
This document outlines the successful setup of Sentry Session Replay for the JewGo application, which provides video-like reproductions of user sessions to help debug issues and understand user behavior.

## Configuration Completed

### 1. Package Installation
- **Package**: `@sentry/nextjs@10.5.0`
- **Status**: ✅ Already installed and up to date

### 2. Configuration Files Updated

#### `sentry.client.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288",

  integrations: [
    Sentry.replayIntegration({
      // Mask All Text
      maskAllText: true,
      // Block All Media
      blockAllMedia: true,
    }),
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% sample rate for production
  replaysOnErrorSampleRate: 1.0, // 100% sample rate for error sessions
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Enable logs
  _experiments: {
    enableLogs: true,
  },
  
  // Environment
  environment: process.env.NODE_ENV || "development",
  
  // Debug mode in development
  debug: process.env.NODE_ENV === "development",
});
```

#### `instrumentation.ts`
```typescript
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
```

### 3. Privacy and Security Settings
- **Text Masking**: ✅ Enabled (`maskAllText: true`)
- **Media Blocking**: ✅ Enabled (`blockAllMedia: true`)
- **Session Sampling**: 10% for normal sessions, 100% for error sessions

### 4. Testing Setup
- **Example Page**: Created at `/sentry-example-page`
- **API Route**: Created at `/api/sentry-example-api`
- **Global Error Handler**: Created at `app/global-error.tsx`

## Key Features Enabled

### Session Replay
- Captures user interactions and page changes
- Provides video-like reproduction of user sessions
- Helps identify UI/UX issues and user behavior patterns

### Privacy Protection
- All text content is masked to protect user privacy
- All media (images, videos) is blocked from recording
- Compliant with privacy regulations

### Error Tracking
- 100% of error sessions are captured
- Automatic error detection and reporting
- Performance monitoring enabled

### Performance Monitoring
- Request tracing enabled
- Performance metrics collection
- Application logs sent to Sentry

## Testing Instructions

### 1. Development Testing
1. Start the development server: `npm run dev`
2. Navigate to `/sentry-example-page`
3. Click "Throw Sample Error" button
4. Check Sentry dashboard for the error

### 2. Production Testing
1. Deploy to production environment
2. Monitor Sentry dashboard for session replays
3. Verify error tracking is working

## Configuration Options

### Sampling Rates
- **Development**: Consider setting `replaysSessionSampleRate: 1.0` for full testing
- **Production**: Current setting of `0.1` (10%) is appropriate for cost management

### Privacy Settings
- **Text Masking**: Protects sensitive user data
- **Media Blocking**: Prevents capture of images/videos
- **Custom Masking**: Can be configured for specific elements

## Monitoring and Maintenance

### Dashboard Access
- **Organization**: seller-optimization-llc
- **Project**: jewgo-app
- **URL**: https://seller-optimization-llc.sentry.io/issues/?project=4509798933004288

### Key Metrics to Monitor
- Session replay volume
- Error rates and types
- Performance metrics
- User interaction patterns

### Maintenance Tasks
- Regular review of privacy settings
- Monitor sampling rates and costs
- Update Sentry SDK as needed
- Review and act on error reports

## Troubleshooting

### Common Issues
1. **Session replays not appearing**: Check sampling rates and privacy settings
2. **Build errors**: Ensure all configuration files are properly set up
3. **Performance impact**: Monitor and adjust sampling rates as needed

### Debug Mode
- Enabled in development environment
- Provides detailed logging for troubleshooting
- Disabled in production for performance

## Security Considerations

### Data Protection
- All text content is automatically masked
- Media content is blocked from recording
- Sensitive form inputs are protected

### Compliance
- GDPR compliant with current privacy settings
- User consent should be obtained for session recording
- Regular privacy audits recommended

## Next Steps

1. **Testing**: Complete thorough testing in development environment
2. **Production Deployment**: Deploy and monitor in production
3. **User Notification**: Consider adding privacy notice about session recording
4. **Team Training**: Train team on using Sentry dashboard effectively
5. **Documentation**: Update team documentation with Sentry usage guidelines

## Support Resources

- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Session Replay Configuration](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/)
- [Privacy and Security](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/privacy/)

---

**Setup Completed**: ✅ December 2024  
**Configuration Version**: Sentry Next.js SDK 10.5.0  
**Privacy Level**: High (Text masked, Media blocked)  
**Sampling Rate**: 10% sessions, 100% errors
