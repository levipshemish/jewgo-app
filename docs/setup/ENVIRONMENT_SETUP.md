# Environment Setup Guide

## Current Configuration Status

### ✅ Configured and Working

#### Backend (.env)
- **Google Places API**: ✅ Configured
- **Google Maps API**: ✅ Configured  
- **Cloudinary**: ✅ Configured
- **Database (Neon)**: ✅ Configured
- **Sentry**: ✅ Configured (DSN added)

#### Frontend (.env.local)
- **Supabase Authentication**: ✅ Configured (Primary auth system)
- **Google OAuth**: ✅ Configured (via Supabase)
- **Google Maps API**: ✅ Configured

### 🔧 Recently Updated

#### Authentication System
- ✅ **Migrated from NextAuth to Supabase-only authentication**
- ✅ **Removed NextAuth dependencies and configuration**
- ✅ **Updated all components to use Supabase authentication**
- ✅ **Maintained Google OAuth integration via Supabase**

#### Environment Configuration Files
- ✅ Created `backend/env.example` with comprehensive configuration
- ✅ Created `frontend/env.example` with comprehensive configuration
- ✅ Updated documentation with complete setup instructions

#### Sentry Integration
- ✅ Created `sentry.client.config.ts`
- ✅ Created `sentry.server.config.ts` 
- ✅ Created `sentry.edge.config.ts`
- ✅ Created `instrumentation.ts`
- ✅ Added Sentry DSN to backend config

## Quick Setup Instructions

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Copy the example environment file
cp env.example .env

# Edit .env with your actual values
# Use the values from the "Current Values" section below
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Copy the example environment file
cp env.example .env.local

# Edit .env.local with your actual values
# Use the values from the "Current Values" section below
```

## Example Values (Replace With Your Own Secrets)

### Backend (.env)
```bash
# Flask Configuration
FLASK_ENV=development
FLASK_SECRET_KEY=your-secure-secret-here
FLASK_DEBUG=True

# Environment
ENVIRONMENT=development

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name?sslmode=require

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://jewgo.com,https://www.jewgo.com,https://app.jewgo.com

# Security Configuration
JWT_SECRET_KEY=your-jwt-secret-here
SECRET_KEY=your-app-secret-here

# Google APIs
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_KNOWLEDGE_GRAPH_API_KEY=your-google-knowledge-graph-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Sentry Configuration
SENTRY_DSN=your-sentry-dsn

# Logging Configuration
LOG_LEVEL=INFO

# Rate Limiting
RATELIMIT_DEFAULT=200 per day;50 per hour;10 per minute
RATELIMIT_STORAGE_URL=memory://

# Server Configuration
PORT=8081

# Security Tokens (Generate your own)
ADMIN_TOKEN=your-admin-token-here
SCRAPER_TOKEN=your-scraper-token-here

# Rate Limiting Configuration
SCRAPER_RATE_LIMIT_HOUR=100
ADMIN_RATE_LIMIT_HOUR=50
IP_RATE_LIMIT_HOUR=1000
TOKEN_RATE_LIMIT_HOUR=500

# Allowed IPs (comma-separated)
ALLOWED_IPS=127.0.0.1,::1

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Feature Flags
FEATURE_FLAGS={}
SPLIT_IO_API_KEY=your-split-io-api-key-here

# Monitoring (optional)
CRONITOR_API_KEY=your-cronitor-api-key-here
UPTIMEROBOT_API_KEY=your-uptimerobot-api-key-here

# API URLs
API_URL=https://jewgo.onrender.com
FRONTEND_URL=https://jewgo.com

# Test Database (for testing environment)
TEST_DATABASE_URL=sqlite:///:memory:

# Render Configuration
RENDER=false
```

### Frontend (.env.local)
```bash
# Supabase Configuration (Primary Authentication System)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database URL (for backend integration)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8081

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-google-maps-map-id

# reCAPTCHA v3 Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-google-analytics-measurement-id

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=admin@jewgo.com
ADMIN_TOKEN=your-admin-token-here
ADMIN_API_URL=https://jewgo.onrender.com
ADMIN_EMAIL=admin@jewgo.com

