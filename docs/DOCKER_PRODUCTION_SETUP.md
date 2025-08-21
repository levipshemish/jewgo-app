# Production-Like Docker Setup Guide

## Overview

This guide helps you set up Docker to match production exactly for local testing before deployment. The production-like Docker setup uses:

- ✅ **Real production backend** (Render service)
- ✅ **Real production database** (Supabase)
- ✅ **Real production environment variables**
- ✅ **Real production authentication**
- ✅ **Real production external services**

## Quick Start

### 1. Run the Setup Script
```bash
./scripts/setup-production-docker.sh
```

### 2. Manual Setup (if script fails)

#### Step 1: Update Environment Variables
Edit `config/environment/frontend.production.env` and add your real production values:

```bash
# Required for build validation
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_real_google_maps_key
NEXTAUTH_SECRET=your_real_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Required for runtime
SUPABASE_SERVICE_ROLE_KEY=your_real_supabase_service_role_key
MERGE_COOKIE_HMAC_KEY_CURRENT=your_real_hmac_key

# Optional but recommended
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_real_map_id
ADMIN_TOKEN=your_real_admin_token
GOOGLE_CLIENT_ID=your_real_google_client_id
GOOGLE_CLIENT_SECRET=your_real_google_client_secret
```

#### Step 2: Start Production Docker
```bash
docker-compose -f docker-compose.production.yml up -d --build
```

#### Step 3: Verify Setup
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Test frontend
curl -f http://localhost:3000

# Test backend connection
curl -f https://jewgo-app-oyoh.onrender.com/health
```

## Environment Variables Reference

### Required Variables (from validation scripts)
| Variable | Description | Source |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Google Cloud Console |
| `NEXTAUTH_SECRET` | NextAuth secret key | Generate secure random string |
| `NEXTAUTH_URL` | NextAuth URL | `http://localhost:3000` for Docker |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ Already set |

### Runtime Variables
| Variable | Description | Source |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |
| `MERGE_COOKIE_HMAC_KEY_CURRENT` | Cookie HMAC key | Production environment |
| `ADMIN_TOKEN` | Admin authentication token | Production environment |

### Optional Variables
| Variable | Description | Source |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Google Maps Map ID | Google Cloud Console |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA site key | Google reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret key | Google reCAPTCHA |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID | Google Analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | Sentry dashboard |

## How to Get Production Values

### 1. Supabase Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the "service_role" key (not the anon key)

### 2. Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to APIs & Services > Credentials
4. Create or copy your Maps JavaScript API key

### 3. NextAuth Secret
Generate a secure random string:
```bash
openssl rand -base64 32
```

### 4. Other Production Values
- Check your Vercel environment variables
- Check your Render environment variables
- Check your production `.env` files

## Testing Checklist

Before deploying to production, test these features in Docker:

### ✅ Core Functionality
- [ ] Application loads without errors
- [ ] Navigation works correctly
- [ ] Search functionality works
- [ ] Restaurant listings display
- [ ] Restaurant details pages work

### ✅ Authentication
- [ ] Sign up works
- [ ] Sign in works
- [ ] Google OAuth works (if enabled)
- [ ] Protected routes work
- [ ] User profile works

### ✅ Database Operations
- [ ] Restaurant data loads from Supabase
- [ ] User data saves to Supabase
- [ ] Favorites work
- [ ] Reviews work

### ✅ External Services
- [ ] Google Maps displays correctly
- [ ] reCAPTCHA works (if enabled)
- [ ] Email functionality works
- [ ] Analytics tracking works

### ✅ API Integration
- [ ] Backend API calls work
- [ ] Health checks pass
- [ ] Error handling works
- [ ] Rate limiting works

## Troubleshooting

### Build Errors
```bash
# Check build logs
docker-compose -f docker-compose.production.yml logs frontend

# Rebuild with no cache
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

### Environment Variable Issues
```bash
# Check environment variables in container
docker-compose -f docker-compose.production.yml exec frontend env | grep NEXT_PUBLIC

# Validate environment
docker-compose -f docker-compose.production.yml exec frontend npm run validate-env
```

### Backend Connection Issues
```bash
# Test backend health
curl -f https://jewgo-app-oyoh.onrender.com/health

# Check CORS settings
curl -H "Origin: http://localhost:3000" https://jewgo-app-oyoh.onrender.com/health
```

### Database Connection Issues
```bash
# Test Supabase connection
curl -f https://lgsfyrxkqpipaumngvfi.supabase.co/rest/v1/

# Check environment variables
docker-compose -f docker-compose.production.yml exec frontend env | grep SUPABASE
```

## Production Deployment

Once Docker testing is complete:

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "Tested with production-like Docker setup"
   ```

2. **Push to trigger deployment**
   ```bash
   git push origin main
   ```

3. **Monitor deployment**
   - Check Vercel deployment logs
   - Check Render deployment logs
   - Run health checks on production

## Security Notes

- ⚠️ Never commit real production secrets to git
- ⚠️ Use environment variables for all sensitive data
- ⚠️ Rotate secrets regularly
- ⚠️ Monitor for security issues in production

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Docker and application logs
3. Verify environment variables are correct
4. Test individual services independently
