# Docker Hub Workflow Guide

## 🚀 Overview

This guide explains how to use the Docker Hub workflow script to build, tag, and push Docker images to Docker Hub, functioning like your GitHub workflow with proper versioning and CI/CD integration.

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Hub account (username: `mml555`)
- Git repository with proper versioning
- Docker Hub authentication (`docker login`)

## 🎯 Quick Start

### Basic Usage

```bash
# Build and push all images with latest tag
npm run docker:deploy

# Build and push with commit-based tagging
npm run docker:deploy all --tag commit

# Build and push with custom tag
npm run docker:deploy all --custom-tag v1.2.3
```

### Direct Script Usage

```bash
# Build and push all images
./scripts/docker-hub-workflow.sh build-and-push all

# Build frontend only with commit tag
./scripts/docker-hub-workflow.sh build-and-push frontend --tag commit

# Push backend with custom tag
./scripts/docker-hub-workflow.sh push backend --custom-tag v1.0.0
```

## 🏗️ Image Structure

The workflow creates two separate images:

- **Frontend**: `mml555/jewgo-frontend:tag`
- **Backend**: `mml555/jewgo-backend:tag`

This separation allows for:
- Independent deployment of frontend and backend
- Better resource management
- Easier debugging and maintenance
- Scalability options

## 🏷️ Tagging Strategies

### Available Tag Types

| Tag Type | Description | Example |
|----------|-------------|---------|
| `latest` | Latest stable version | `mml555/jewgo-frontend:latest` |
| `commit` | Git commit hash | `mml555/jewgo-frontend:commit-a1b2c3d` |
| `tag` | Git tag version | `mml555/jewgo-frontend:v1.2.3` |
| `branch` | Branch name | `mml555/jewgo-frontend:main` |
| `timestamp` | Build timestamp | `mml555/jewgo-frontend:build-20241201-143022` |
| `custom` | Custom tag | `mml555/jewgo-frontend:v1.2.3-beta` |

### Tag Selection Examples

```bash
# Use latest git tag
./scripts/docker-hub-workflow.sh build-and-push all --tag tag

# Use current commit hash
./scripts/docker-hub-workflow.sh build-and-push all --tag commit

# Use branch name (sanitized)
./scripts/docker-hub-workflow.sh build-and-push all --tag branch

# Use build timestamp
./scripts/docker-hub-workflow.sh build-and-push all --tag timestamp

# Use custom tag
./scripts/docker-hub-workflow.sh build-and-push all --custom-tag v1.2.3-beta
```

## 📦 Available Commands

### Build Commands

```bash
# Build all images
npm run docker:build all

# Build frontend only
npm run docker:build frontend

# Build backend only
npm run docker:build backend

# Build with specific tag
npm run docker:build all --tag commit
```

### Push Commands

```bash
# Push all images
npm run docker:push all

# Push frontend only
npm run docker:push frontend

# Push with specific tag
npm run docker:push all --tag latest
```

### Combined Commands

```bash
# Build and push all images
npm run docker:deploy all

# Build and push with tests
npm run docker:deploy all --tag commit

# Build and push without tests
npm run docker:deploy all --tag timestamp --skip-tests
```

### Management Commands

```bash
# List local images
npm run docker:list

# Clean up local images
npm run docker:clean

# Show build status
npm run docker:hub-status
```

## 🔧 Advanced Usage

### Using Different Dockerfiles

```bash
# Use optimized Dockerfile for frontend
./scripts/docker-hub-workflow.sh build frontend --dockerfile Dockerfile.optimized

# Use development Dockerfile for backend
./scripts/docker-hub-workflow.sh build backend --dockerfile Dockerfile.dev
```

### Skipping Tests

```bash
# Build and push without running tests
./scripts/docker-hub-workflow.sh build-and-push all --skip-tests
```

### Custom Tagging

```bash
# Use semantic versioning
./scripts/docker-hub-workflow.sh build-and-push all --custom-tag v1.2.3

# Use environment-specific tags
./scripts/docker-hub-workflow.sh build-and-push all --custom-tag staging-v1.2.3

# Use feature branch tags
./scripts/docker-hub-workflow.sh build-and-push all --custom-tag feature-auth-v1.2.3
```

## 🔄 CI/CD Integration

### GitHub Actions Integration

Add this to your `.github/workflows/docker-deploy.yml`:

```yaml
name: Docker Hub Deployment

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}
      
      - name: Build and Push Images
        run: |
          chmod +x scripts/docker-hub-workflow.sh
          ./scripts/docker-hub-workflow.sh build-and-push all --tag tag
```