# Scraper Configuration
SCRAPER_TOKEN=your-scraper-token-here

# Environment
NODE_ENV=development

# Backend URL for API calls
BACKEND_URL=http://localhost:5000

# Feature Flags
NEXT_PUBLIC_FEATURE_FLAGS={}

# Sentry Configuration (optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here

# Analytics Configuration
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Development Configuration
ANALYZE=false

# Testing Configuration
NEXT_PUBLIC_ADMIN_TOKEN=test-admin-token

# Production URLs
# NEXT_PUBLIC_BACKEND_URL=https://jewgo.onrender.com
```

## 📋 TODO Items

#### 1. Google Analytics
**Status**: Not configured
**Action Required**: 
```bash
# Add to frontend/.env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_google_analytics_id
```

**Setup Steps**:
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property for your website
3. Get the Measurement ID (format: G-XXXXXXXXXX)
4. Add to environment variables

#### 2. Supabase Configuration
**Status**: Need to configure
**Action Required**:
```bash
# Add to frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Setup Steps**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Get the project URL and API keys
4. Configure Google OAuth in Supabase Auth settings
5. Add authorized redirect URIs for OAuth

#### 3. Security Tokens
**Status**: Need to generate
**Action Required**:
```bash
# Generate secure tokens for backend/.env
ADMIN_TOKEN=your-secure-admin-token
SCRAPER_TOKEN=your-secure-scraper-token
```

**Setup Steps**:
1. Generate secure random tokens
2. Use for admin and scraper authentication
3. Keep tokens secure and rotate regularly

#### 4. Cronitor Monitoring
**Status**: Not configured
**Action Required**:
```bash
# Add to backend/.env
CRONITOR_API_KEY=your_cronitor_api_key
```

**Setup Steps**:
1. Go to [Cronitor](https://cronitor.io/)
2. Create account and add monitors
3. Get API key
4. Add to environment variables

## Production Deployment

### Vercel (Frontend)
Add these environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Render (Backend)
Add these environment variables in Render dashboard:
- `SENTRY_DSN`
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `DATABASE_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_TOKEN`
- `SCRAPER_TOKEN`

## Testing Configuration

### Test Supabase Authentication Flow
1. Start the development server
2. Navigate to `/auth/supabase-signin`
3. Test email/password authentication
4. Test Google OAuth via Supabase
5. Test magic link authentication
6. Verify session management

### Test Sentry Integration
1. Check browser console for Sentry initialization
2. Trigger an error to verify error tracking
3. Check Sentry dashboard for events

### Test Google Maps
1. Navigate to any page with maps
2. Verify maps load correctly
3. Test place search functionality

## Authentication System

### Supabase Authentication Features
- **Email/Password Authentication**: ✅ Configured
- **Google OAuth Integration**: ✅ Configured via Supabase
- **Magic Link Authentication**: ✅ Configured
- **Session Management**: ✅ Auto-refresh tokens
- **Row Level Security (RLS)**: ✅ Configured
- **User Data Synchronization**: ✅ With Neon PostgreSQL

### Migration Status
- **NextAuth Removal**: ✅ Complete
- **Supabase Integration**: ✅ Complete
- **User Migration**: ✅ System in place
- **Cleanup Operations**: ✅ Ready to run

## Security Notes

⚠️ **Important**: The API keys shown in this document are for reference only. In production:
- Use environment-specific keys
- Rotate keys regularly
- Monitor API usage
- Set up proper rate limiting
- Use API key restrictions in Google Cloud Console
- Generate secure random tokens for ADMIN_TOKEN and SCRAPER_TOKEN
- Keep Supabase service role key secure (server-side only)

## Next Steps

1. **Complete Analytics Setup**: Configure Google Analytics
2. **Set up Supabase**: Configure Supabase project and OAuth
3. **Generate Security Tokens**: Create secure admin and scraper tokens
4. **Set up Monitoring**: Configure Cronitor for uptime monitoring
5. **Production Testing**: Test all integrations in production environment
6. **Security Review**: Audit API key permissions and usage
7. **Documentation**: Update API documentation with new endpoints
8. **Run Cleanup Operations**: Optimize database after migration 