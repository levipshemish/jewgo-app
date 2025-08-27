# reCAPTCHA Setup Guide

This guide covers the setup and configuration of Google reCAPTCHA v3 for the JewGo application.

## Overview

The application uses Google reCAPTCHA v3 for bot protection on authentication forms. reCAPTCHA v3 runs in the background and provides a score based on user interactions, making it invisible to users.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Google reCAPTCHA v3 Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key-here
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key-here
```

### Setting Up reCAPTCHA Keys

1. **Go to the Google reCAPTCHA Admin Console**: https://www.google.com/recaptcha/admin
2. **Create a new site**:
   - Choose "reCAPTCHA v3"
   - Add your domain(s) to the domain list
   - Accept the terms of service
3. **Copy the keys**:
   - Site Key: Use this as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - Secret Key: Use this as `RECAPTCHA_SECRET_KEY`

## Implementation Details

### Frontend Implementation

The reCAPTCHA implementation is located in `frontend/app/auth/signin/page.tsx` and includes:

- **Script Loading**: Uses Next.js `Script` component with `afterInteractive` strategy
- **Ready State Tracking**: Monitors when reCAPTCHA is fully loaded and ready
- **Error Handling**: Graceful fallback if reCAPTCHA fails to load or execute
- **Timeout Protection**: 5-second timeout to prevent hanging

### Key Features

1. **Automatic Loading**: reCAPTCHA script loads automatically when site key is configured
2. **Ready State Detection**: Polls for reCAPTCHA readiness with 10-second timeout
3. **Graceful Degradation**: Continues without reCAPTCHA if loading fails
4. **Proper Error Handling**: Catches and logs errors without breaking the sign-in flow

### Server-Side Verification

The server-side verification is handled in `frontend/lib/utils/recaptcha.ts`:

- Verifies tokens with Google's API
- Supports configurable score thresholds
- Handles missing configuration gracefully
- Provides detailed error reporting

## Troubleshooting

### Common Issues

1. **"Uncaught (in promise) null" errors**:
   - **Cause**: reCAPTCHA script not fully loaded when form is submitted
   - **Solution**: The recent fixes include proper ready state tracking and timeout handling

2. **reCAPTCHA not loading**:
   - Check if `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set correctly
   - Verify the domain is added to reCAPTCHA admin console
   - Check browser console for script loading errors

3. **Verification failures**:
   - Ensure `RECAPTCHA_SECRET_KEY` is set correctly
   - Check server logs for verification errors
   - Verify the action name matches between frontend and backend

### Debug Mode

Enable debug logging by setting:

```bash
NEXT_PUBLIC_DEBUG_RECAPTCHA=true
```

This will log reCAPTCHA loading and execution details to the browser console.

## Recent Fixes (Latest Update)

### Issues Resolved

1. **Script Loading Timing**: Fixed race condition between script loading and form submission
2. **Promise Handling**: Improved error handling for reCAPTCHA execution
3. **Ready State Management**: Added proper detection of when reCAPTCHA is fully initialized
4. **Timeout Protection**: Added 5-second timeout to prevent hanging requests

### Technical Changes

- Changed script loading strategy from `beforeInteractive` to `afterInteractive`
- Added `isRecaptchaReady` state tracking with polling mechanism
- Implemented proper `grecaptcha.ready()` usage before execution
- Enhanced error handling with try-catch blocks and logging
- Added graceful fallback when reCAPTCHA fails

### Code Example

```typescript
// Improved reCAPTCHA execution
const token = await new Promise<string>((resolve, reject) => {
  (window as any).grecaptcha.ready(async () => {
    try {
      const result = await (window as any).grecaptcha.execute(siteKey, { action: 'login' });
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
});
```

## Security Considerations

1. **Never expose the secret key** in client-side code
2. **Use appropriate score thresholds** (default: 0.5)
3. **Monitor verification failures** for potential abuse
4. **Keep keys secure** and rotate them periodically

## Testing

### Development Testing

- reCAPTCHA is disabled in development if keys are not configured
- Use test keys from Google reCAPTCHA admin console for development
- Monitor browser console for loading and execution logs

### Production Testing

- Test with real keys on staging environment
- Verify score thresholds are appropriate for your use case
- Monitor error rates and adjust configuration as needed

## Monitoring

The application includes comprehensive logging for reCAPTCHA operations:

- Script loading success/failure
- Token generation success/failure
- Server-side verification results
- Error details for debugging

Check the application logs for reCAPTCHA-related entries to monitor performance and troubleshoot issues.
