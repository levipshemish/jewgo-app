# Troubleshooting Guide

Tip: Validate environment and config per `docs/AGENTS.md`. When handing off long/npm commands, follow root `AGENTS.md` guardrails.

## Table of Contents

1. [General Issues](#general-issues)
2. [Frontend Issues](#frontend-issues)
3. [Backend Issues](#backend-issues)
4. [Database Issues](#database-issues)
5. [Deployment Issues](#deployment-issues)
6. [Admin System Issues](#admin-system-issues)
7. [Authentication Issues](#authentication-issues)
8. [Performance Issues](#performance-issues)

## General Issues

### Environment Variables

**Problem**: Application fails to start or function properly
**Symptoms**: 
- Database connection errors
- Authentication failures
- Missing configuration

**Solutions**:
1. Check environment file: `cat .env`
2. Validate environment: `npm run env:check`
3. Verify production variables in deployment platform
4. Restart application after environment changes

### Build Failures

**Problem**: Application fails to build
**Symptoms**:
- TypeScript errors
- Missing dependencies
- Webpack module errors

**Solutions**:
1. Clear build cache: `rm -rf .next && npm run build`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for missing files or imports
4. Verify TypeScript configuration

## Frontend Issues

### Next.js Build Issues

**Problem**: Frontend build fails
**Symptoms**:
- Module resolution errors
- TypeScript compilation failures
- Missing route files

**Solutions**:
1. Clear Next.js cache: `rm -rf .next`
2. Check for missing page files
3. Verify import statements
4. Run type check: `npm run type-check`

### React Component Errors

**Problem**: Components fail to render
**Symptoms**:
- White screen
- JavaScript errors in console
- Missing component imports

**Solutions**:
1. Check browser console for errors
2. Verify component imports
3. Check for missing dependencies
4. Validate component props

## Backend Issues

### Flask Application Errors

**Problem**: Backend API fails
**Symptoms**:
- 500 Internal Server Error
- Database connection failures
- Missing routes

**Solutions**:
1. Check Flask logs
2. Verify database connection
3. Check route definitions
4. Validate request data

### API Endpoint Issues

**Problem**: API endpoints return errors
**Symptoms**:
- 404 Not Found
- 500 Internal Server Error
- Invalid response format

**Solutions**:
1. Check route definitions
2. Verify request methods
3. Validate request data
4. Check authentication

## Database Issues

### Connection Problems

**Problem**: Database connection fails
**Symptoms**:
- Connection timeout errors
- Authentication failures
- Schema errors

**Solutions**:
1. Check database URL
2. Verify database credentials
3. Check network connectivity
4. Validate database schema

### Migration Issues

**Problem**: Database migrations fail
**Symptoms**:
- Schema mismatch errors
- Migration conflicts
- Data loss

**Solutions**:
1. Backup database before migrations
2. Check migration files
3. Verify schema compatibility
4. Rollback if necessary

## Deployment Issues

### Vercel Deployment

**Problem**: Frontend deployment fails
**Symptoms**:
- Build failures
- Environment variable issues
- Runtime errors

**Solutions**:
1. Check build logs in Vercel dashboard
2. Verify environment variables
3. Check for missing dependencies
4. Validate build configuration

### Render Deployment

**Problem**: Backend deployment fails
**Symptoms**:
- Application startup failures
- Environment variable issues
- Port binding errors

**Solutions**:
1. Check Render logs
2. Verify environment variables
3. Check application configuration
4. Validate dependencies

## Admin System Issues

### 500 Internal Server Error on Admin Page

**Problem**: Admin dashboard returns 500 error
**Symptoms**:
- Admin page fails to load
- Server-side rendering errors
- Missing API routes

**Causes**:
- Missing environment variables
- Database connection issues
- Missing CSRF API route
- Webpack build issues

**Solutions**:

1. **Check Environment Variables**
   ```bash
   # Verify all required variables are set
   npm run env:check
   
   # Required variables for admin:
   # - DATABASE_URL
   # - NEXTAUTH_SECRET
   # - SUPABASE_SERVICE_ROLE_KEY
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Verify CSRF API Route**
   ```bash
   # Check if CSRF route exists
   ls frontend/app/api/admin/csrf/route.ts
   
   # If missing, create the route
   ```

3. **Clear Build Cache**
   ```bash
   cd frontend
   rm -rf .next
   npm run build
   ```

4. **Check Database Connection**
   ```bash
   # Test database connectivity
   npm run db:test
   ```

### CSRF Token Errors

**Problem**: Admin actions fail with CSRF token errors
**Symptoms**:
- "Invalid CSRF token" errors
- Admin actions rejected
- Token generation failures

**Solutions**:

1. **Verify CSRF Route**
   ```bash
   # Check CSRF route implementation
   cat frontend/app/api/admin/csrf/route.ts
   ```

2. **Check Token Generation**
   ```typescript
   // Verify token generation in admin layout
   const response = await fetch('/api/admin/csrf');
   const { token } = await response.json();
   ```

3. **Validate Token Storage**
   ```typescript
   // Check token is properly stored
   console.log('CSRF Token:', csrfToken);
   ```

### Database Query Errors

**Problem**: Admin pages fail to load data
**Symptoms**:
- Empty admin dashboard
- Database connection errors
- Prisma model issues

**Solutions**:

1. **Check Prisma Models**
   ```bash
   # For ignored models, use raw SQL
   # Example: florida_synagogues table
   ```

2. **Verify Database Schema**
   ```bash
   # Check if tables exist
   npm run db:check
   ```

3. **Test Raw SQL Queries**
   ```typescript
   // For ignored models, use raw SQL
   const result = await prisma.$queryRawUnsafe(`
     SELECT * FROM florida_synagogues LIMIT 10
   `);
   ```

### Build Failures with Admin Pages

**Problem**: Build fails when including admin pages
**Symptoms**:
- Webpack module errors
- Missing dependencies
- Import resolution failures

**Solutions**:

1. **Clear All Caches**
   ```bash
   cd frontend
   rm -rf .next node_modules/.cache
   npm install
   ```

2. **Check Webpack Configuration**
   ```javascript
   // next.config.js
   module.exports = {
     webpackBuildWorker: false,
     experimental: {
       serverComponentsExternalPackages: ['@prisma/client']
     }
   }
   ```

3. **Verify Admin Dependencies**
   ```bash
   # Check if all admin dependencies are installed
   npm list @prisma/client
   npm list @supabase/supabase-js
   ```

### Admin Authentication Issues

**Problem**: Admin users cannot access admin pages
**Symptoms**:
- Redirected to signin page
- "Unauthorized" errors
- Missing admin roles

**Solutions**:

1. **Check Admin Role Assignment**
   ```sql
   -- Verify admin role exists
   SELECT * FROM admin_roles WHERE user_id = 'user-uuid';
   ```

2. **Verify Supabase Authentication**
   ```typescript
   // Check user session
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```

3. **Check Admin Permissions**
   ```typescript
   // Verify admin permissions
   const adminUser = await getAdminUser();
   console.log('Admin User:', adminUser);
   ```

### Admin API Route Issues

**Problem**: Admin API endpoints return errors
**Symptoms**:
- 404 Not Found for admin routes
- 500 Internal Server Error
- Authentication failures

**Solutions**:

1. **Verify Route Files**
   ```bash
   # Check all admin API routes exist
   ls frontend/app/api/admin/
   ```

2. **Check Route Implementation**
   ```typescript
   // Verify route handlers
   export async function GET(request: NextRequest) {
     // Check authentication
     const adminUser = await requireAdmin(request);
     if (!adminUser) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
   }
   ```

3. **Test API Endpoints**
   ```bash
   # Test admin endpoints
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
        https://your-domain.com/api/admin/users
   ```

## Authentication Issues

### Supabase Authentication

**Problem**: Authentication fails
**Symptoms**:
- Login failures
- Session errors
- Missing user data

**Solutions**:
1. Check Supabase configuration
2. Verify environment variables
3. Check user account status
4. Validate authentication flow

### NextAuth Issues

**Problem**: Legacy NextAuth problems
**Symptoms**:
- Authentication errors
- Session management issues
- Provider configuration problems

**Solutions**:
1. Check NextAuth configuration
2. Verify provider settings
3. Check session handling
4. Validate callback URLs

## Performance Issues

### Slow Page Loads

**Problem**: Pages load slowly
**Symptoms**:
- Long loading times
- Timeout errors
- Poor user experience

**Solutions**:
1. Check database query performance
2. Optimize images and assets
3. Implement caching
4. Monitor server resources

### Database Performance

**Problem**: Database queries are slow
**Symptoms**:
- Slow admin operations
- Timeout errors
- High resource usage

**Solutions**:
1. Add database indexes
2. Optimize query patterns
3. Implement query caching
4. Monitor query performance

## Debugging Tools

### Frontend Debugging

```bash
# Enable debug mode
NODE_ENV=development npm run dev

# Check browser console for errors
# Use React Developer Tools
# Monitor network requests
```

### Backend Debugging

```bash
# Enable Flask debug mode
export FLASK_DEBUG=1
python app.py

# Check application logs
# Monitor database queries
# Use logging statements
```

### Database Debugging

```bash
# Connect to database
psql $DATABASE_URL

# Check table structure
\d table_name

# Monitor slow queries
# Check query execution plans
```

## Common Commands

### Environment Management

```bash
# Check environment variables
npm run env:check

# Validate environment
npm run env:validate

# Set up development environment
npm run setup:dev
```

### Build and Deployment

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && python -m pip install -r requirements.txt

# Deploy to production
npm run deploy
```

### Database Management

```bash
# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Backup database
npm run db:backup
```

### Testing

```bash
# Run all tests
npm test

# Run frontend tests
cd frontend && npm test

# Run backend tests
cd backend && pytest
```

## Getting Help

### Documentation Resources

1. **Project Documentation**: Check `/docs` directory
2. **API Documentation**: Review API endpoint documentation
3. **Deployment Guides**: Check deployment-specific guides
4. **Security Documentation**: Review security best practices

### Support Channels

1. **GitHub Issues**: Create detailed issue reports
2. **Development Team**: Contact team with specific error details
3. **Community Forums**: Check community resources
4. **Stack Overflow**: Search for similar issues

### Issue Reporting

When reporting issues, include:

1. **Error Details**: Full error messages and stack traces
2. **Environment**: OS, Node.js version, database version
3. **Steps to Reproduce**: Detailed reproduction steps
4. **Expected vs Actual**: What you expected vs what happened
5. **Screenshots**: Visual evidence of the issue
6. **Logs**: Relevant application and system logs

---

**Last Updated**: January 2025  
**Version**: 2.0.0 
