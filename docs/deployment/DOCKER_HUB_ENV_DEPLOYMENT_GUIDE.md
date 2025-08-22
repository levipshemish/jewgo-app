# Docker Hub Deployment with .env Files Guide

## 🚀 Overview

This guide explains how to deploy your JewGo application to Docker Hub using environment files (`.env`) for different deployment environments. This approach allows you to maintain separate configurations for development, staging, and production environments.

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Hub account (username: `mml555`)
- Git repository with proper versioning
- Docker Hub authentication (`docker login`)
- Environment files configured

## 🎯 Quick Start

### Basic Usage with Environment Files

```bash
# Deploy with development environment
npm run docker:deploy-env all --env-type dev --tag commit

# Deploy with staging environment
npm run docker:deploy-env all --env-type staging --custom-tag v1.2.3

# Deploy with production environment
npm run docker:deploy-env all --env-type prod --tag latest
```

### Direct Script Usage

```bash
# Deploy with specific .env file
./scripts/docker-hub-deploy-with-env.sh deploy all --env .env.production --tag commit

# Deploy with environment type
./scripts/docker-hub-deploy-with-env.sh deploy frontend --env-type staging --custom-tag v1.2.3

# Validate environment file before deployment
./scripts/docker-hub-deploy-with-env.sh validate-env --env .env.production
```

## 🏗️ Environment File Structure

### Available Environment Files

| File | Purpose | Usage |
|------|---------|-------|
| `.env` | Default environment | `--env .env` or default |
| `.env.development` | Development environment | `--env-type dev` |
| `.env.staging` | Staging environment | `--env-type staging` |
| `.env.production` | Production environment | `--env-type prod` |

### Required Environment Variables

The script validates these required variables in your `.env` files:

- `DATABASE_URL` - Database connection string
- `FLASK_SECRET_KEY` - Flask secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## 📦 Available Commands

### Deployment Commands

```bash
# Deploy with environment configuration
npm run docker:deploy-env all --env-type prod --tag commit

# Deploy frontend only with staging env
npm run docker:deploy-env frontend --env-type staging --custom-tag v1.2.3

# Deploy backend only with production env
npm run docker:deploy-env backend --env-type prod --tag latest
```

### Build Commands

```bash
# Build with environment configuration
npm run docker:build-env all --env-type staging --tag commit

# Build frontend with specific .env file
npm run docker:build-env frontend --env .env.production --custom-tag v1.2.3
```

### Validation Commands

```bash
# Validate environment file
npm run docker:validate-env --env .env.production

# List available environment files
npm run docker:list-env

# Show deployment status
npm run docker:env-status
```

## 🔧 Environment Configuration

### Development Environment (`.env.development`)

```bash
# Example development configuration
FLASK_ENV=development
FLASK_DEBUG=True
DATABASE_URL=postgresql://dev_user:password@localhost:5432/jewgo_dev
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_anon_key
```

### Staging Environment (`.env.staging`)

```bash
# Example staging configuration
FLASK_ENV=staging
FLASK_DEBUG=False
DATABASE_URL=postgresql://staging_user:password@staging-db:5432/jewgo_staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_anon_key
```

### Production Environment (`.env.production`)

```bash
# Example production configuration
FLASK_ENV=production
FLASK_DEBUG=False
DATABASE_URL=postgresql://prod_user:password@prod-db:5432/jewgo_prod
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
```

## 🏷️ Tagging Strategies

### Environment-Specific Tagging

```bash
# Development with commit hash
npm run docker:deploy-env all --env-type dev --tag commit

# Staging with custom tag
npm run docker:deploy-env all --env-type staging --custom-tag staging-v1.2.3

# Production with git tag
npm run docker:deploy-env all --env-type prod --tag tag
```

### Tag Examples

| Command | Result |
|---------|--------|
| `--env-type dev --tag commit` | `mml555/jewgo-frontend:commit-abc123` |
| `--env-type staging --custom-tag v1.2.3` | `mml555/jewgo-frontend:v1.2.3` |
| `--env-type prod --tag latest` | `mml555/jewgo-frontend:latest` |

## 🔍 Validation and Testing

### Validate Environment Files

```bash
# Validate specific environment file
./scripts/docker-hub-deploy-with-env.sh validate-env --env .env.production

# Validate by environment type
./scripts/docker-hub-deploy-with-env.sh validate-env --env-type staging
```

### Dry Run Deployment

```bash
# Test deployment without actually building/pushing
./scripts/docker-hub-deploy-with-env.sh deploy all --env-type prod --tag commit --dry-run
```

### List Environment Files

```bash
# Show available environment files
./scripts/docker-hub-deploy-with-env.sh list-env
```

## 🚀 Deployment Workflows

### Development Workflow

```bash
# 1. Make changes to code
git add .
git commit -m "Add new feature"

# 2. Deploy to development environment
npm run docker:deploy-env all --env-type dev --tag commit

# 3. Test the deployed images
docker run -p 3000:3000 mml555/jewgo-frontend:commit-abc123
```

### Staging Workflow

```bash
# 1. Create staging branch
git checkout -b staging/new-feature

# 2. Deploy to staging environment
npm run docker:deploy-env all --env-type staging --custom-tag staging-v1.2.3

# 3. Test staging deployment
docker run -p 3000:3000 mml555/jewgo-frontend:staging-v1.2.3
```

### Production Workflow

