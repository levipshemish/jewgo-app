# Supabase Setup Guide

## Basic Configuration

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the API settings
3. Add them to your environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Apple Sign-In Configuration

### Apple Developer Console Setup

1. **Create App ID with Sign in with Apple capability:**
   - Go to [Apple Developer Console](https://developer.apple.com/account/)
   - Navigate to Certificates, Identifiers & Profiles
   - Create a new App ID or edit existing one
   - Enable "Sign In with Apple" capability
   - Save the App ID

2. **Create Services ID (Client ID):**
   - In Apple Developer Console, go to Identifiers
   - Create a new Services ID
   - Configure the Services ID with your domain
   - Add redirect URLs: `https://yourdomain.com/auth/callback`
   - Save the Services ID (this is your Client ID)

3. **Generate Secret Key and Client Secret JWT:**
   - In Apple Developer Console, go to Keys
   - Create a new key with "Sign In with Apple" enabled
   - Download the key file (.p8)
   - Generate a JWT client secret using the key

### Supabase Configuration

1. **Enable Apple OAuth in Supabase Dashboard:**
   - Go to Authentication > Providers
   - Enable Apple provider
   - Enter your Services ID (Client ID) from Apple
   - Enter your client secret JWT
   - Add redirect URLs: `https://yourdomain.com/auth/callback`

2. **Configure Redirect URLs:**
   - Add to Apple's Services ID configuration
   - Add to Supabase's Apple provider allowlist
   - Must match exactly: `https://yourdomain.com/auth/callback`

### Environment Variables

Add these to your environment configuration:

```bash
# Apple OAuth Feature Flags
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
APPLE_OAUTH_ENABLED=true

# Analytics HMAC Secret for PII-safe logging
ANALYTICS_HMAC_SECRET=your_analytics_hmac_secret_here
```

**Important:** Apple OAuth credentials are configured server-side in Supabase dashboard only. Do NOT add Apple credentials as client-side environment variables.

## Identity Mapping and Linking

### Using Supabase's Official APIs

The implementation uses Supabase's official link identity APIs instead of direct `auth.identities` queries:

- **Session-based detection:** Uses `session.user.identities` when exposed by Supabase
- **Link attempt errors:** Relies on link attempt errors for conflict detection
- **Official APIs:** Uses `supabase.auth.admin.linkUser()` for identity linking

### Identity Linking Strategies

1. **Proactive Linking (Account Settings):**
   - User initiates linking from account settings
   - Uses dedicated link API while user is authenticated
   - Provides clear feedback on success/failure

2. **Reactive Conflict Resolution:**
   - Detects conflicts during OAuth callback
   - Requires re-authentication with primary method
   - Prevents account takeover attacks
   - Never auto-merges accounts

### Private Relay Email Handling

- Private relay emails (`@privaterelay.appleid.com`) are treated as first-class citizens
- No blocking of sign-in for relay emails
- Proper handling in user profile and analytics

## Security Implementation

### Redirect Validation

The implementation includes corrected redirect validation:

- **Exact root handling:** Treats "/" as exact root only
- **Prefix validation:** Allows prefixes only for `/app`, `/dashboard`, `/profile`, `/settings`
- **Query param filtering:** Preserves only safe params (`tab`, `utm_*`)
- **Security checks:** Rejects protocol-relative URLs, fragments, and dangerous patterns
- **Length limits:** Enforces max length of 2048 characters

### Server-Side Security

1. **Route Handler Requirements:**
   - Uses Node.js runtime for reliable session management
   - Implements `export const runtime = 'nodejs'`
   - Uses `export const dynamic = 'force-dynamic'`
   - Sets `export const revalidate = 0`

2. **Feature Flag Enforcement:**
   - Client-side flag: `NEXT_PUBLIC_APPLE_OAUTH_ENABLED`
   - Server-side flag: `APPLE_OAUTH_ENABLED`
   - Route handler checks server-side flag before processing

3. **HMAC Analytics:**
   - Server-side HMAC-SHA256 for stable, non-reversible user identification
   - PII-safe logging for OAuth events
   - Configurable via `ANALYTICS_HMAC_SECRET`

## Database Schema

### Profiles Table Migration

Run the migration to add Apple OAuth support:

```sql
-- See: frontend/lib/migrations/20240101000000_apple_oauth_profiles.sql
```

Key features:
- **Race-safe name persistence:** Uses `COALESCE(NULLIF(TRIM(name), ''), EXCLUDED.name)`
- **Unique constraints:** Prevents race conditions during concurrent first-logins
- **RLS policies:** Ensures users can only modify their own profiles
- **Provider metadata:** Stores provider-specific information

### Race-Safe Name Persistence

The implementation handles Apple's name data correctly:

- **First consent:** Apple provides name + email
- **Subsequent logins:** Apple may hide name or use relay email
- **Atomic operations:** Uses UPSERT with proper empty string handling
- **First non-blank wins:** Prevents race conditions in concurrent first-logins

## Apple Human Interface Guidelines Compliance

### Button Requirements

- **Semantic HTML:** Uses actual `<button>` element
- **Minimum height:** 44px minimum height
- **Apple-approved text:** "Sign in with Apple" exclusively
- **Brand colors:** Black background (#000000), white text
- **Corner radius:** 6px default (parameterizable)
- **Prominence:** Positioned above or equal to other OAuth buttons

### Localization

- **Apple-approved strings:** Uses exact Apple translations
- **i18n support:** Centralized in `frontend/lib/i18n/apple-strings.ts`
- **Fallback handling:** Falls back to English for unsupported locales
- **Tree-shaking:** Import per locale to avoid bundling all languages

## Feature Flag Strategy

### Rollout Control

1. **Environment gating:** dev → staging → prod
2. **Kill switch:** Rollback without code deployment
3. **Client/server enforcement:** Both client and server-side checks
4. **Gradual rollout:** Percentage-based enablement

### Configuration

```bash
# Development
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
APPLE_OAUTH_ENABLED=true

# Staging
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
APPLE_OAUTH_ENABLED=true

# Production (initially disabled)
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=false
APPLE_OAUTH_ENABLED=false
```

## HTTPS Requirements

- **Production:** HTTPS required for non-localhost environments
- **Development:** HTTP allowed for localhost
- **Apple requirements:** Apple Sign-In requires HTTPS in production

## Testing Checklist

### Security Testing

- [ ] Redirect validation prevents open redirects
- [ ] Query parameter filtering blocks malicious params
- [ ] Feature flags work correctly in all environments
- [ ] Identity linking prevents account takeover
- [ ] Private relay emails handled correctly
- [ ] Race conditions in name persistence resolved

### OAuth Flow Testing

- [ ] First-time Apple sign-in with name data
- [ ] Subsequent Apple sign-ins without name
- [ ] Error handling for all Apple OAuth errors
- [ ] Redirect handling with various URL patterns
- [ ] Session management and cookie handling
- [ ] Identity linking conflict resolution

### UI/UX Testing

- [ ] Apple button meets HIG requirements
- [ ] Button ordering (Apple above Google)
- [ ] Accessibility features (keyboard, screen readers)
- [ ] Loading states and error messages
- [ ] Mobile responsiveness
- [ ] Localization for supported languages

### Performance Testing

- [ ] OAuth callback response times
- [ ] Database query performance
- [ ] Memory usage during concurrent logins
- [ ] Bundle size impact of new components

## Troubleshooting

### Common Issues

1. **Redirect URL Mismatch:**
   - Ensure URLs match exactly in Apple and Supabase
   - Check for trailing slashes and protocol differences

2. **Feature Flag Issues:**
   - Verify both client and server flags are set
   - Check environment variable loading

3. **Identity Linking Conflicts:**
   - Review link attempt error handling
   - Check Supabase's official API documentation

4. **Name Persistence Issues:**
   - Verify database migration ran successfully
   - Check RLS policies for profile updates

### Debug Information

Enable debug logging in development:

```bash
NODE_ENV=development
```

Check Supabase logs for OAuth events and errors.

## Production Deployment

1. **Environment Setup:**
   - Configure production environment variables
   - Set up HTTPS certificates
   - Configure Apple Services ID for production domain

2. **Database Migration:**
   - Run the Apple OAuth migration
   - Verify RLS policies are active
   - Test profile table constraints

3. **Feature Rollout:**
   - Start with feature flags disabled
   - Enable for internal testing
   - Gradual rollout to production users
   - Monitor error rates and performance

4. **Monitoring:**
   - Set up alerts for OAuth errors
   - Monitor identity linking conflicts
   - Track Apple Sign-In adoption rates
   - Monitor performance metrics
