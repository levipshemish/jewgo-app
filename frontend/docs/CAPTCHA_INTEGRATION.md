# CAPTCHA Integration for Guest Sign-In

This document describes the CAPTCHA integration implemented for guest sign-in functionality using Cloudflare Turnstile.

## Overview

The CAPTCHA integration provides protection against automated attacks on the guest sign-in feature by requiring users to complete a security challenge after a certain number of attempts.

## Components

### 1. TurnstileWidget Component
- **Location**: `frontend/components/ui/TurnstileWidget.tsx`
- **Purpose**: Renders the Cloudflare Turnstile CAPTCHA widget
- **Features**:
  - Automatic script loading
  - Dark theme support
  - Error handling
  - Token management
  - Accessibility support

### 2. useCaptcha Hook
- **Location**: `frontend/hooks/useCaptcha.ts`
- **Purpose**: Manages CAPTCHA state and rate limiting
- **Features**:
  - Attempt tracking
  - Rate limit enforcement
  - Token management
  - Error handling
  - State reset functionality

### 3. Sign-In Integration
- **Location**: `frontend/app/auth/signin/page.tsx`
- **Purpose**: Integrates CAPTCHA into the guest sign-in flow
- **Features**:
  - Conditional CAPTCHA display
  - API integration with anonymous auth endpoint
  - Error handling and user feedback

## How It Works

### 1. Initial State
- Users can attempt guest sign-in without CAPTCHA initially
- Each attempt is tracked by the `useCaptcha` hook

### 2. Rate Limiting
- After 3 attempts (configurable), CAPTCHA becomes required
- The `onRateLimitExceeded` callback is triggered
- User sees a message indicating CAPTCHA is required

### 3. CAPTCHA Display
- TurnstileWidget is conditionally rendered when:
  - Rate limit is exceeded (`captchaState.isRequired`)
  - There's a CAPTCHA-related error
  - Server requires CAPTCHA verification

### 4. Verification Flow
1. User completes CAPTCHA challenge
2. TurnstileWidget calls `onVerify` with token
3. Token is stored in CAPTCHA state
4. Guest sign-in API call includes token
5. Server validates token with Cloudflare
6. User is authenticated or error is shown

### 5. Error Handling
- **TURNSTILE_REQUIRED**: Shows CAPTCHA widget
- **TURNSTILE_FAILED**: Resets CAPTCHA for retry
- **RATE_LIMITED**: Shows retry-after message
- **General errors**: Shows user-friendly messages

## Environment Variables

```env
# Turnstile Configuration
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key

# Fallback to reCAPTCHA (if needed)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```

## API Integration

The guest sign-in flow now calls the `/api/auth/anonymous` endpoint instead of Supabase directly:

```typescript
const response = await fetch('/api/auth/anonymous', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    turnstileToken: captchaState.token
  }),
});
```

## Testing

### Component Tests
- **Location**: `frontend/__tests__/components/TurnstileWidget.test.tsx`
- **Coverage**: Widget rendering, callbacks, error handling

### Hook Tests
- **Location**: `frontend/__tests__/hooks/useCaptcha.test.ts`
- **Coverage**: State management, rate limiting, token handling

### Manual Testing
- Visit `/test-turnstile` for manual CAPTCHA testing
- Test rate limiting by making multiple guest sign-in attempts
- Verify CAPTCHA appears after 3 attempts

## Security Features

1. **Rate Limiting**: Prevents abuse with attempt tracking
2. **Token Validation**: Server-side verification with Cloudflare
3. **CSRF Protection**: Built into the anonymous auth API
4. **IP Tracking**: Rate limiting based on IP address
5. **Error Handling**: Graceful degradation and user feedback

## Accessibility

- **WCAG 2.1 AA Compliant**: TurnstileWidget supports accessibility standards
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA attributes
- **High Contrast**: Dark theme support for better visibility

## Performance

- **Lazy Loading**: CAPTCHA script loads only when needed
- **Conditional Rendering**: Widget only renders when required
- **State Management**: Efficient state updates with React hooks
- **Error Recovery**: Graceful handling of network issues

## Troubleshooting

### Common Issues

1. **CAPTCHA not appearing**: Check environment variables and rate limit settings
2. **Verification failures**: Verify Turnstile site key and secret key
3. **Script loading errors**: Check network connectivity and CSP settings
4. **State synchronization**: Ensure proper error handling in sign-in flow

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify environment variables are set correctly
3. Test CAPTCHA functionality on `/test-turnstile` page
4. Check network requests to `/api/auth/anonymous` endpoint
5. Review server logs for CAPTCHA validation errors

## Future Enhancements

1. **Analytics Integration**: Track CAPTCHA completion rates
2. **A/B Testing**: Test different CAPTCHA providers
3. **Progressive Enhancement**: Fallback to simpler challenges
4. **Mobile Optimization**: Optimize for mobile devices
5. **Internationalization**: Support for multiple languages
