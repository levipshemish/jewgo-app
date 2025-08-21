# Docker Testing Guide

## Overview
This guide outlines the mandatory Docker testing process before pushing changes to git. Docker testing ensures that your changes work correctly in the same environment as production.

## Why Docker Testing?
- **Environment Parity**: Tests in the same environment as production
- **Build Validation**: Validates the complete build process
- **Environment Variables**: Tests with production-like environment variables
- **Dependency Issues**: Catches dependency and configuration problems early
- **No Git History**: Test changes without commits

## Pre-Push Docker Testing Workflow

### 1. Development Testing (Fastest - Recommended for initial testing)
```bash
# Build and test with development setup
docker-compose -f docker-compose.frontend.dev.yml up --build

# Access at: http://localhost:3000
# Benefits: Hot reloading, faster builds, easier debugging
```

**What to test:**
- [ ] All affected pages load correctly
- [ ] Navigation works as expected
- [ ] Environment variables are loaded
- [ ] No console errors
- [ ] Hot reloading works (make a change and see it update)

### 2. Production Testing (Most Accurate - Required before push)
```bash
# Build and test with production setup (matches CI)
docker-compose -f docker-compose.frontend.prod.yml up --build

# Access at: http://localhost:3000
# Benefits: Matches production environment exactly
```

**What to test:**
- [ ] Build process completes successfully
- [ ] All pages load correctly
- [ ] Environment variables are validated
- [ ] No TypeScript errors
- [ ] No build warnings
- [ ] Performance is acceptable

### 3. Full Stack Testing (Optional - When backend changes are involved)
```bash
# Test with local backend + frontend
docker-compose -f docker-compose.frontend.local.yml up --build

# This connects to local backend on host.docker.internal:5000
```

**What to test:**
- [ ] Frontend connects to backend correctly
- [ ] API calls work as expected
- [ ] Authentication flows work
- [ ] Database operations work

## Testing Checklist

### For New Pages/Features
- [ ] Page loads without errors
- [ ] All links work correctly
- [ ] Responsive design works on different screen sizes
- [ ] Accessibility features work (if applicable)
- [ ] Performance is acceptable

### For Existing Pages/Features
- [ ] Existing functionality still works
- [ ] No regressions introduced
- [ ] Performance hasn't degraded
- [ ] All tests still pass

### For API Changes
- [ ] API endpoints respond correctly
- [ ] Error handling works as expected
- [ ] Authentication/authorization works
- [ ] Rate limiting works (if applicable)

## Common Issues and Solutions

### Build Failures
```bash
# Clean Docker cache and rebuild
docker system prune -f
docker-compose -f docker-compose.frontend.prod.yml up --build --force-recreate
```

### Environment Variable Issues
```bash
# Check environment variables are loaded
docker-compose -f docker-compose.frontend.prod.yml config

# Verify .env file exists and has correct values
cat .env | grep -E "(NEXT_PUBLIC_|SUPABASE_|GOOGLE_)"
```

### Port Conflicts
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Use different port if needed
docker-compose -f docker-compose.frontend.dev.yml up --build -p 3001
```

### Memory Issues
```bash
# Increase Docker memory limit
# In Docker Desktop: Settings > Resources > Memory > Increase to 4GB+
```

## Quick Testing Commands

### Development Testing
```bash
# Quick dev test
docker-compose -f docker-compose.frontend.dev.yml up --build -d
curl http://localhost:3000/api/health
docker-compose -f docker-compose.frontend.dev.yml down
```

### Production Testing
```bash
# Quick prod test
docker-compose -f docker-compose.frontend.prod.yml up --build -d
curl http://localhost:3000/api/health
docker-compose -f docker-compose.frontend.prod.yml down
```

### Full Test Suite
```bash
# Run all tests
./scripts/test-docker-all.sh
```

## Integration with CI/CD

The Docker testing process mirrors the CI/CD pipeline:
1. **Development Testing** = Local development validation
2. **Production Testing** = CI build validation
3. **Full Stack Testing** = Integration testing

## Troubleshooting

### Docker Build Issues
```bash
# Check Docker logs
docker-compose -f docker-compose.frontend.prod.yml logs

# Check specific service logs
docker-compose -f docker-compose.frontend.prod.yml logs frontend

# Debug build process
docker-compose -f docker-compose.frontend.prod.yml build --no-cache --progress=plain
```

### Environment Issues
```bash
# Validate environment variables
docker-compose -f docker-compose.frontend.prod.yml run --rm frontend npm run validate-env

# Check environment in container
docker-compose -f docker-compose.frontend.prod.yml run --rm frontend env | grep -E "(NEXT_PUBLIC_|SUPABASE_)"
```

### Performance Issues
```bash
# Check container resource usage
docker stats

# Monitor build performance
time docker-compose -f docker-compose.frontend.prod.yml up --build
```

## Best Practices

1. **Always test in Docker before pushing** - This is mandatory
2. **Test both development and production environments** - Don't skip production testing
3. **Document any Docker-specific issues** - Help the team learn from issues
4. **Keep Docker images updated** - Regular `docker system prune` and rebuilds
5. **Use consistent environment variables** - Match production configuration
6. **Test with realistic data** - Use production-like data when possible

## Emergency Procedures

### Skip Docker Testing (Emergency Only)
```bash
# Only for emergency hotfixes
git push origin main --no-verify

# Must create follow-up task to complete Docker testing
# TODO: Complete Docker testing for emergency fix
```

### Quick Validation
```bash
# For urgent changes, at minimum run:
docker-compose -f docker-compose.frontend.prod.yml up --build -d
curl -f http://localhost:3000/api/health || echo "Health check failed"
docker-compose -f docker-compose.frontend.prod.yml down
```

## Success Criteria

Docker testing is successful when:
- [ ] All Docker builds complete without errors
- [ ] All affected pages/features work correctly
- [ ] Environment variables are properly loaded
- [ ] No TypeScript or build errors
- [ ] Performance is acceptable
- [ ] All tests pass in Docker environment

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Project Docker Setup](../deployment/DOCKER_FRONTEND_SETUP.md)
- [Environment Configuration](../setup/env-variables-setup.md)