```bash
# 1. Create production tag
git tag v1.2.3
git push origin v1.2.3

# 2. Deploy to production environment
npm run docker:deploy-env all --env-type prod --tag tag

# 3. Deploy to production infrastructure
docker run -p 3000:3000 mml555/jewgo-frontend:v1.2.3
```

## 🔄 CI/CD Integration

### GitHub Actions with Environment Files

Add this to your `.github/workflows/docker-deploy.yml`:

```yaml
name: Docker Hub Deployment with Environment Files

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
        - development
        - staging
        - production

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
      
      - name: Deploy with Environment Files
        run: |
          chmod +x scripts/docker-hub-deploy-with-env.sh
          ./scripts/docker-hub-deploy-with-env.sh deploy all \
            --env-type ${{ github.event.inputs.environment || 'staging' }} \
            --tag tag
```

### Environment-Specific Secrets

Store environment-specific secrets in GitHub:

```yaml
# Development secrets
DATABASE_URL_DEV: ${{ secrets.DATABASE_URL_DEV }}
SUPABASE_URL_DEV: ${{ secrets.SUPABASE_URL_DEV }}

# Staging secrets
DATABASE_URL_STAGING: ${{ secrets.DATABASE_URL_STAGING }}
SUPABASE_URL_STAGING: ${{ secrets.SUPABASE_URL_STAGING }}

# Production secrets
DATABASE_URL_PROD: ${{ secrets.DATABASE_URL_PROD }}
SUPABASE_URL_PROD: ${{ secrets.SUPABASE_URL_PROD }}
```

## 🐳 Docker Compose Integration

### Environment-Specific Docker Compose

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
    env_file:
      - .env.production
    restart: unless-stopped

  backend:
    image: mml555/jewgo-backend:latest
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
```

### Deploy with Docker Compose

```bash
# Deploy production images
npm run docker:deploy-env all --env-type prod --tag latest

# Run with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

## 🔍 Monitoring and Debugging

### Check Deployment Status

```bash
# Show comprehensive status
./scripts/docker-hub-deploy-with-env.sh status
```

### Validate Environment Files

```bash
# Validate all environment files
for env in .env .env.development .env.staging .env.production; do
  echo "Validating $env..."
  ./scripts/docker-hub-deploy-with-env.sh validate-env --env $env
done
```

### Debug Build Issues

```bash
# Build with verbose output
./scripts/docker-hub-deploy-with-env.sh build all --env-type prod --tag commit

# Check build logs
docker logs <container_id>
```

## 🚨 Troubleshooting

### Common Issues

#### Environment File Not Found
```bash
# Error: Environment file not found
# Solution: Create environment files
cp env.template .env.development
cp env.template .env.staging
cp env.template .env.production
```

#### Missing Required Variables
```bash
# Error: Missing required variables
# Solution: Update environment files with required variables
./scripts/docker-hub-deploy-with-env.sh validate-env --env .env.production
```

#### Docker Build Fails
```bash
# Error: Docker build fails
# Solution: Check environment file syntax and required variables
./scripts/docker-hub-deploy-with-env.sh build all --env-type prod --dry-run
```

### Performance Optimization

#### Faster Builds with Caching
```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Build with layer caching
docker build --cache-from mml555/jewgo-frontend:latest
```

#### Environment File Optimization
```bash
# Use .dockerignore to exclude unnecessary files
echo ".env.local" >> .dockerignore
echo ".env.*.local" >> .dockerignore
```

## 📊 Best Practices

### Environment File Management

1. **Never Commit Secrets**: Use `.gitignore` to exclude sensitive files
2. **Use Templates**: Keep `env.template` updated with all variables
3. **Validate Early**: Validate environment files before deployment
4. **Separate Concerns**: Use different files for different environments

### Security

1. **Rotate Secrets**: Regularly update API keys and passwords
2. **Use Secrets Management**: Store sensitive data in secure systems
3. **Limit Access**: Restrict access to production environment files
4. **Audit Regularly**: Review environment configurations periodically

### Deployment

1. **Test First**: Always test in staging before production
2. **Use Dry Runs**: Test deployments with `--dry-run` flag
3. **Monitor Deployments**: Check logs and health after deployment
4. **Rollback Plan**: Have a plan to rollback if issues occur

## 🎯 Workflow Examples

### Complete Development to Production Workflow

```bash
# 1. Development
npm run docker:deploy-env all --env-type dev --tag commit

# 2. Staging
npm run docker:deploy-env all --env-type staging --custom-tag staging-v1.2.3

# 3. Production
git tag v1.2.3
git push origin v1.2.3
npm run docker:deploy-env all --env-type prod --tag tag
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug

# 2. Fix the issue
# ... make changes ...

# 3. Deploy hotfix to staging
npm run docker:deploy-env all --env-type staging --custom-tag hotfix-v1.2.4

# 4. Test hotfix
docker run -p 3000:3000 mml555/jewgo-frontend:hotfix-v1.2.4

# 5. Deploy to production
git tag v1.2.4
git push origin v1.2.4
npm run docker:deploy-env all --env-type prod --tag tag
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `npm run docker:env-status` to verify setup
3. Validate environment files: `npm run docker:validate-env`
4. Check Docker Hub authentication: `docker info`
5. Review build logs for specific errors

## 🎉 Benefits

✅ **Environment Separation** - Different configs for different environments  
✅ **Security** - Sensitive data in environment files  
✅ **Flexibility** - Easy to switch between environments  
✅ **Validation** - Built-in environment file validation  
✅ **Automation** - CI/CD ready with environment support  
✅ **Consistency** - Same deployment process across environments  

---

**Happy deploying with environment files! 🚀**
