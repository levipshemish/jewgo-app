# Production Environment Variables

## Required Environment Variables for Authentication System

### JWT Configuration
```bash
JWT_SECRET_KEY=your-secure-jwt-secret-key-here
JWT_ACCESS_EXPIRE_HOURS=0.25  # 15 minutes
JWT_REFRESH_EXPIRE_DAYS=30
```

### CORS Configuration
```bash
CORS_ORIGINS=https://jewgo.app,https://app.jewgo.app,https://staging.jewgo.app
```

### Cookie Configuration
```bash
COOKIE_DOMAIN=.jewgo.app  # for production
REFRESH_TTL_SECONDS=2592000  # 30 days
```

### CSRF Configuration
```bash
CSRF_SECRET_KEY=your-secure-csrf-secret-key-here
CSRF_TOKEN_TTL=3600  # 1 hour
CSRF_ENABLED=true
```

### Refresh Token Security
```bash
REFRESH_PEPPER=your-secure-refresh-pepper-here
```

### Database Configuration
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

### Redis Configuration
```bash
REDIS_URL=redis://host:port/db
```

### Environment
```bash
ENVIRONMENT=production
FLASK_ENV=production
```

## Security Notes

1. **JWT_SECRET_KEY**: Must be a strong, random secret key (at least 32 characters)
2. **CSRF_SECRET_KEY**: Must be different from JWT_SECRET_KEY
3. **REFRESH_PEPPER**: Must be a strong, random pepper for refresh token hashing
4. **COOKIE_DOMAIN**: Set to `.jewgo.app` for production to allow subdomain sharing

## Verification

After setting these environment variables, run the verification scripts:

```bash
# Backend verification
cd backend && python scripts/verify_auth_fix.py --url https://api.jewgo.app --report

# Frontend verification
cd frontend && node scripts/verify-auth.js --url https://api.jewgo.app --report
```

## Current Status

✅ **Working:**
- Auth health endpoint
- CSRF token generation
- Rate limiting (reasonable limits)
- CORS headers (basic functionality)

⚠️ **Needs Attention:**
- CORS headers missing `X-CSRF-Token` in allowed headers
- Origin mapping not working for `app.jewgo.app`
- Nginx CORS configuration may need server deployment
