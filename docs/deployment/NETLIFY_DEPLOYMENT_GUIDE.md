# Netlify Deployment Guide

This guide explains how to deploy the JewGo app to Netlify while preserving all Vercel configuration for future use.

## Overview

The app has been configured to work with both Vercel and Netlify. All Vercel-specific configurations have been preserved (commented out or duplicated) so you can easily switch between platforms.

## Files Added for Netlify

### 1. `netlify.toml` (Root Directory)
Main Netlify configuration file that specifies:
- Build directory: `frontend`
- Build command: `npm install && npm run validate-env && npm run build`
- Output directory: `.next`
- Node.js version: 22.x
- Environment variables for different contexts

### 2. `frontend/netlify.env.example`
Template for Netlify environment variables. Copy this to `netlify.env` and fill in your actual values.

### 3. Updated Configuration Files
- `frontend/_redirects`: Updated for Netlify compatibility
- `frontend/_headers`: Already Netlify-compatible
- Config files: Added Netlify URLs while preserving Vercel URLs

## Deployment Steps

### 1. Install Netlify CLI (Optional)
```bash
npm install -g netlify-cli
```

### 2. Set Up Environment Variables

#### Option A: Using Netlify CLI
```bash
# Copy the template
cp frontend/netlify.env.example frontend/netlify.env

# Edit the file with your actual values
nano frontend/netlify.env

# Import to Netlify
netlify env:import frontend/netlify.env
```

#### Option B: Using Netlify Dashboard
1. Go to your Netlify dashboard
2. Navigate to Site settings > Environment variables
3. Add the following variables:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
   - `NEXT_PUBLIC_BACKEND_URL`
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL` (if using Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if using Supabase)
   - `SUPABASE_SERVICE_ROLE_KEY` (if using Supabase)

### 3. Deploy to Netlify

#### Option A: Connect GitHub Repository
1. Go to [Netlify](https://netlify.com)
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Configure build settings:
   - Base directory: `frontend`
   - Build command: `npm install && npm run validate-env && npm run build`
   - Publish directory: `.next`
5. Click "Deploy site"

#### Option B: Manual Deploy
```bash
# Build the project
cd frontend
npm install
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=.next
```

### 4. Configure Custom Domain (Optional)
1. In Netlify dashboard, go to Site settings > Domain management
2. Add your custom domain
3. Configure DNS settings as instructed

## Environment-Specific URLs

The app now supports both platforms:

### Production
- **Netlify**: `https://jewgo-app.netlify.app`
- **Vercel**: `https://jewgo-app.vercel.app` (preserved)

### Staging
- **Netlify**: `https://staging.jewgo-app.netlify.app`
- **Vercel**: `https://staging.jewgo-app.vercel.app` (preserved)

## Switching Between Platforms

### To Switch to Netlify
1. Update `NEXTAUTH_URL` to your Netlify URL
2. Update any hardcoded URLs in your code
3. Deploy to Netlify

### To Switch Back to Vercel
1. Update `NEXTAUTH_URL` to your Vercel URL
2. Uncomment Vercel-specific configurations
3. Deploy to Vercel

## Monitoring and Health Checks

The monitoring configuration now includes both Netlify and Vercel endpoints:
- `https://jewgo-app.netlify.app`
- `https://jewgo-app.netlify.app/health`
- `https://jewgo-app.vercel.app` (preserved)
- `https://jewgo-app.vercel.app/health` (preserved)

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all environment variables are set
   - Verify Node.js version (22.x)
   - Check build logs in Netlify dashboard

2. **API Routes Not Working**
   - Ensure `NEXT_PUBLIC_BACKEND_URL` is set correctly
   - Check that backend is running on Render

3. **Authentication Issues**
   - Verify `NEXTAUTH_URL` matches your Netlify domain
   - Check that `NEXTAUTH_SECRET` is set

4. **Database Connection Issues**
   - Ensure `DATABASE_URL` is accessible from Netlify
   - Check database connection limits

### Debug Commands
```bash
# Test build locally
cd frontend
npm run build

# Test environment variables
npm run validate-env

# Check health endpoints
curl https://your-app.netlify.app/health
```

## Performance Optimization

Netlify automatically provides:
- Global CDN
- Automatic HTTPS
- Image optimization
- Asset compression
- Edge functions (if needed)

## Security Considerations

- All security headers are configured in `frontend/_headers`
- HTTPS is enforced automatically
- Environment variables are encrypted
- No sensitive data in build artifacts

## Rollback Strategy

If you need to rollback to Vercel:
1. All Vercel configurations are preserved
2. Simply update environment variables
3. Deploy to Vercel instead of Netlify

## Support

For Netlify-specific issues:
- [Netlify Documentation](https://docs.netlify.com)
- [Netlify Community](https://community.netlify.com)
- [Netlify Support](https://www.netlify.com/support/)

For app-specific issues:
- Check the main documentation in `/docs`
- Review deployment logs
- Test locally first
