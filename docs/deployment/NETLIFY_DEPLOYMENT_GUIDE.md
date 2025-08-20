# Netlify Deployment Guide for JewGo App

This guide provides step-by-step instructions for deploying the JewGo app to Netlify.

## Prerequisites

- Node.js 22.x installed
- Netlify CLI installed (`npm install -g netlify-cli`)
- A Netlify account
- All required environment variables configured

## Required Environment Variables

Set these environment variables in your Netlify dashboard:

### Core Application Variables
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=5060e374c6d88aacf8fea324
NEXT_PUBLIC_BACKEND_URL=https://jewgo.onrender.com
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Database Configuration
```
DATABASE_URL=your_postgresql_database_url
```

### Authentication Configuration
```
NEXTAUTH_URL=https://your-app-name.netlify.app
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Supabase Configuration (if using)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Email Configuration (if using)
```
EMAIL_SERVER_HOST=your_email_host
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email_user
EMAIL_SERVER_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourdomain.com
```

### Sentry Configuration (if using)
```
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### Build Configuration
```
NODE_ENV=production
PRISMA_QUERY_ENGINE_TYPE=library
```

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

1. **Connect GitHub Repository**
   - Go to your Netlify dashboard
   - Click "New site from Git"
   - Connect your GitHub repository
   - Set build settings:
     - **Base directory**: `frontend`
     - **Build command**: `npm ci --include=dev && npx prisma generate && npm run build`
     - **Publish directory**: `.next`

2. **Configure Environment Variables**
   - In your Netlify site settings, go to "Environment variables"
   - Add all required environment variables listed above

3. **Deploy**
   - Netlify will automatically build and deploy your site
   - Each push to your main branch will trigger a new deployment

### Method 2: Manual Deployment

1. **Prepare Your Environment**
   ```bash
   # Clone the repository
   git clone <your-repo-url>
   cd jewgo-app
   
   # Install Netlify CLI if not already installed
   npm install -g netlify-cli
   ```

2. **Run the Deployment Script**
   ```bash
   # Run the automated deployment script
   ./scripts/deploy-netlify.sh
   
   # Or skip tests for faster deployment
   ./scripts/deploy-netlify.sh --skip-tests
   ```

3. **Link to Netlify Site**
   ```bash
   cd frontend
   netlify link
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod --dir=.next
   ```

## Netlify Next.js Plugin Configuration

The `@netlify/plugin-nextjs` plugin is configured to work with Next.js 15:

**Configuration**: 
- The plugin is included in `package.json` as a devDependency
- Plugin configuration is set in `netlify.toml`
- Build command is optimized to work with the plugin

**Note**: If you encounter plugin-related issues, the configuration is set up to handle them properly.

## Configuration Files

### netlify.toml
The main Netlify configuration file is located in the project root:

```toml
[build]
  base = "frontend"
  command = "npm ci --include=dev && npx prisma generate && npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"
  NPM_VERSION = "10"
  NODE_OPTIONS = "--max-old-space-size=4096"
  NODE_ENV = "production"
```

### _redirects
Located in `frontend/_redirects`, handles routing and API proxying:

```
# Handle client-side routing for Next.js
/*    /index.html   200

# Handle API routes - proxy to backend
/api/specials/*  https://jewgo.onrender.com/api/specials/:splat  200
/api/health/*  https://jewgo.onrender.com/api/health/:splat  200
# ... other API routes

# Handle Next.js static assets
/_next/static/* /_next/static/:splat 200
/_next/image/* /_next/image/:splat 200
/_next/data/* /_next/data/:splat 200
```

### _headers
Located in `frontend/_headers`, configures security headers:

```
/*
  X-Frame-Options: ALLOWALL
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  X-Content-Type-Options: nosniff
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all environment variables are set
   - Ensure Node.js version is 22.x
   - Verify Prisma schema is valid
   - Check for TypeScript errors
   - The `@netlify/plugin-nextjs` plugin is configured to work with Next.js 15

2. **API Routes Not Working**
   - Verify `NEXT_PUBLIC_BACKEND_URL` is correct
   - Check that backend is running and accessible
   - Ensure CORS is properly configured on backend

3. **Authentication Issues**
   - Verify `NEXTAUTH_URL` matches your Netlify domain
   - Check that `NEXTAUTH_SECRET` is set
   - Ensure database connection is working

4. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check that database is accessible from Netlify
   - Ensure Prisma migrations are up to date

### Debugging Steps

1. **Check Build Logs**
   - Go to your Netlify dashboard
   - Click on the failed deployment
   - Review the build logs for errors

2. **Test Locally**
   ```bash
   cd frontend
   npm run build
   npm start
   ```

3. **Validate Environment**
   ```bash
   cd frontend
   npm run validate-env
   ```

4. **Check Prisma**
   ```bash
   cd frontend
   npx prisma generate
   npx prisma db push
   ```

## Performance Optimization

### Build Optimization
- The build process includes Prisma client generation
- Static assets are optimized and cached
- Images are processed with Next.js Image optimization

### Caching Strategy
- Static assets are cached for 1 year
- API responses are not cached by default
- Next.js handles its own caching internally

### Monitoring
- Use Netlify Analytics to monitor performance
- Set up error tracking with Sentry
- Monitor build times and success rates

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive data to version control
   - Use Netlify's environment variable management
   - Rotate secrets regularly

2. **Headers**
   - Security headers are configured in `_headers`
   - CORS is properly configured for API routes
   - Content Security Policy is implemented

3. **Authentication**
   - NextAuth.js handles secure authentication
   - Sessions are properly managed
   - CSRF protection is enabled

## Maintenance

### Regular Tasks
1. **Update Dependencies**
   ```bash
   cd frontend
   npm update
   npm audit fix
   ```

2. **Database Migrations**
   ```bash
   cd frontend
   npx prisma migrate deploy
   ```

3. **Monitor Performance**
   - Check Netlify Analytics
   - Review error logs
   - Monitor build times

### Backup Strategy
- Database backups should be configured separately
- Environment variables are stored in Netlify
- Code is version controlled in GitHub

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Netlify's documentation
3. Check the project's GitHub issues
4. Contact the development team

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
