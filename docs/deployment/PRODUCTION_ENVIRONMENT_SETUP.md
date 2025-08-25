# Production Environment Setup Guide

## Critical Issue: Missing Environment Variables

The production environment is currently missing critical environment variables that are causing the anonymous authentication endpoint to return 503 Service Unavailable errors.

## Required Vercel Secrets

The following secrets need to be configured in Vercel for the application to function properly:

### Authentication & Security
```bash
# HMAC keys for cookie signing (32+ characters each)
vercel secrets add merge-cookie-hmac-key-current "your-32-character-hmac-key-here"
vercel secrets add merge-cookie-hmac-key-previous "your-32-character-hmac-key-here"

# Cleanup cron secret
vercel secrets add cleanup-cron-secret "your-cleanup-secret-here"
```

### Redis Configuration
```bash
# Redis URL for rate limiting
vercel secrets add redis-url "redis://default:password@redis-host:port"
```



### Google Services
```bash
# Google Maps API key
vercel secrets add google-maps-api-key "your-google-maps-api-key"
vercel secrets add google-maps-map-id "your-google-maps-map-id"

# Google Analytics
vercel secrets add ga-measurement-id "your-ga-measurement-id"
```

### Application Configuration
```bash
# Admin email
vercel secrets add admin-email "admin@jewgo.com"
```

## Current Status

- ✅ Supabase configuration: Configured
- ❌ HMAC keys: Missing (causing 503 errors)
- ❌ Redis configuration: Missing (rate limiting broken)

- ❌ Google services: Missing (maps broken)
- ❌ Admin configuration: Missing

## Immediate Action Required

1. **Set HMAC keys** (highest priority - fixes 503 errors)
2. **Set Redis URL** (required for rate limiting)

4. **Set other configuration** (for full functionality)

## Testing After Setup

After setting the secrets, test the anonymous authentication:

```bash
curl -X POST https://jewgo-app.vercel.app/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response: 200 OK with user session

## Troubleshooting

If you continue to see 503 errors after setting the secrets:

1. Check Vercel deployment logs
2. Verify secrets are properly set: `vercel secrets ls`
3. Redeploy the application: `vercel --prod`

## Security Notes

- HMAC keys should be cryptographically secure random strings
- Never commit secrets to version control
- Rotate keys periodically
- Use different keys for staging and production
