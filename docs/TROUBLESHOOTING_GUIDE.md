# Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered during development and deployment of the Jewgo application.

## Recent Critical Issues (August 2025)

### Webpack Cache Corruption Issues ✅ RESOLVED

**Problem**: Critical development server failures due to webpack cache corruption

**Symptoms**:
```
⨯ unhandledRejection: [Error: ENOENT: no such file or directory, stat '.next/cache/webpack/client-development/7.pack.gz']
⨯ [Error: ENOENT: no such file or directory, open '.next/routes-manifest.json']
⨯ Error: Cannot find module './4985.js'
⨯ Error [ReferenceError]: exports is not defined at <unknown> (.next/server/vendors.js:9)
```

**Root Cause**: Filesystem cache corruption in development mode with complex chunk splitting

**Solution**: 
1. **Immediate Fix**:
   ```bash
   # Stop development server
   pkill -f "next dev" || true
   
   # Clean all caches
   rm -rf .next node_modules/.cache
   
   # Restart development server
   npm run dev
   ```

2. **Prevention**: Updated `frontend/next.config.js` to disable cache in development:
   ```javascript
   // Disable filesystem cache in development to prevent corruption
   if (dev) {
     config.cache = false;
   }
   
   // Simplified optimization without complex chunk splitting
   config.optimization = {
     ...config.optimization,
     minimize: isProduction,
     minimizer: config.optimization?.minimizer || [],
   };
   ```

**Result**: 
- ✅ Development server starts reliably
- ✅ No more cache corruption errors
- ✅ All API endpoints working correctly
- ✅ Pages load without module resolution errors

### Marketplace Categories Loading Issue ✅ RESOLVED

**Problem**: "Failed to load categories" error on marketplace page

**Symptoms**:
- Categories dropdown shows "Failed to load categories"
- API endpoint returns 500 errors
- Data structure mismatch between frontend and backend

**Solution**:
1. **Backend Fix**: Updated `backend/routes/api_v4.py` to return categories in correct format
2. **Frontend API Route**: Created `frontend/app/api/marketplace/categories/route.ts` to proxy and transform requests
3. **Frontend Update**: Modified `frontend/lib/api/marketplace.ts` to use local API route

**Result**: 
- ✅ Categories load correctly
- ✅ Marketplace page functions properly
- ✅ Data transformation handles both old and new backend formats

### Categories Popup Transparency Issue ✅ RESOLVED

**Problem**: Categories popup was transparent and hard to read

**Solution**: Updated `frontend/components/marketplace/MarketplaceCategoriesDropdown.tsx`:
```tsx
// Added white background and improved visibility
<div 
  ref={dropdownRef}
  className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-96 overflow-hidden border border-gray-200"
  style={{ backgroundColor: 'white' }}
>
  <div className="max-h-80 overflow-y-auto bg-white">
    {/* Content */}
  </div>
</div>
```

**Result**: 
- ✅ Popup has solid white background
- ✅ Better visibility and readability
- ✅ Improved user experience

### Layout.js Syntax Error ✅ RESOLVED

**Problem**: `layout.js:73 Uncaught SyntaxError: Invalid or unexpected token`

**Root Cause**: Problematic emoji character in `frontend/components/ui/RelayEmailBanner.tsx`

**Solution**: Replaced emoji with simple text icon:
```tsx
// Before: <span role="img" aria-label="info">🔒</span>
// After: <span className="text-lg font-bold" aria-label="info">!</span>
```

**Result**: 
- ✅ No more syntax errors
- ✅ Clean compilation
- ✅ Successful builds

### Restaurant Filter Options 500 Error ✅ RESOLVED

**Problem**: `GET http://localhost:3000/api/restaurants/filter-options 500 (Internal Server Error)`

**Root Cause**: Build cache corruption and webpack module resolution issues

**Solution**: 
1. **Cache Cleanup**: Removed corrupted cache files
2. **Webpack Configuration**: Simplified webpack config for development
3. **Module Resolution**: Fixed webpack cache and chunk splitting

**Result**: 
- ✅ Filter options API works correctly
- ✅ No more 500 errors
- ✅ Reliable development server

## Common Issues

### Development Server Issues

#### Server Won't Start

**Symptoms**:
- `npm run dev` fails to start
- Port already in use errors
- Module resolution errors

