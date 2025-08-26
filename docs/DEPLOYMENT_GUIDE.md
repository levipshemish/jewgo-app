# Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Database Setup](#database-setup)
5. [Admin System Deployment](#admin-system-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)

## Overview

This guide covers the complete deployment process for the JewGo application, including the frontend (Next.js), backend (Flask), database (PostgreSQL), and admin system.

## Frontend Deployment (Vercel)

### Prerequisites

- Vercel account
- GitHub repository connected to Vercel
- Environment variables configured

### Deployment Steps

1. **Connect Repository**
   ```bash
   # Connect your GitHub repository to Vercel
   # Go to Vercel Dashboard > New Project > Import Git Repository
   ```

2. **Configure Build Settings**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "framework": "nextjs",
     "installCommand": "npm install",
     "devCommand": "npm run dev"
   }
   ```

3. **Set Environment Variables**
   ```bash
   # Required environment variables
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
   NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-map-id
   NEXT_PUBLIC_GA_MEASUREMENT_ID=your-ga-id
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=your-secret-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Deploy**
   ```bash
   # Deploy to production
   git push origin main
   ```

### Vercel Configuration

Create `vercel.json` in the frontend directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://lgsfyrxkqpipaumngvfi.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc2Z5cnhrcXBpcGF1bW5ndmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODcwMDgsImV4cCI6MjA3MTA2MzAwOH0.ppXAiXHEgEz1zOANin2HnGzznln4HZhVia-F6WX_P2c",
    "NEXT_PUBLIC_BACKEND_URL": "https://jewgo-app-oyoh.onrender.com",
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "AIzaSyCl7ryK-cp9EtGoYMJ960P1jZO-nnTCCqM",
    "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID": "5060e374c6d88aacf8fea324",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID": "G-CXXXXXXXXX",
    "DATABASE_URL": "postgresql://...",
    "NEXTAUTH_SECRET": "your-secret-key",
    "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
  }
}
```

## Backend Deployment (Render)

### Prerequisites

- Render account
- GitHub repository connected to Render
- Environment variables configured

### Deployment Steps

1. **Create Web Service**
   ```bash
   # Go to Render Dashboard > New > Web Service
   # Connect your GitHub repository
   ```

2. **Configure Service**
   ```bash
   # Build Command
   pip install -r requirements.txt
   
   # Start Command
   python wsgi.py
   
   # Environment
   Python 3.9+
   ```

3. **Set Environment Variables**
   ```bash
   # Required environment variables
   DATABASE_URL=postgresql://...
   FLASK_ENV=production
   SECRET_KEY=your-secret-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Deploy**
   ```bash
   # Deploy to production
   git push origin main
   ```

## Database Setup

### PostgreSQL Database

1. **Create Database**
   ```bash
   # Using Supabase or external PostgreSQL provider
   # Create new database instance
   ```

2. **Run Migrations**
   ```bash
   # Apply database schema
   cd backend
   python -m database.migrations.run_migrations
   ```

3. **Seed Data**
   ```bash
   # Add initial data if needed
   python -m database.seed_data
   ```

### Supabase Setup

1. **Create Project**
   ```bash
   # Go to Supabase Dashboard > New Project
   # Choose region and plan
   ```

2. **Configure Authentication**
   ```bash
   # Set up authentication providers
   # Configure OAuth settings
   ```

3. **Set Up Tables**
   ```sql
   -- Run SQL scripts to create tables
   -- See database/schema.sql for details
   ```

## Admin System Deployment

### Overview

The admin system requires specific configuration and environment variables to function properly in production. This section covers the complete admin system deployment process.

### Prerequisites

- Admin system code deployed to frontend
- Database with admin tables created
- Admin users configured
- Environment variables set

### Admin System Requirements

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-secret-key-min-32-chars
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend Configuration
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

#### Database Tables

The admin system requires these tables in Supabase:

```sql
-- Admin roles table
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin configuration table
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Admin System Deployment Steps

#### 1. Frontend Admin Deployment

1. **Verify Admin Code**
   ```bash
   # Check admin pages exist
   ls frontend/app/admin/
   ls frontend/app/api/admin/
   ```

2. **Build Admin System**
   ```bash
   cd frontend
   npm run build
   ```

3. **Deploy to Vercel**
   ```bash
   # Push changes to trigger deployment
   git add .
   git commit -m "Deploy admin system"
   git push origin main
   ```

#### 2. Admin User Setup

1. **Create Admin User**
   ```sql
   -- Insert admin role for existing user
   INSERT INTO admin_roles (user_id, role, permissions)
   VALUES (
     'user-uuid-from-supabase',
     'super_admin',
     '{"restaurant_manage": true, "user_manage": true, "review_moderate": true}'
   );
   ```

2. **Verify Admin Access**
   ```bash
   # Test admin login
   curl -X GET "https://your-domain.com/admin" \
        -H "Cookie: your-session-cookie"
   ```

#### 3. Admin API Routes

Ensure all admin API routes are deployed:

```bash
# Required admin API routes
frontend/app/api/admin/
├── csrf/route.ts           # CSRF token generation
├── restaurants/route.ts    # Restaurant management
├── reviews/route.ts        # Review moderation
├── synagogues/route.ts     # Synagogue management
└── users/route.ts          # User management
```

#### 4. Environment Validation

1. **Check Environment Variables**
   ```bash
   # Run environment check
   npm run env:check
   ```

2. **Test Admin Functionality**
   ```bash
   # Test admin dashboard
   curl -X GET "https://your-domain.com/admin"
   
   # Test CSRF token generation
   curl -X GET "https://your-domain.com/api/admin/csrf"
   ```

### Admin System Configuration

#### Vercel Configuration for Admin

Update `frontend/vercel.json` to include admin-specific settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://lgsfyrxkqpipaumngvfi.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc2Z5cnhrcXBpcGF1bW5ndmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODcwMDgsImV4cCI6MjA3MTA2MzAwOH0.ppXAiXHEgEz1zOANin2HnGzznln4HZhVia-F6WX_P2c",
    "NEXT_PUBLIC_BACKEND_URL": "https://jewgo-app-oyoh.onrender.com",
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "AIzaSyCl7ryK-cp9EtGoYMJ960P1jZO-nnTCCqM",
    "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID": "5060e374c6d88aacf8fea324",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID": "G-CXXXXXXXXX",
    "DATABASE_URL": "postgresql://...",
    "NEXTAUTH_SECRET": "your-secret-key",
    "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
  }
}
```

