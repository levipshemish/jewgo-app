# Docker Frontend Setup Guide

This guide covers setting up and running the JewGo frontend application using Docker.

## 🐳 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 22.x (for local development)
- pnpm package manager

### Environment Setup

Environment policy:
- Root `.env` is the source of truth for keys/values in dev.
- Frontend example files (e.g., `frontend/env.example`) must use placeholders only.
- Validate consistency anytime:
  ```bash
  npm run env:check        # basic check
  npm run env:check:strict # also flags extra keys
  ```

For local overrides you can still create `frontend/.env.local`, but do not commit real secrets in examples.

### Using the Setup Script

The easiest way to run the frontend is using the provided setup script:

```bash
# Development mode (with hot reloading) - connects to Render API
./scripts/docker-setup.sh dev

# Local development mode - connects to local backend
./scripts/docker-setup.sh local

# Production mode
./scripts/docker-setup.sh prod

# Stop containers
./scripts/docker-setup.sh stop

# Clean up Docker resources
./scripts/docker-setup.sh cleanup

# Show help
./scripts/docker-setup.sh help
```

## 🔧 Manual Docker Commands

### Development Mode (Render API)

```bash
# Build and run development container
docker-compose -f docker-compose.frontend.dev.yml up --build

# Run in background
docker-compose -f docker-compose.frontend.dev.yml up -d

# View logs
docker-compose -f docker-compose.frontend.dev.yml logs -f
```

### Local Development Mode (Local Backend)

```bash
# Build and run local development container
docker-compose -f docker-compose.frontend.local.yml up --build

# Run in background
docker-compose -f docker-compose.frontend.local.yml up -d

# View logs
docker-compose -f docker-compose.frontend.local.yml logs -f
```

### Production Mode

```bash
# Build and run production container
docker-compose -f docker-compose.frontend.prod.yml up --build

# Run in background
docker-compose -f docker-compose.frontend.prod.yml up -d

# View logs
docker-compose -f docker-compose.frontend.prod.yml logs -f
```

## 📁 File Structure

```
├── docker-compose.frontend.prod.yml     # Production Docker Compose
├── docker-compose.frontend.dev.yml      # Development Docker Compose (Render API)
├── docker-compose.frontend.local.yml    # Local Development Docker Compose
├── frontend/
│   ├── Dockerfile                       # Production Dockerfile
│   ├── Dockerfile.dev                   # Development Dockerfile
│   └── .env.local                       # Local environment variables
└── scripts/
    └── docker-setup.sh                  # Setup and management script
```

## 🔍 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` exists in the frontend directory
   - Check that environment variables are properly set in Docker Compose files
   - Verify Supabase credentials are correct

2. **Webpack Cache Warnings**
   - These are performance warnings, not errors
   - The configuration has been optimized to reduce these warnings
   - They don't affect functionality

3. **Port Already in Use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Kill the process or change the port in docker-compose files
   ```

4. **Build Failures**
   ```bash
   # Clean up and rebuild
   docker-compose down
   docker system prune -f
   docker-compose up --build
   ```

5. **Authentication Issues**
   - Check Supabase configuration in environment variables
   - Verify middleware configuration
   - Check browser console for errors

### Health Checks

The application includes health check endpoints:

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "0.1.1",
  "checks": {
    "database": "ok",
    "supabase": "configured",
    "googleMaps": "configured"
  }
}
```

## 🚀 Performance Optimizations

### Webpack Configuration
- Filesystem cache with compression
- Optimized package imports
- Build worker enabled
- Cache max age: 2 days

### Docker Optimizations
- Multi-stage builds for production
- Non-root user for security
- Health checks for monitoring
- Volume mounting for development hot reloading

## 🔒 Security Features

- Non-root user in containers
- Environment variable validation
- Security headers configuration
- Input sanitization
- CORS configuration

## 📊 Monitoring

### Health Checks
- Application health endpoint
- Docker health checks
- Environment validation

### Logging
- Structured logging with consistent levels
- Error tracking with Sentry
- Performance monitoring

## 🛠️ Development Workflow

1. **Start development environment:**
   ```bash
   ./scripts/docker-setup.sh dev
   ```

2. **Make code changes** (hot reloading enabled)

3. **Test changes** in browser at `http://localhost:3000`

4. **Stop development environment:**
   ```bash
   ./scripts/docker-setup.sh stop
   ```

5. **Deploy to production:**
   ```bash
   ./scripts/docker-setup.sh prod
   ```

## 📝 Environment Variables

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `DATABASE_URL` - PostgreSQL database URL

### Optional Variables
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` - Google Maps map ID
- `ADMIN_TOKEN` - Admin authentication token
- `NEXT_PUBLIC_ADMIN_EMAIL` - Admin email address

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
# Update package.json dependencies
cd frontend
pnpm update

# Rebuild containers
./scripts/docker-setup.sh dev
```

### Database Migrations
```bash
# Run Prisma migrations
docker-compose exec frontend pnpm prisma migrate deploy
```

### Cache Management
```bash
# Clear Next.js cache
docker-compose exec frontend pnpm clean

# Clear Docker cache
./scripts/docker-setup.sh cleanup
```

## 📞 Support

For issues related to:
- **Docker setup**: Check this guide and troubleshooting section
- **Environment variables**: Verify `.env.local` configuration
- **Build errors**: Check logs and clean rebuild
- **Authentication**: Verify Supabase configuration

## 🎯 Best Practices

1. **Always use the setup script** for consistency
2. **Keep environment variables secure** and never commit them
3. **Use development mode** for local development
4. **Monitor health checks** for production deployments
5. **Regular cleanup** of Docker resources
6. **Test in production mode** before deployment
