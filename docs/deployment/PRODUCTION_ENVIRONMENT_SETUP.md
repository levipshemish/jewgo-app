# Production Environment Setup Guide

## Overview

This guide provides step-by-step instructions for configuring all environment variables required for the anonymous authentication system in production.

## 🔧 Environment Variables Configuration

### Frontend (Vercel) Environment Variables

Navigate to your Vercel project dashboard → Settings → Environment Variables

#### **Required Variables**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# Cron Job Security
CRON_SECRET=your-secure-cron-secret-here

# HMAC Keys for Cookie Signing
MERGE_COOKIE_HMAC_KEY_CURRENT=your-current-hmac-key
MERGE_COOKIE_HMAC_KEY_PREVIOUS=your-previous-hmac-key

# Feature Flags
CLEANUP_DRY_RUN=false
```

#### **Optional Variables**

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=admin@yourdomain.com
```

### Backend (Render) Environment Variables

Navigate to your Render service dashboard → Environment

#### **Required Variables**

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Supabase Configuration (for RLS policies)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Security Tokens
ADMIN_TOKEN=your-secure-admin-token
SCRAPER_TOKEN=your-secure-scraper-token

# Google APIs
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🔐 Security Key Generation

### Generate HMAC Keys

```bash
# Generate current HMAC key (32 bytes)
openssl rand -hex 32

# Generate previous HMAC key (32 bytes)
openssl rand -hex 32
```

### Generate Cron Secret

```bash
# Generate secure cron secret
openssl rand -hex 32
```

### Generate Admin/Scraper Tokens

```bash
# Generate admin token
openssl rand -hex 32

# Generate scraper token
openssl rand -hex 32
```

## 📊 Environment Validation

### Frontend Validation Script

Create a validation script to check all required variables:

```typescript
// scripts/validate-production-env.ts
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CRON_SECRET',
  'MERGE_COOKIE_HMAC_KEY_CURRENT'
];

export function validateProductionEnv() {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ All required environment variables are set');
}
```

### Backend Validation Script

```python
# backend/scripts/validate_env.py
import os

required_vars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ADMIN_TOKEN',
    'SCRAPER_TOKEN'
]

def validate_env():
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    print("✅ All required environment variables are set")

if __name__ == "__main__":
    validate_env()
```

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Generate all security keys and tokens
- [ ] Set up Supabase project with proper configuration
- [ ] Configure Upstash Redis for rate limiting
- [ ] Set up Sentry project for monitoring
- [ ] Configure Google APIs (Places, Maps)

### Frontend (Vercel)

- [ ] Add all environment variables to Vercel dashboard
- [ ] Configure custom domain (if applicable)
- [ ] Set up Vercel cron job configuration
- [ ] Enable Sentry integration

### Backend (Render)

- [ ] Add all environment variables to Render dashboard
- [ ] Configure custom domain (if applicable)
- [ ] Set up health check endpoint
- [ ] Configure auto-scaling settings

### Database

- [ ] Apply RLS policies migration
- [ ] Verify database connectivity
- [ ] Test RLS policies with anonymous users
- [ ] Set up database monitoring

## 🔍 Testing Environment Variables

### Test Frontend Configuration

```bash
# Test Supabase connection
curl -X POST https://your-domain.vercel.app/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-domain.vercel.app"

# Test rate limiting
curl -X GET https://your-domain.vercel.app/api/health-check
```

### Test Backend Configuration

```bash
# Test database connection
curl https://your-backend.onrender.com/health

# Test admin endpoints
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-backend.onrender.com/api/admin/status
```

### Test Cron Job

```bash
# Test cleanup endpoint (dry run)
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'
```

## 🛡️ Security Best Practices

### Environment Variable Security

1. **Never commit secrets to version control**
2. **Use different keys for each environment**
3. **Rotate keys regularly**
4. **Use least privilege principle**
5. **Monitor for unauthorized access**

### Key Rotation Schedule

- **HMAC Keys**: Every 6 months
- **Admin/Scraper Tokens**: Every 3 months
- **Cron Secret**: Every 12 months
- **API Keys**: As needed

### Monitoring

- Set up alerts for missing environment variables
- Monitor for unauthorized access attempts
- Track rate limiting violations
- Monitor cron job execution

## 📝 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check Vercel/Render dashboard
   - Verify variable names match exactly
   - Ensure no extra spaces or quotes

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check SSL requirements
   - Test connection from backend

3. **Rate Limiting Not Working**
   - Verify Upstash Redis configuration
   - Check UPSTASH_REDIS_REST_URL format
   - Test Redis connection

4. **Cron Job Not Running**
   - Verify CRON_SECRET is set
   - Check Vercel cron configuration
   - Monitor cron job logs

### Debug Commands

```bash
# Check environment variables in Vercel
vercel env ls

# Check environment variables in Render
# Use Render dashboard or API

# Test Supabase connection
curl -X GET https://your-project.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Test Redis connection
curl -X GET "https://your-redis-url.upstash.io/get/test" \
  -H "Authorization: Bearer YOUR_REDIS_TOKEN"
```

## ✅ Success Criteria

Environment setup is complete when:

- [ ] All required variables are set in both frontend and backend
- [ ] Database migration has been applied successfully
- [ ] Vercel cron job is configured and running
- [ ] All security keys are generated and configured
- [ ] Monitoring and alerting are set up
- [ ] All tests pass in production environment

## 📞 Support

If you encounter issues during setup:

1. Check the troubleshooting section above
2. Review Vercel and Render documentation
3. Check Supabase and Upstash documentation
4. Contact support if needed

---

**Next Steps**: After completing environment setup, proceed to apply the database migration for RLS policies.
