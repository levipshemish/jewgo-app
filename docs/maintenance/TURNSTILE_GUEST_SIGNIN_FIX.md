# Turnstile Guest Sign-In Fix

## Problem Summary

Guest sign-in was failing due to missing Turnstile configuration. The console logs showed:

```
Turnstile script loaded successfully
Rendering Turnstile widget...
Turnstile render config: Object
Final render params: Object
Turnstile widget rendered with ID: cf-chl-widget-5fust
```

But the widget couldn't generate valid tokens because the environment variables were not configured.

## Root Cause

- **Missing Environment Variables**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` were not set
- **Widget Rendering Failure**: Turnstile widget tried to render with undefined site key
- **Authentication Block**: Anonymous auth API requires valid Turnstile token, but none could be generated

## Solution Implemented

### 1. Graceful Error Handling

Modified `TurnstileWidget.tsx` to handle missing site keys gracefully:

```typescript
// Handle missing site key gracefully
if (!turnstileSiteKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('Turnstile site key not configured. Guest sign-in will be disabled.');
    return (
      <div className={`text-yellow-500 text-sm ${className}`}>
        ⚠️ Turnstile not configured - Guest sign-in disabled
      </div>
    );
  } else {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Turnstile site key not configured
      </div>
    );
  }
}
```

### 2. Conditional UI Rendering

Updated sign-in page to:
- Disable guest sign-in button when Turnstile is not configured
- Show warning message instead of broken widget
- Handle missing configuration in the sign-in logic

### 3. Setup Script

Created `scripts/setup-turnstile.sh` to help configure Turnstile:

```bash
./scripts/setup-turnstile.sh
```

## Required Configuration

Add these environment variables to your `.env` file:

```bash
# Turnstile Configuration (Required for Guest Sign-In)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key-here
TURNSTILE_SECRET_KEY=your-turnstile-secret-key-here
NEXT_PUBLIC_FEATURE_FLAGS={"ANONYMOUS_AUTH":true}
```

## Getting Turnstile Keys

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Create a new site key with these settings:
   - **Type**: Managed
   - **Domains**: Add your domain (e.g., `jewgo.app`, `localhost` for development)
   - **Widget Mode**: Invisible
3. Copy the **Site Key** and **Secret Key**

## Testing

1. **Test Turnstile Widget**: Visit `/test-turnstile` page
2. **Test Guest Sign-In**: Visit `/auth/signin` and try "Continue as Guest"
3. **Check Console**: Look for Turnstile-related errors in browser console

## Files Modified

- `frontend/components/ui/TurnstileWidget.tsx` - Added graceful error handling
- `frontend/app/auth/signin/page.tsx` - Added conditional rendering and error handling
- `scripts/setup-turnstile.sh` - Created setup script (new file)
- `docs/maintenance/TURNSTILE_GUEST_SIGNIN_FIX.md` - This documentation (new file)

## Performance Improvements

The fix also addresses performance issues:
- Prevents unnecessary Turnstile script loading when not configured
- Reduces console errors and warnings
- Provides clear user feedback instead of broken functionality

## Security Notes

- Turnstile is required for guest sign-in to prevent abuse
- Server-side verification ensures tokens are valid
- Rate limiting is still in place for additional protection