### Automated Tagging

```bash
# Create and push a new version
git tag v1.2.3
git push origin v1.2.3

# This will trigger the GitHub Action to build and push with tag v1.2.3
```

## 🐳 Docker Compose Integration

### Production Deployment

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  frontend:
    image: mml555/jewgo-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  backend:
    image: mml555/jewgo-backend:latest
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
    restart: unless-stopped
```

### Development with Specific Tags

```yaml
version: '3.8'

services:
  frontend:
    image: mml555/jewgo-frontend:commit-a1b2c3d
    ports:
      - "3000:3000"

  backend:
    image: mml555/jewgo-backend:v1.2.3
    ports:
      - "5000:5000"
```

## 🔍 Monitoring and Debugging

### Check Build Status

```bash
# Show current status
npm run docker:hub-status

# Output includes:
# - Docker Hub authentication status
# - Git branch and commit information
# - Latest git tag
# - Docker running status
```

### List Local Images

```bash
# Show all local JewGo images
npm run docker:list

# Output shows:
# - Frontend images with tags
# - Backend images with tags
# - Image sizes and creation dates
```

### Clean Up

```bash
# Remove all local JewGo images
npm run docker:clean

# This frees up disk space and ensures fresh builds
```

## 🚨 Troubleshooting

### Common Issues

#### Docker Not Running
```bash
# Error: Docker is not running
# Solution: Start Docker Desktop
```

#### Docker Hub Authentication
```bash
# Error: Not logged into Docker Hub
# Solution: Run docker login
docker login
```

#### Build Failures
```bash
# Check build logs
docker logs <container_id>

# Rebuild with verbose output
./scripts/docker-hub-workflow.sh build all --dockerfile Dockerfile
```

#### Push Failures
```bash
# Check Docker Hub credentials
docker info | grep Username

# Re-authenticate if needed
docker logout
docker login
```

### Performance Optimization

#### Faster Builds
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Use layer caching
docker build --cache-from mml555/jewgo-frontend:latest
```

#### Disk Space Management
```bash
# Clean up unused images
docker system prune -a

# Remove specific images
npm run docker:clean
```

## 📊 Best Practices

### Versioning Strategy

1. **Use Semantic Versioning**: `v1.2.3`
2. **Tag Important Commits**: Use git tags for releases
3. **Keep Latest Updated**: Always push to `latest` tag
4. **Use Descriptive Tags**: Include environment or feature info

### Security

1. **Never Commit Secrets**: Use environment variables
2. **Use Non-Root Users**: Images run as non-root users
3. **Regular Updates**: Keep base images updated
4. **Scan Images**: Use Docker Scout for security scanning

### Performance

1. **Multi-Stage Builds**: Use optimized Dockerfiles
2. **Layer Caching**: Optimize Dockerfile order
3. **Image Size**: Keep images as small as possible
4. **Health Checks**: Include health checks in images

## 🎯 Workflow Examples

### Development Workflow

```bash
# 1. Make changes to code
git add .
git commit -m "Add new feature"

# 2. Build and test locally
npm run docker:deploy all --tag commit

# 3. Test the deployed images
docker run -p 3000:3000 mml555/jewgo-frontend:commit-abc123

# 4. If tests pass, create release
git tag v1.2.3
git push origin v1.2.3
```

### Production Deployment

```bash
# 1. Create production tag
git tag v1.2.3
git push origin v1.2.3

# 2. Build and push production images
./scripts/docker-hub-workflow.sh build-and-push all --tag tag

# 3. Deploy to production
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug

# 2. Fix the issue
# ... make changes ...

# 3. Build and test hotfix
./scripts/docker-hub-workflow.sh build-and-push all --custom-tag hotfix-v1.2.4

# 4. Deploy hotfix
docker run -p 3000:3000 mml555/jewgo-frontend:hotfix-v1.2.4

# 5. Create hotfix release
git tag v1.2.4
git push origin v1.2.4
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `npm run docker:hub-status` to verify setup
3. Check Docker Hub authentication: `docker info`
4. Review build logs for specific errors
5. Ensure Docker Desktop is running

## 🎉 Benefits

✅ **Automated Workflow** - One command to build and push
✅ **Version Control** - Git-based tagging and versioning
✅ **CI/CD Ready** - Integrates with GitHub Actions
✅ **Flexible Tagging** - Multiple tagging strategies
✅ **Error Handling** - Comprehensive error checking
✅ **Monitoring** - Built-in status and logging
✅ **Security** - Proper authentication and validation

---

**Happy deploying! 🚀**
