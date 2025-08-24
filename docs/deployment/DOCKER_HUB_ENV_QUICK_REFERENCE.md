# Docker Hub Deployment with .env Files - Quick Reference

## 🚀 Quick Commands

### Deploy with Environment Files
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

# Validate environment file
./scripts/docker-hub-deploy-with-env.sh validate-env --env .env.production
```

## 🏗️ Environment Files

| File | Purpose | Usage |
|------|---------|-------|
| `.env` | Default environment | `--env .env` or default |
| `.env.development` | Development environment | `--env-type dev` |
| `.env.staging` | Staging environment | `--env-type staging` |
| `.env.production` | Production environment | `--env-type prod` |

Environment policy:
- Root `.env` is the single source of truth for keys/values used locally.
- Example files must use placeholders only; never commit real secrets.
- Validate before deploy/build:
  ```bash
  npm run env:check
  ```

## 📦 Available Commands

### Deployment
```bash
# Deploy with environment configuration
npm run docker:deploy-env all --env-type prod --tag commit

# Deploy frontend only with staging env
npm run docker:deploy-env frontend --env-type staging --custom-tag v1.2.3

# Deploy backend only with production env
npm run docker:deploy-env backend --env-type prod --tag latest
```

### Build
```bash
# Build with environment configuration
npm run docker:build-env all --env-type staging --tag commit

# Build frontend with specific .env file
npm run docker:build-env frontend --env .env.production --custom-tag v1.2.3
```

### Validation
```bash
# Validate environment file
npm run docker:validate-env --env .env.production

# List available environment files
npm run docker:list-env

# Show deployment status
npm run docker:env-status
```

## 🏷️ Tagging Examples

| Command | Result |
|---------|--------|
| `--env-type dev --tag commit` | `mml555/jewgo-frontend:commit-abc123` |
| `--env-type staging --custom-tag v1.2.3` | `mml555/jewgo-frontend:v1.2.3` |
| `--env-type prod --tag latest` | `mml555/jewgo-frontend:latest` |

## 🔍 Testing and Validation

### Dry Run Deployment
```bash
# Test deployment without actually building/pushing
./scripts/docker-hub-deploy-with-env.sh deploy all --env-type prod --tag commit --dry-run
```

### Validate Environment Files
```bash
# Validate specific environment file
./scripts/docker-hub-deploy-with-env.sh validate-env --env .env.production

# Validate by environment type
./scripts/docker-hub-deploy-with-env.sh validate-env --env-type staging
```

### List Environment Files
```bash
# Show available environment files
./scripts/docker-hub-deploy-with-env.sh list-env
```

## 🚀 Workflow Examples

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

## 🔧 Environment Configuration

### Development Environment (`.env.development`)
```bash
FLASK_ENV=development
FLASK_DEBUG=True
DATABASE_URL=postgresql://dev_user:password@localhost:5432/jewgo_dev
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_anon_key
```

### Staging Environment (`.env.staging`)
```bash
FLASK_ENV=staging
FLASK_DEBUG=False
DATABASE_URL=postgresql://staging_user:password@staging-db:5432/jewgo_staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_anon_key
```

### Production Environment (`.env.production`)
```bash
FLASK_ENV=production
FLASK_DEBUG=False
DATABASE_URL=postgresql://prod_user:password@prod-db:5432/jewgo_prod
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
```

## 🐳 Docker Compose Integration

### Environment-Specific Docker Compose
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

## 🚨 Troubleshooting

### Common Issues
```bash
# Environment file not found
cp env.template .env.development
cp env.template .env.staging
cp env.template .env.production

# Missing required variables
./scripts/docker-hub-deploy-with-env.sh validate-env --env .env.production

# Docker build fails
./scripts/docker-hub-deploy-with-env.sh build all --env-type prod --dry-run
```

### Performance Optimization
```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Build with layer caching
docker build --cache-from mml555/jewgo-frontend:latest
```

## 📋 Prerequisites

1. **Docker Desktop** running
2. **Docker Hub login**: `docker login`
3. **Git repository** with proper versioning
4. **Environment files** configured

## 🚨 Important Notes

1. **Never commit secrets**: Use `.gitignore` to exclude sensitive files
2. **Validate early**: Validate environment files before deployment
3. **Test first**: Always test in staging before production
4. **Use dry runs**: Test deployments with `--dry-run` flag

---

**💡 Tip**: Use `npm run docker:deploy-env` for environment-based deployments!
