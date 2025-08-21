# Production Testing Workflow

## Overview
This document outlines the production testing workflow that ensures all changes are thoroughly tested in a production-like environment before being pushed to git.

## Why Production Testing?
- **Environment Parity**: Tests in the exact same environment as production
- **Build Validation**: Validates the complete production build process
- **Integration Testing**: Tests all components working together
- **Performance Validation**: Ensures acceptable performance under production conditions
- **Security Validation**: Tests security features and rate limiting
- **Manual Validation**: Allows for human verification of functionality

## Production Testing Workflow

### Step 1: Prepare for Testing
```bash
# Ensure Docker Desktop is running
# Ensure all environment variables are set in .env file
# Ensure you have the latest code changes
```

### Step 2: Run Production Testing Script
```bash
# Start the production testing environment
./scripts/production-test.sh
```

This script will:
- ✅ Check Docker status
- ✅ Validate environment variables
- ✅ Build production Docker image
- ✅ Start production environment
- ✅ Run automated tests
- ✅ Provide testing checklist

### Step 3: Manual Testing
Once the production environment is running, manually test:

#### **🌐 Page Testing**
- [ ] **Home Page**: http://localhost:3000
  - [ ] Loads without errors
  - [ ] All links work correctly
  - [ ] Responsive design works
  - [ ] No console errors

- [ ] **Stores Page**: http://localhost:3000/stores
  - [ ] Shows "Coming Soon" content
  - [ ] Links to eatery page work
  - [ ] Back to home link works
  - [ ] Consistent styling with other pages

- [ ] **Mikva Page**: http://localhost:3000/mikva
  - [ ] Shows "Coming Soon" content
  - [ ] Links to shuls page work
  - [ ] Back to home link works
  - [ ] Consistent styling with other pages

- [ ] **Shuls Page**: http://localhost:3000/shuls
  - [ ] Shows "Coming Soon" content
  - [ ] Links to eatery page work
  - [ ] Back to home link works
  - [ ] Consistent styling with other pages

- [ ] **Eatery Page**: http://localhost:3000/eatery
  - [ ] Loads and functions correctly
  - [ ] All existing functionality works
  - [ ] No regressions introduced

#### **📱 Responsive Testing**
- [ ] **Desktop**: Test on desktop browser (1920x1080+)
- [ ] **Tablet**: Test on tablet viewport (768px width)
- [ ] **Mobile**: Test on mobile viewport (375px width)
- [ ] **Navigation**: Test hamburger menu on mobile
- [ ] **Touch**: Test touch interactions on mobile

#### **🔧 Technical Testing**
- [ ] **Console Errors**: No JavaScript errors in browser console
- [ ] **Network Requests**: All API calls complete successfully
- [ ] **Performance**: Page load times are acceptable (<3 seconds)
- [ ] **Memory**: No memory leaks (monitor with browser dev tools)
- [ ] **Authentication**: Login/logout flows work (if applicable)
- [ ] **Rate Limiting**: Rate limiting works correctly (if applicable)

#### **📊 Performance Testing**
- [ ] **First Load**: Initial page load is fast
- [ ] **Navigation**: Page transitions are smooth
- [ ] **Images**: Images load correctly and are optimized
- [ ] **Fonts**: Fonts load and display correctly
- [ ] **Animations**: Any animations are smooth

### Step 4: Monitor Container Health
```bash
# Monitor container logs
docker-compose -f docker-compose.production-test.yml logs -f

# Check container status
docker-compose -f docker-compose.production-test.yml ps

# Monitor resource usage
docker stats
```

### Step 5: Complete Testing Checklist
Use the checklist provided by the script to ensure all tests pass:

#### **✅ Automated Tests**
- [ ] All pages load without errors
- [ ] Health endpoint responds correctly
- [ ] Container starts successfully

#### **🔍 Manual Tests**
- [ ] Home page displays correctly
- [ ] Navigation works between pages
- [ ] Stores page shows coming soon content
- [ ] Mikva page shows coming soon content
- [ ] Shuls page shows coming soon content
- [ ] Eatery page works as expected
- [ ] Responsive design works on mobile
- [ ] No console errors in browser
- [ ] Performance is acceptable

#### **🔧 Technical Tests**
- [ ] Environment variables loaded correctly
- [ ] Database connections work
- [ ] API endpoints respond
- [ ] Authentication flows work (if applicable)
- [ ] Rate limiting works (if applicable)

#### **📊 Performance Tests**
- [ ] Page load times are acceptable
- [ ] Memory usage is reasonable
- [ ] CPU usage is stable

### Step 6: Give Permission to Push
Once all tests pass and you're satisfied with the functionality:

1. **Stop the production environment**:
   ```bash
   docker-compose -f docker-compose.production-test.yml down
   ```

2. **Give permission to push**: Tell the AI assistant that production testing is complete and you approve the changes for git push.

## Troubleshooting

### Common Issues

#### **Container Won't Start**
```bash
# Check logs for errors
docker-compose -f docker-compose.production-test.yml logs

# Check if port 3000 is already in use
lsof -i :3000

# Kill any processes using port 3000
lsof -ti:3000 | xargs kill -9
```

#### **Environment Variables Missing**
```bash
# Check .env file exists
ls -la .env

# Check required variables
cat .env | grep -E "(NEXT_PUBLIC_|SUPABASE_|DATABASE_|UPSTASH_)"
```

#### **Build Failures**
```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker-compose -f docker-compose.production-test.yml up --build --force-recreate
```

#### **Performance Issues**
```bash
# Check container resource usage
docker stats

# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Emergency Procedures

#### **Skip Production Testing (Emergency Only)**
```bash
# Only for emergency hotfixes
git push origin main --no-verify

# Must create follow-up task to complete production testing
# TODO: Complete production testing for emergency fix
```

#### **Quick Validation**
```bash
# For urgent changes, at minimum run:
docker-compose -f docker-compose.production-test.yml up --build -d
curl -f http://localhost:3000/api/health || echo "Health check failed"
docker-compose -f docker-compose.production-test.yml down
```

## Success Criteria

Production testing is successful when:
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] All technical tests pass
- [ ] All performance tests pass
- [ ] No critical issues found
- [ ] User experience is acceptable
- [ ] No regressions introduced

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Production Testing Checklist](./DOCKER_TESTING_GUIDE.md)
- [Environment Configuration](../setup/env-variables-setup.md)