**Solutions**:
```bash
# Kill existing processes
pkill -f "next dev" || true
pkill -f "node" || true

# Clean cache
rm -rf .next node_modules/.cache

# Reinstall dependencies (if needed)
rm -rf node_modules package-lock.json
npm install

# Start server
npm run dev
```

#### Hot Reload Not Working

**Symptoms**:
- Changes not reflected in browser
- Manual refresh required
- Fast Refresh errors

**Solutions**:
```bash
# Restart development server
pkill -f "next dev" || true
npm run dev

# Check for syntax errors in console
# Ensure all imports are correct
```

### Build Issues

#### Build Fails

**Symptoms**:
- `npm run build` fails
- TypeScript errors
- Webpack compilation errors

**Solutions**:
```bash
# Clean build cache
rm -rf .next

# Check TypeScript errors
npm run typecheck

# Fix linting issues
npm run lint

# Rebuild
npm run build
```

#### Large Bundle Size

**Symptoms**:
- Build warnings about large chunks
- Slow page loads
- Performance issues

**Solutions**:
1. **Analyze Bundle**:
   ```bash
   npm run analyze
   ```

2. **Optimize Imports**:
   - Use dynamic imports for large components
   - Split large files into smaller modules
   - Remove unused dependencies

3. **Code Splitting**:
   - Implement route-based code splitting
   - Use React.lazy for component lazy loading

### API Issues

#### API Endpoints Return 500

**Symptoms**:
- Frontend API calls fail
- 500 Internal Server Error
- Network errors

**Solutions**:
1. **Check Backend Status**:
   ```bash
   curl -s "https://jewgo-app-oyoh.onrender.com/health" | jq .
   ```

2. **Check Environment Variables**:
   ```bash
   # Verify backend URL is correct
   echo $NEXT_PUBLIC_BACKEND_URL
   ```

3. **Check API Route Implementation**:
   - Verify route handlers are correct
   - Check for syntax errors
   - Ensure proper error handling

#### CORS Issues

**Symptoms**:
- CORS errors in browser console
- API calls blocked by browser

**Solutions**:
1. **Check Backend CORS Configuration**:
   - Verify allowed origins
   - Check CORS middleware setup

2. **Frontend Configuration**:
   - Ensure correct backend URL
   - Check for mixed content issues

### Database Issues

#### Connection Errors

**Symptoms**:
- Database connection failures
- Timeout errors
- Connection pool exhaustion

**Solutions**:
1. **Check Database Status**:
   ```bash
   # Test database connection
   python -c "from backend.database.connection_manager import get_connection; print('Connected')"
   ```

2. **Check Environment Variables**:
   ```bash
   # Verify database URL
   echo $DATABASE_URL
   ```

3. **Connection Pool Management**:
   - Increase connection pool size
   - Implement connection retry logic
   - Add connection health checks

#### Migration Issues

**Symptoms**:
- Database schema out of sync
- Migration errors
- Data integrity issues

**Solutions**:
1. **Check Migration Status**:
   ```bash
   # Run migrations
   python backend/database/migrations/run_migrations.py
   ```

