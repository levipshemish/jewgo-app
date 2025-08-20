# Docker-Vercel Build Alignment

This document explains the changes made to align Docker builds with Vercel builds for consistent behavior across environments.

## Changes Made

### 1. Updated Production Dockerfile (`frontend/Dockerfile`)

**Key Changes:**
- Added `ENV NODE_ENV=production` and `ENV CI=true`
- Added `npm run validate-env` step (matching Vercel build)
- Changed to `npm run build:production` (production-optimized build)
- Changed to `npm run start:production` (production start command)

**Before:**
```dockerfile
RUN npm run build
CMD ["npm", "start"]
```

**After:**
```dockerfile
ENV NODE_ENV=production
ENV CI=true
RUN npm run validate-env
RUN npm run build:production
CMD ["npm", "start:production"]
```

### 2. Updated Docker Compose Files

**Production Environment (`docker-compose.frontend.yml`):**
- Changed `NODE_ENV=development` to `NODE_ENV=production`
- Added `CI=true`
- Added production environment variables (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)

**New Production-Specific File (`docker-compose.frontend.prod.yml`):**
- Exact match to Vercel's build environment
- Includes all required production environment variables
- Sets `VERCEL=1` for Next.js configuration

### 3. Updated Development Dockerfile (`frontend/Dockerfile.dev`)

**Changes:**
- Added environment validation (non-blocking in development)
- Explicit `NODE_ENV=development` setting
- Maintains development workflow while adding validation

### 4. New Build Script (`scripts/docker-build-vercel-match.sh`)

**Purpose:** Exact replication of Vercel's build process
- Sets production environment variables
- Follows vercel.json buildCommand exactly
- Includes environment validation
- Provides detailed build logging

## Usage Instructions

### For Production Builds (Matching Vercel)

**Option 1: Using Production Docker Compose**
```bash
# Use the production-specific compose file
docker-compose -f docker-compose.frontend.prod.yml up --build
```

**Option 2: Using the Vercel-Matched Build Script**
```bash
# Run the script that matches Vercel's build process
./scripts/docker-build-vercel-match.sh
```

**Option 3: Using Updated Main Dockerfile**
```bash
# Build using the updated Dockerfile (now production-ready)
docker build -t jewgo-frontend ./frontend
docker run -p 3000:3000 jewgo-frontend
```

### For Development Builds

**Using Development Docker Compose:**
```bash
# Use the development compose file
docker-compose -f docker-compose.frontend.dev.yml up --build
```

## Environment Variables Required

### Production (Matching Vercel)
```bash
NODE_ENV=production
CI=true
VERCEL=1
NEXTAUTH_SECRET=your-secret
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
NEXT_PUBLIC_BACKEND_URL=https://jewgo.onrender.com
NEXTAUTH_URL=https://jewgo-app.vercel.app
DATABASE_URL=your-database-url
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_TOKEN=your-admin-token
```

### Development
```bash
NODE_ENV=development
# Other variables as needed for development
```

## Build Process Comparison

### Vercel Build Process
1. `cd frontend`
2. `npm install`
3. `npm run validate-env`
4. `npm run build`

### Docker Build Process (Now Aligned)
1. `cd frontend`
2. `npm ci`
3. `npx prisma generate`
4. `npm run validate-env`
5. `npm run build:production`

## Key Differences Resolved

1. **Environment Variables:** Both now use `NODE_ENV=production`
2. **Build Validation:** Both now run `npm run validate-env`
3. **Build Scripts:** Both use production-optimized build commands
4. **Linting/Type Checking:** Both use strict production settings
5. **Environment Configuration:** Both use the same environment variable set

## Troubleshooting

### Build Failures
If Docker builds fail while Vercel succeeds:
1. Check that all required environment variables are set
2. Ensure `npm run validate-env` passes
3. Verify Prisma client generation succeeds
4. Check for any platform-specific dependencies

### Environment Variable Issues
```bash
# Test environment validation locally
cd frontend
npm run validate-env
```

### Performance Differences
If Docker builds are slower:
1. Use multi-stage builds for optimization
2. Leverage Docker layer caching
3. Consider using `.dockerignore` to exclude unnecessary files

## Monitoring and Validation

### Build Consistency Check
```bash
# Compare build outputs
./scripts/docker-build-vercel-match.sh
# vs
# Vercel build logs
```

### Health Checks
Both Docker and Vercel deployments include health checks:
- Docker: `curl -f http://localhost:3000/api/health`
- Vercel: Automatic health monitoring

## Next Steps

1. Test the new configurations in a staging environment
2. Monitor build times and success rates
3. Update CI/CD pipelines to use the new build scripts
4. Document any additional environment-specific requirements