#### Next.js Configuration for Admin

Update `frontend/next.config.js` for admin system compatibility:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack build worker to prevent admin build issues
  webpackBuildWorker: false,
  
  // External packages for server components
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Image optimization
  images: {
    domains: ['your-domain.com'],
  },
  
  // Redirects for admin
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
```

### Admin System Testing

#### Pre-Deployment Testing

1. **Local Testing**
   ```bash
   # Test admin system locally
   cd frontend
   npm run dev
   
   # Visit http://localhost:3000/admin
   # Test all admin functionality
   ```

2. **Build Testing**
   ```bash
   # Test admin build
   npm run build
   
   # Check for build errors
   npm run type-check
   ```

3. **Environment Testing**
   ```bash
   # Test environment configuration
   npm run env:check
   ```

#### Post-Deployment Testing

1. **Admin Dashboard Test**
   ```bash
   # Test admin dashboard loads
   curl -X GET "https://your-domain.com/admin"
   ```

2. **CSRF Token Test**
   ```bash
   # Test CSRF token generation
   curl -X GET "https://your-domain.com/api/admin/csrf"
   ```

3. **Admin API Tests**
   ```bash
   # Test admin API endpoints
   curl -X GET "https://your-domain.com/api/admin/users"
   curl -X GET "https://your-domain.com/api/admin/restaurants"
   curl -X GET "https://your-domain.com/api/admin/reviews"
   curl -X GET "https://your-domain.com/api/admin/synagogues"
   ```

### Admin System Monitoring

#### Health Checks

1. **Admin System Health**
   ```bash
   # Check admin system status
   curl -X GET "https://your-domain.com/api/admin/health"
   ```

2. **Database Connectivity**
   ```bash
   # Test database connection
   curl -X GET "https://your-domain.com/api/admin/db-status"
   ```

3. **Authentication Status**
   ```bash
   # Test admin authentication
   curl -X GET "https://your-domain.com/api/admin/auth-status"
   ```

#### Logging and Monitoring

1. **Admin Action Logging**
   ```sql
   -- Monitor admin actions
   SELECT * FROM audit_logs 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Error Monitoring**
   ```bash
   # Check for admin errors in logs
   tail -f /var/log/admin-errors.log
   ```

## Environment Configuration

### Environment Variables Checklist

#### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_BACKEND_URL`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

#### Backend (Render)
- [ ] `DATABASE_URL`
- [ ] `FLASK_ENV`
- [ ] `SECRET_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Environment Validation

```bash
# Validate environment configuration
npm run env:check

# Check for missing variables
npm run env:validate
```

## Monitoring & Health Checks

### Health Check Endpoints

1. **Frontend Health**
   ```bash
   curl -X GET "https://your-domain.com/healthz"
   ```

2. **Backend Health**
   ```bash
   curl -X GET "https://your-backend.onrender.com/health"
   ```

3. **Database Health**
   ```bash
   curl -X GET "https://your-backend.onrender.com/health/db"
   ```

### Monitoring Setup

1. **Error Monitoring**
   - Set up Sentry for error tracking
   - Configure error alerts
   - Monitor performance metrics

2. **Uptime Monitoring**
   - Set up uptime monitoring
   - Configure alert notifications
   - Monitor response times

3. **Database Monitoring**
   - Monitor database performance
   - Set up query alerts
   - Track connection usage

## Troubleshooting

### Common Deployment Issues

#### Frontend Deployment Issues

1. **Build Failures**
   ```bash
   # Clear build cache
   rm -rf .next
   npm run build
   ```

2. **Environment Variable Issues**
   ```bash
   # Check environment variables
   npm run env:check
   ```

3. **Admin System Issues**
   ```bash
   # Check admin configuration
   npm run admin:check
   ```

#### Backend Deployment Issues

1. **Startup Failures**
   ```bash
   # Check logs
   tail -f /var/log/app.log
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   python -c "from database.connection import test_connection; test_connection()"
   ```

#### Admin System Issues

1. **500 Internal Server Error**
   ```bash
   # Check admin logs
   tail -f /var/log/admin.log
   
   # Verify CSRF route
   curl -X GET "https://your-domain.com/api/admin/csrf"
   ```

2. **Authentication Issues**
   ```bash
   # Check admin user setup
   psql $DATABASE_URL -c "SELECT * FROM admin_roles;"
   ```

3. **Database Query Issues**
   ```bash
   # Test database queries
   npm run db:test
   ```

### Emergency Procedures

#### Rollback Deployment

```bash
# Rollback to previous version
git revert HEAD
git push origin main
```

#### Database Recovery

```bash
# Restore from backup
pg_restore -d $DATABASE_URL backup.sql
```

#### Admin System Recovery

```bash
# Reset admin configuration
npm run admin:reset

# Recreate admin users
npm run admin:setup
```

---

**Last Updated**: January 2025  
**Version**: 2.0.0 
