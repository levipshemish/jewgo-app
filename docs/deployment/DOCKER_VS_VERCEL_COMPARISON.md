# Docker vs Vercel Environment Comparison

## Overview

This document explains the key differences between running the JewGo app in Docker versus Vercel, and how to ensure consistency between the two environments.

## Key Differences

### 1. Environment Detection

**Vercel Environment:**
```javascript
// Vercel sets these environment variables:
process.env.VERCEL = '1'
process.env.CI = 'true'
process.env.NODE_ENV = 'production'
```

**Docker Environment (Before Fix):**
```javascript
// Docker didn't set DOCKER flag, so it defaulted to:
process.env.NODE_ENV = 'production'
process.env.DOCKER = undefined // This caused issues
```

**Docker Environment (After Fix):**
```javascript
// Now Docker sets:
process.env.NODE_ENV = 'production'
process.env.CI = 'true'
process.env.DOCKER = 'true' // Added this flag
```

### 2. Build Process

**Vercel Build:**
```bash
# Vercel uses this build command:
npm run build
```

**Docker Build (Before Fix):**
```bash
# Docker was using:
npm run build:production
```

**Docker Build (After Fix):**
```bash
# Now Docker uses the same as Vercel:
npm run build
```

### 3. Webpack Configuration

**Vercel Optimizations:**
- Automatic code splitting
- Vendor chunk optimization
- Production optimizations enabled
- Strict environment variable validation

**Docker Optimizations (Before Fix):**
- Different fallback configurations
- Development-style optimizations
- Relaxed environment variable validation

**Docker Optimizations (After Fix):**
- Same webpack optimizations as Vercel
- Production-style optimizations
- Strict environment variable validation
- Docker-specific fallbacks only when needed

### 4. Environment Variables

**Vercel Environment Variables:**
```bash
NODE_ENV=production
CI=true
VERCEL=1
NEXT_PUBLIC_BACKEND_URL=https://jewgo-app-oyoh.onrender.com
# Plus all your custom environment variables
```

**Docker Environment Variables (After Fix):**
```bash
NODE_ENV=production
CI=true
DOCKER=true
NEXT_PUBLIC_BACKEND_URL=http://backend:5000
# Plus all your custom environment variables
```

## Configuration Files

### Docker Configuration

**docker-compose.simple.yml:**
```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DOCKER=true
      - NEXT_PUBLIC_BACKEND_URL=http://backend:5000
    ports:
      - "3000:3000"
```

**frontend/Dockerfile:**
```dockerfile
# Set production environment and Docker flag
ENV NODE_ENV=production
ENV CI=true
ENV DOCKER=true

# Build the application for production (matching Vercel build)
RUN npm run build

# Start the application
CMD ["npm", "start"]
```

### Vercel Configuration

**vercel.json:**
```json
{
  "version": 2,
  "name": "jewgo-app",
  "buildCommand": "cd frontend && npm install && npm run validate-env && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install",
  "framework": "nextjs"
}
```

## Environment Detection Logic

**Updated next.config.js:**
```javascript
// Improved environment detection
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1';
const isCI = process.env.CI === 'true' || isVercel || process.env.NODE_ENV === 'production';
const isProduction = process.env.NODE_ENV === 'production';

// Apply optimizations based on environment
if (isDocker) {
  // Docker-specific optimizations
}

if (isVercel) {
  // Vercel-specific optimizations
}
```

## Setup Instructions

### 1. Quick Setup with Docker

```bash
# Run the setup script
./scripts/docker-setup.sh
```

This script will:
- ✅ Check Docker is running
- ✅ Create environment files from examples
- ✅ Validate required environment variables
- ✅ Build Docker images
- ✅ Start all services
- ✅ Run health checks
- ✅ Verify everything is working

### 2. Manual Setup

```bash
# Build and start services
docker-compose -f docker-compose.simple.yml build
docker-compose -f docker-compose.simple.yml up -d

# Check status
docker-compose -f docker-compose.simple.yml ps

# View logs
docker-compose -f docker-compose.simple.yml logs -f
```

### 3. Environment Variables

Make sure your environment files are properly configured:

**frontend/.env.local:**
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_BACKEND_URL=http://backend:5000
# Add other required variables
```

**backend/.env:**
```bash
DATABASE_URL=postgresql://jewgo_user:jewgo_password@postgres:5432/jewgo
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
SECRET_KEY=your-secret-key
# Add other required variables
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   ```bash
   # Check if environment files exist
   ls -la frontend/.env.local
   ls -la backend/.env
   
   # Create from examples if missing
   cp frontend/env.example frontend/.env.local
   cp backend/env.example backend/.env
   ```

2. **Docker Not Running**
   ```bash
   # Check Docker status
   docker info
   
   # Start Docker if needed
   # (Start Docker Desktop or docker daemon)
   ```

3. **Port Conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :5000
   
   # Stop conflicting services
   # Or change ports in docker-compose.yml
   ```

4. **Build Failures**
   ```bash
   # View build logs
   docker-compose -f docker-compose.simple.yml build --no-cache
   
   # Check for missing dependencies
   cat frontend/package.json
   cat backend/requirements.txt
   ```

### Health Checks

```bash
# Check backend health
curl http://localhost:5000/health

# Check frontend
curl http://localhost:3000

# Check database
docker-compose -f docker-compose.simple.yml exec postgres psql -U jewgo_user -d jewgo -c "SELECT 1;"
```

## Performance Comparison

### Vercel Advantages
- ✅ Global CDN
- ✅ Automatic scaling
- ✅ Edge functions
- ✅ Built-in analytics
- ✅ Zero configuration

### Docker Advantages
- ✅ Full control over environment
- ✅ Local development
- ✅ Consistent across environments
- ✅ Custom optimizations
- ✅ Database included

## Best Practices

1. **Always use the setup script** for consistent environment
2. **Keep environment files in sync** between Docker and Vercel
3. **Test in Docker first** before deploying to Vercel
4. **Use the same build commands** in both environments
5. **Monitor logs** for any differences in behavior

## Conclusion

With the fixes applied, Docker should now run identically to Vercel in terms of:
- ✅ Build process
- ✅ Environment detection
- ✅ Webpack optimizations
- ✅ Environment variable handling
- ✅ Production optimizations

The main differences now are just the infrastructure (local vs cloud) and the backend URL (local vs remote).
