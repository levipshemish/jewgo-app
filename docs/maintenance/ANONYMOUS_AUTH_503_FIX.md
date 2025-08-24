# Anonymous Auth 503 Error Fix

## Issue Summary

**Date**: August 24, 2025  
**Status**: 🔴 CRITICAL - Production Outage  
**Impact**: Anonymous authentication completely broken  
**Error**: 503 Service Unavailable on `/api/auth/anonymous` endpoint

## Root Cause

The production environment was missing critical environment variables required for server initialization:

1. **HMAC Keys**: Missing `MERGE_COOKIE_HMAC_KEY_CURRENT` and `MERGE_COOKIE_HMAC_KEY_PREVIOUS`
2. **Redis Configuration**: Missing `REDIS_URL` for rate limiting
3. **Security Keys**: Missing `CLEANUP_CRON_SECRET` and other required secrets

## Error Flow

1. User attempts anonymous sign-in with valid Turnstile token
2. Frontend calls `/api/auth/anonymous` endpoint
3. Server initialization fails due to missing environment variables
4. Feature guard validation fails
5. Endpoint returns 503 Service Unavailable
6. User cannot authenticate

## Solution

### 1. Updated Vercel Configuration

Updated `frontend/vercel.json` to include all required environment variables:

```json
{
  "env": {
    "MERGE_COOKIE_HMAC_KEY_CURRENT": "@merge-cookie-hmac-key-current",
    "MERGE_COOKIE_HMAC_KEY_PREVIOUS": "@merge-cookie-hmac-key-previous",
    "CLEANUP_CRON_SECRET": "@cleanup-cron-secret",
    "REDIS_URL": "@redis-url",
    "TURNSTILE_SECRET_KEY": "@turnstile-secret-key",
    // ... other required variables
  }
}
```

### 2. Generated Required Secrets

Created `scripts/generate-production-secrets.sh` to generate secure secrets:

```bash
# HMAC Keys (32 bytes each)
vercel secrets add merge-cookie-hmac-key-current "d2cf90cf81fbbbf32851a8b5c5fac7943887171e365578b926aec8cb0d4e4291"
vercel secrets add merge-cookie-hmac-key-previous "abf376fd2d9ddab213c69397cbe59d07c9e1af9e1438ba97e38110456c5c3e46"

# Cleanup Cron Secret
vercel secrets add cleanup-cron-secret "72882b5a73bbc1388fe1672e2d9fd20077fbc334e8b5ffe50945917ff96c8bf3"

# Redis Configuration
vercel secrets add redis-url "redis://default:p4El96DKlpczWdIIkdelvNUC8JBRm83r@redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com:10768"
```

### 3. Created Deployment Guide

Updated `docs/deployment/PRODUCTION_ENVIRONMENT_SETUP.md` with:
- Complete list of required Vercel secrets
- Step-by-step setup instructions
- Testing procedures
- Troubleshooting guide

## Testing

### Before Fix
```bash
curl -X POST https://jewgo-app.vercel.app/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{"turnstileToken": "test-token"}'

# Response: 503 Service Unavailable
```

### After Fix (Expected)
```bash
curl -X POST https://jewgo-app.vercel.app/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{"turnstileToken": "test-token"}'

# Response: 200 OK with user session
```

## Implementation Steps

1. **Immediate** (Critical):
   - Add HMAC keys to Vercel secrets
   - Add Redis URL to Vercel secrets
   - Add cleanup cron secret to Vercel secrets

2. **High Priority**:
   - Add Turnstile configuration
   - Add Google services configuration
   - Add admin configuration

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## Prevention

### Environment Validation
- Added comprehensive environment validation in `frontend/lib/config/environment.ts`
- Server initialization fails fast with clear error messages
- Feature guard validates all required components at boot time

### Monitoring
- Added health check endpoints to detect configuration issues
- Implemented structured logging for server initialization failures
- Created deployment validation scripts

### Documentation
- Updated deployment guides with complete environment variable lists
- Created troubleshooting documentation
- Added security best practices for key management

## Status

- ✅ **Root Cause Identified**: Missing environment variables
- ✅ **Solution Created**: Updated Vercel configuration and generated secrets
- ✅ **Documentation Updated**: Complete deployment guide created
- ❌ **Implementation Pending**: Secrets need to be added to Vercel
- ❌ **Testing Pending**: Verify fix resolves 503 errors

## Next Steps

1. Add generated secrets to Vercel using the provided commands
2. Redeploy the application: `vercel --prod`
3. Test anonymous authentication functionality
4. Monitor for any remaining issues
5. Update monitoring and alerting for environment variable issues

## Related Files

- `frontend/vercel.json` - Updated with required environment variables
- `scripts/generate-production-secrets.sh` - Secret generation script
- `docs/deployment/PRODUCTION_ENVIRONMENT_SETUP.md` - Deployment guide
- `frontend/lib/config/environment.ts` - Environment validation
- `frontend/lib/server-init.ts` - Server initialization logic
