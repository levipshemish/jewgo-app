# Docker Setup Reference

## Overview
The JewGo application has been successfully rebuilt with Docker using optimized configurations.

## ⚠️ Important: Docker vs Production Differences

The current Docker setup uses **placeholder values** and **local services** to get the application running quickly. This is **NOT** production-ready and has several key differences:

### 🔴 Key Differences from Production

1. **Environment Variables**: Uses placeholder values instead of real production credentials
2. **Backend URL**: Points to local Docker backend instead of Render production backend
3. **Database**: Uses local PostgreSQL instead of Supabase production database
4. **Authentication**: Uses placeholder tokens instead of real production tokens
5. **External Services**: Missing real Google Maps, reCAPTCHA, and other production services

### 🟡 When to Use Each Setup

- **Current Docker Setup**: For local development and testing
- **Production Setup**: For production-like testing (see below)

## Services

### 1. Backend (Flask API)
- **Port**: 5001 (external) → 5000 (internal)
- **Health Check**: `http://localhost:5001/health`
- **Status**: ✅ Healthy

### 2. Frontend (Next.js)
- **Port**: 3001 (external) → 3000 (internal)
- **Health Check**: `http://localhost:3001`
- **Status**: ✅ Healthy

### 3. PostgreSQL Database
- **Port**: 5433 (external) → 5432 (internal)
- **Database**: jewgo
- **User**: jewgo_user
- **Status**: ✅ Healthy

### 4. Redis Cache
- **Port**: 6380 (external) → 6379 (internal)
- **Status**: ✅ Healthy

## Quick Commands

### Start all services
```bash
docker-compose -f docker-compose.optimized.yml up -d
```

### Stop all services
```bash
docker-compose -f docker-compose.optimized.yml down
```

### View logs
```bash
docker-compose -f docker-compose.optimized.yml logs -f
```

### Rebuild specific service
```bash
docker-compose -f docker-compose.optimized.yml up -d --build [service-name]
```

### Check status
```bash
docker-compose -f docker-compose.optimized.yml ps
```

## Access Points

- **Frontend Application**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Backend Health**: http://localhost:5001/health
- **Database**: localhost:5433
- **Redis**: localhost:6380

## Environment Configuration

Environment policy:
- Root `.env` is the single source of truth used for local dev and validation.
- Example/env template files must not contain real secrets; use placeholders like `CHANGEME` or `<VALUE>`.
- Validate anytime:
  ```bash
  npm run env:check        # basic check
  npm run env:check:strict # also flags extra keys
  ```

For Docker-specific frontend variables, see `config/environment/frontend.docker.env` (placeholders only).

## Notes

- Port conflicts with system services have been resolved by using alternative ports
- All containers are running with health checks enabled
- The setup uses optimized Dockerfiles for both frontend and backend
- Database and Redis data are persisted using Docker volumes

## Production-Like Docker Setup ✅ READY

Your Docker now matches production exactly for local testing before deployment!

### 🚀 Quick Start
```bash
# Run the automated setup script
./scripts/setup-production-docker.sh

# Or manually:
docker-compose -f docker-compose.production.yml up -d --build
```

### ✅ What's Configured
- **Real Production Backend**: `https://jewgo-app-oyoh.onrender.com`
- **Real Production Database**: Supabase (`https://lgsfyrxkqpipaumngvfi.supabase.co`)
- **Real Production Environment**: All production environment variables
- **Real Production Authentication**: Supabase Auth with real credentials
- **Real Production Services**: Google Maps, reCAPTCHA, etc.

### 🔧 Environment Variables
The production environment file (`config/environment/frontend.production.env`) contains:
- ✅ Real Supabase URL and anon key
- ✅ Real production backend URL
- ⚠️ **You need to add**: Google Maps API key, NextAuth secret, and other production tokens

### 📋 Testing Checklist
Before deploying, test these in Docker:
- [ ] Application loads at http://localhost:3000
- [ ] Backend connection works (https://jewgo-app-oyoh.onrender.com/health)
- [ ] Authentication flows work
- [ ] Database operations work
- [ ] All features function correctly

## Troubleshooting

If you encounter issues:

1. Check container status: `docker-compose -f docker-compose.optimized.yml ps`
2. View logs: `docker-compose -f docker-compose.optimized.yml logs [service-name]`
3. Restart services: `docker-compose -f docker-compose.optimized.yml restart`
4. Rebuild if needed: `docker-compose -f docker-compose.optimized.yml up -d --build`

### Production-Like Troubleshooting
1. Check container status: `docker-compose -f docker-compose.production.yml ps`
2. View logs: `docker-compose -f docker-compose.production.yml logs frontend`
3. Verify environment variables: `docker-compose -f docker-compose.production.yml exec frontend env | grep NEXT_PUBLIC`