2. **Backup Before Changes**:
   ```bash
   # Create backup
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Reset Database (Development Only)**:
   ```bash
   # Drop and recreate database
   python backend/database/migrations/reset_database.py
   ```

### Authentication Issues

#### Login Problems

**Symptoms**:
- Users can't log in
- Authentication errors
- Session issues

**Solutions**:
1. **Check Auth Configuration**:
   - Verify Supabase configuration
   - Check environment variables
   - Test auth endpoints

2. **Clear Browser Data**:
   - Clear cookies and local storage
   - Try incognito mode
   - Check browser console for errors

3. **Check User Database**:
   ```bash
   # Verify user exists
   python -c "from backend.database.repositories.user_repository import UserRepository; print(UserRepository().get_by_email('test@example.com'))"
   ```

#### OAuth Issues

**Symptoms**:
- OAuth providers not working
- Redirect errors
- Provider configuration issues

**Solutions**:
1. **Check Provider Configuration**:
   - Verify OAuth app settings
   - Check redirect URIs
   - Test provider endpoints

2. **Environment Variables**:
   ```bash
   # Check OAuth configuration
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```

### Performance Issues

#### Slow Page Loads

**Symptoms**:
- Pages take long to load
- Slow API responses
- Poor user experience

**Solutions**:
1. **Optimize Images**:
   - Use Next.js Image component
   - Implement proper image sizing
   - Enable image optimization

2. **Code Splitting**:
   - Implement route-based splitting
   - Use dynamic imports
   - Optimize bundle size

3. **API Optimization**:
   - Implement caching
   - Optimize database queries
   - Use pagination for large datasets

#### Memory Issues

**Symptoms**:
- High memory usage
- Out of memory errors
- Slow performance

**Solutions**:
1. **Monitor Memory Usage**:
   ```bash
   # Check memory usage
   top -p $(pgrep -f "next dev")
   ```

2. **Optimize Code**:
   - Remove memory leaks
   - Implement proper cleanup
   - Use efficient data structures

### Deployment Issues

#### Build Failures

**Symptoms**:
- CI/CD pipeline fails
- Build errors in production
- Deployment timeouts

**Solutions**:
1. **Check Build Logs**:
   - Review CI/CD logs
   - Identify specific errors
   - Fix build issues locally first

2. **Environment Variables**:
   - Verify all required variables are set
   - Check for missing secrets
   - Test build locally

3. **Dependencies**:
   - Update outdated packages
   - Fix security vulnerabilities
   - Ensure compatibility

#### Production Issues

**Symptoms**:
- Production site not working
- 500 errors in production
- Performance degradation

**Solutions**:
1. **Check Production Logs**:
   - Review application logs
   - Check error monitoring
   - Identify root cause

2. **Rollback if Needed**:
   ```bash
   # Rollback to previous version
   git revert HEAD
   git push origin main
   ```

3. **Health Checks**:
   ```bash
   # Test production endpoints
   curl -s "https://jewgo-app.vercel.app/healthz" | jq .
   ```

## Prevention Strategies

### Development Best Practices

1. **Regular Testing**:
   - Run tests before committing
   - Test locally before pushing
   - Use staging environment

2. **Code Quality**:
   - Follow linting rules
   - Use TypeScript properly
   - Implement proper error handling

3. **Monitoring**:
   - Watch for console errors
   - Monitor performance
   - Check for memory leaks

### Deployment Best Practices

1. **Staging Environment**:
   - Test changes in staging first
   - Use feature flags
   - Implement gradual rollouts

2. **Backup Strategy**:
   - Regular database backups
   - Version control for all changes
   - Document rollback procedures

3. **Monitoring**:
   - Set up error monitoring
   - Monitor performance metrics
   - Implement health checks

## Getting Help

### Internal Resources

1. **Documentation**:
   - Check relevant documentation files
   - Review recent changes
   - Look for similar issues

2. **Team Communication**:
   - Ask team members
   - Check recent discussions
   - Review pull requests

### External Resources

1. **Next.js Documentation**:
   - [Next.js Troubleshooting](https://nextjs.org/docs/advanced-features/debugging)
   - [Next.js Error Reference](https://nextjs.org/docs/advanced-features/error-handling)

2. **React Documentation**:
   - [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
   - [React Performance](https://reactjs.org/docs/optimizing-performance.html)

3. **Community Resources**:
   - Stack Overflow
   - GitHub Issues
   - Discord/Slack communities

## Emergency Procedures

### Critical Issues

1. **Site Down**:
   - Check deployment status
   - Verify environment variables
   - Rollback to stable version

2. **Data Loss**:
   - Stop all writes immediately
   - Restore from backup
   - Investigate root cause

3. **Security Issues**:
   - Assess impact
   - Implement immediate fixes
   - Notify stakeholders

### Contact Information

- **Development Team**: Check team communication channels
- **Infrastructure**: Contact hosting provider support
- **Security**: Follow security incident procedures

## Conclusion

This troubleshooting guide covers the most common issues and their solutions. For issues not covered here:

1. **Document the Problem**: Record symptoms, error messages, and steps to reproduce
2. **Check Recent Changes**: Look for recent commits or deployments that might have caused the issue
3. **Search Documentation**: Check project documentation and external resources
4. **Ask for Help**: Reach out to the team or community for assistance

Remember to always test solutions in a safe environment before applying them to production. 
