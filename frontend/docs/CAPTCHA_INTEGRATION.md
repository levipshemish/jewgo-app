# Turnstile Integration for Guest Sign-In

This document describes the Turnstile integration implemented for guest sign-in functionality using Cloudflare Turnstile.

## Overview

The Turnstile integration provides protection against automated attacks on the guest sign-in feature by requiring users to complete a security challenge for all guest sign-in attempts.

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
- **Purpose**: Manages Turnstile state and rate limiting
- **Features**:
  - Attempt tracking
  - Rate limit enforcement
  - Token management
  - Error handling
  - State reset functionality

### 3. Sign-In Integration
- **Location**: `frontend/app/auth/signin/page.tsx`
- **Purpose**: Integrates Turnstile into the guest sign-in flow
- **Features**:
  - Always required Turnstile display
  - API integration with anonymous auth endpoint
  - Error handling and user feedback

## How It Works

### 1. Always Required
- Turnstile is **always required** for guest sign-in attempts per Supabase rules
- Users must complete Turnstile verification before proceeding
- Server validates every Turnstile token with Cloudflare before allowing sign-in

### 2. Rate Limiting
- Rate limiting provides additional protection against abuse
- The `onRateLimitExceeded` callback is triggered for enhanced protection
- Server-side rate limiting provides additional security layer

### 3. Turnstile Display
- TurnstileWidget is **always displayed** for guest sign-in
- Shows immediately when user visits the sign-in page
- Provides clear instructions to complete security check

### 4. Verification Flow
1. User visits sign-in page and sees Turnstile immediately
2. User completes Turnstile challenge
3. TurnstileWidget calls `onVerify` with token
4. Token is stored in Turnstile state
5. User clicks "Continue as Guest" button
6. Guest sign-in API call includes Turnstile token
7. Server **always** validates token with Cloudflare before proceeding
8. If validation fails, user must retry the challenge
9. If validation succeeds, user is authenticated

### 5. Error Handling
- **TURNSTILE_REQUIRED**: Shows Turnstile widget
- **TURNSTILE_FAILED**: Resets Turnstile for retry
- **RATE_LIMITED**: Shows retry-after message
- **General errors**: Shows user-friendly messages

## Environment Variables

```env
# Turnstile Configuration
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
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
- Visit sign-in page and verify CAPTCHA always appears for guest sign-in
- Test rate limiting by making multiple guest sign-in attempts
- Verify CAPTCHA token is required for successful guest authentication

## Security Features

1. **Always Required**: Turnstile verification required for **every** guest sign-in attempt
2. **Server Validation**: Every token is validated with Cloudflare before authentication
3. **No Bypasses**: No development or configuration bypasses - security is enforced
4. **Rate Limiting**: Prevents abuse with attempt tracking
5. **CSRF Protection**: Built into the anonymous auth API
6. **IP Tracking**: Rate limiting based on IP address
7. **Error Handling**: Graceful degradation and user feedback

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

1. **Turnstile not appearing**: Check environment variables (Turnstile should always appear now)
2. **Verification failures**: Verify Turnstile site key and secret key
3. **Script loading errors**: Check network connectivity and CSP settings
4. **State synchronization**: Ensure proper error handling in sign-in flow
5. **Guest sign-in blocked**: Ensure Turnstile is completed before attempting sign-in

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify environment variables are set correctly
3. Test Turnstile functionality on `/test-turnstile` page
4. Check network requests to `/api/auth/anonymous` endpoint
5. Review server logs for Turnstile validation errors

## Future Enhancements

1. **Analytics Integration**: Track Turnstile completion rates
2. **A/B Testing**: Test different Turnstile configurations
3. **Progressive Enhancement**: Fallback to simpler challenges
4. **Mobile Optimization**: Optimize for mobile devices
5. **Internationalization**: Support for multiple languages
