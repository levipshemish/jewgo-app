# reCAPTCHA v3 Setup Guide

This guide explains how to set up Google reCAPTCHA v3 for enhanced security in the JewGo application.

## Overview

reCAPTCHA v3 runs in the background and provides a score based on user interactions, helping protect against bots and automated attacks without requiring user interaction.

## Setup Steps

### 1. Create reCAPTCHA v3 Keys

1. Go to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" to add a new site
3. Choose **reCAPTCHA v3** as the reCAPTCHA type
4. Add your domains:
   - For development: `localhost`, `127.0.0.1`
   - For production: `jewgo.com`, `www.jewgo.com`, `app.jewgo.com`
5. Accept the terms and click "Submit"
6. Copy the **Site Key** and **Secret Key**

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# Google reCAPTCHA v3 Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key-here
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key-here
```

### 3. Implementation Details

#### Frontend (Client-Side)
- **Sign-in Page**: `frontend/app/auth/signin/page.tsx`
- **Sign-up Page**: `frontend/app/auth/signup/page.tsx`
- **Actions**: `login`, `signup`

#### Backend (Server-Side)
- **Validation**: `frontend/lib/utils/recaptcha.ts`
- **Server Actions**: `frontend/app/auth/signin/actions.ts`
- **Threshold**: 0.5 (configurable)

### 4. How It Works

1. **User Action**: User submits sign-in/sign-up form
2. **reCAPTCHA Execution**: Frontend executes reCAPTCHA v3 with appropriate action
3. **Token Generation**: Google returns a token based on user behavior
4. **Server Validation**: Backend verifies token with Google's API
5. **Score Check**: Server checks if score meets minimum threshold (0.5)
6. **Action Verification**: Server verifies action matches expected action

### 5. Configuration Options

#### Score Threshold
- **Default**: 0.5
- **Range**: 0.0 (bot-like) to 1.0 (human-like)
- **Recommendation**: 0.5 for most use cases

#### Actions
- **login**: Used for sign-in attempts
- **signup**: Used for account creation

### 6. Development vs Production

#### Development
- reCAPTCHA is optional if keys are not configured
- Graceful fallback allows development without keys
- Console logs show reCAPTCHA status

#### Production
- reCAPTCHA validation is enforced
- Missing keys will cause authentication failures
- Proper error handling for failed validation

### 7. Testing

#### Local Testing
1. Set up reCAPTCHA keys with `localhost` domain
2. Test sign-in and sign-up flows
3. Check browser console for reCAPTCHA logs
4. Verify server-side validation

#### Production Testing
1. Deploy with proper reCAPTCHA keys
2. Test from different IP addresses
3. Monitor reCAPTCHA scores in Google Console
4. Verify security improvements

### 8. Troubleshooting

#### Common Issues

**reCAPTCHA not loading**
- Check if `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
- Verify domain is added to reCAPTCHA console
- Check browser console for errors

**Validation failures**
- Verify `RECAPTCHA_SECRET_KEY` is correct
- Check server logs for validation errors
- Ensure score threshold is appropriate

**Development issues**
- reCAPTCHA is optional in development
- Check console logs for configuration status
- Verify environment variables are loaded

### 9. Security Benefits

- **Bot Protection**: Prevents automated attacks
- **Rate Limiting**: Complements existing rate limiting
- **User Experience**: Invisible to legitimate users
- **Adaptive**: Learns from user behavior patterns

### 10. Monitoring

#### Google reCAPTCHA Console
- Monitor score distributions
- Track validation success rates
- Identify potential threats

#### Application Logs
- Check reCAPTCHA validation results
- Monitor authentication success rates
- Track security incidents

## Support

For issues with reCAPTCHA setup or configuration, refer to:
- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- Application logs and console output
