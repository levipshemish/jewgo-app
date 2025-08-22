# JewGo Build and Deploy System - Quick Reference

## 🚀 **Quick Commands**

### **Full Update (Build, Push, Deploy)**
```bash
# Update everything with production environment
npm run update all

# Update with specific environment
npm run update all --env staging

# Update with custom tag
npm run update all --tag v1.2.3

# Update only backend
npm run update backend --env prod
```

### **Build Only**
```bash
# Build all services
npm run build all

# Build with environment validation
npm run build all --env prod

# Force rebuild without cache
npm run build all --force
```

### **Deploy Only**
```bash
# Deploy with latest images
npm run deploy all

# Deploy with specific environment
npm run deploy all --env staging
```

### **Container Management**
```bash
# Start containers
npm run run all

# Stop containers
npm run stop all

# Restart with latest images
npm run restart all

# Check status
npm run status

# View logs
npm run logs all
```

## 📋 **Available Commands**

| Command | Description | Example |
|---------|-------------|---------|
| `npm run build` | Build images with environment validation | `npm run build all --env prod` |
| `npm run deploy` | Build and push to Docker Hub | `npm run deploy all --tag v1.2.3` |
| `npm run update` | **Full update: build, push, deploy** | `npm run update all` |
| `npm run run` | Start containers with environment files | `npm run run all --env prod` |
| `npm run stop` | Stop running containers | `npm run stop all` |
| `npm run restart` | Restart with latest images | `npm run restart all` |
| `npm run status` | Show deployment status | `npm run status` |
| `npm run logs` | Show container logs | `npm run logs backend` |
| `npm run validate` | Validate environment files | `npm run validate --env prod` |
| `npm run clean` | Clean up old images and containers | `npm run clean` |

## 🔧 **Environment Configuration**

### **Environment Files**
- `.env` - Default environment
- `.env.development` - Development environment
- `.env.staging` - Staging environment  
- `.env.production` - Production environment

### **Environment Types**
```bash
--env dev        # Uses .env.development
--env staging    # Uses .env.staging
--env prod       # Uses .env.production (default)
```

### **Custom Environment File**
```bash
--env-file .env.custom
```

## 🏷️ **Tagging Options**

### **Auto-Generated Tags**
```bash
# Commit-based (default)
npm run update all                    # commit-abc123

# Git tag-based
npm run update all --tag tag          # v1.2.3

# Branch-based
npm run update all --tag branch       # main

# Timestamp-based
npm run update all --tag timestamp    # build-20250101-120000
```

### **Custom Tags**
```bash
npm run update all --tag v1.2.3
npm run update all --tag staging-v1.2.3
npm run update all --tag hotfix-20250101
```

## 🚀 **Workflow Examples**

### **Development Workflow**
```bash
# 1. Make changes to code
git add .
git commit -m "Add new feature"

# 2. Build and test locally
npm run build all --env dev

# 3. Deploy to development
npm run update all --env dev

# 4. Test the deployment
npm run status
```

### **Staging Workflow**
```bash
# 1. Create staging branch
git checkout -b staging/new-feature

# 2. Deploy to staging
npm run update all --env staging --tag staging-v1.2.3

# 3. Test staging deployment
npm run logs all
```

### **Production Workflow**
```bash
# 1. Create production tag
git tag v1.2.3
git push origin v1.2.3

# 2. Deploy to production
npm run update all --env prod --tag v1.2.3

# 3. Monitor deployment
npm run status
npm run logs all
```

### **Hotfix Workflow**
```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug

# 2. Fix the issue
# ... make changes ...

# 3. Deploy hotfix
npm run update all --env prod --tag hotfix-v1.2.4

# 4. Monitor and verify
npm run status
```

## 🔍 **Monitoring and Debugging**

### **Check Status**
```bash
# Overall status
npm run status

# Container status
docker ps --filter "name=jewgo"

# Image status
docker images | grep jewgo
```

### **View Logs**
```bash
# All services
npm run logs all

# Specific service
npm run logs backend
npm run logs frontend

# Follow logs in real-time
docker-compose logs -f
```

### **Validate Environment**
```bash
# Validate production environment
npm run validate --env prod

# Validate specific file
npm run validate --env-file .env.custom
```

## 🛠️ **Advanced Options**

### **Force Rebuild**
```bash
# Force rebuild without cache
npm run build all --force

# Force update
npm run update all --force
```

### **Skip Tests**
```bash
# Skip tests during build
npm run build all --skip-tests
```

### **Dry Run**
```bash
# See what would be done without executing
npm run update all --dry-run
```

### **Service-Specific Operations**
```bash
# Update only frontend
npm run update frontend

# Update only backend
npm run update backend

# Restart only backend
npm run restart backend
```

## 🔄 **Environment Variables**

### **Required Variables**
The system validates these required variables:
- `DATABASE_URL` - Database connection string
- `FLASK_SECRET_KEY` - Flask secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### **Environment File Setup**
```bash
# Create environment files
cp env.template .env.development
cp env.template .env.staging
cp env.template .env.production

# Edit with your values
nano .env.production
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Environment File Not Found**
```bash
# Error: Environment file not found
# Solution: Create environment files
cp env.template .env.production
npm run validate --env prod
```

#### **Docker Not Running**
```bash
# Error: Docker is not running
# Solution: Start Docker Desktop
open -a Docker
```

#### **Docker Hub Authentication**
```bash
# Error: Not logged into Docker Hub
# Solution: Login to Docker Hub
docker login
```

#### **Build Failures**
```bash
# Check build logs
npm run build all --dry-run

# Force rebuild
npm run build all --force
```

### **Cleanup**
```bash
# Clean up old images and containers
npm run clean

# Remove specific containers
docker-compose down

# Remove all images
docker system prune -a
```

## 📊 **Status Indicators**

### **Container Status**
- ✅ **Running** - Container is healthy and running
- ⚠️ **Restarting** - Container is restarting
- ❌ **Stopped** - Container is stopped
- 🔄 **Starting** - Container is starting up

### **Image Status**
- ✅ **Local** - Image exists locally
- ✅ **Remote** - Image exists on Docker Hub
- ❌ **Missing** - Image not found

### **Environment Status**
- ✅ **Valid** - Environment file is valid
- ⚠️ **Missing Variables** - Some required variables missing
- ❌ **Not Found** - Environment file not found

## 🎯 **Best Practices**

### **Before Deployment**
1. **Validate environment** - `npm run validate --env prod`
2. **Run tests** - Ensure all tests pass
3. **Check status** - `npm run status`
4. **Review changes** - Verify what will be deployed

### **During Deployment**
1. **Monitor logs** - `npm run logs all`
2. **Check health** - Verify services are healthy
3. **Test endpoints** - Test frontend and backend

### **After Deployment**
1. **Verify deployment** - `npm run status`
2. **Monitor performance** - Check application performance
3. **Update documentation** - Update any relevant docs

## 🚀 **Quick Start Checklist**

1. **Setup Environment Files**
   ```bash
   cp env.template .env.production
   # Edit .env.production with your values
   ```

2. **Validate Configuration**
   ```bash
   npm run validate --env prod
   ```

3. **First Deployment**
   ```bash
   npm run update all --env prod
   ```

4. **Verify Deployment**
   ```bash
   npm run status
   npm run logs all
   ```

5. **Test Application**
   ```bash
   curl http://localhost:3000
   curl http://localhost:5000/health
   ```

---

**💡 Pro Tip**: Use `npm run update all` for the most common workflow - it builds, pushes, and deploys everything in one command! 🚀
