# Vercel Build Fix: routes-manifest.json Issue

## Problem Description

The Vercel build was failing with the following error:

```
Error: The file "/vercel/path0/frontend/jewgo-frontend/.next/routes-manifest.json" couldn't be found. 
This is often caused by a misconfiguration in your project.
```

This error occurs when Vercel cannot locate the `routes-manifest.json` file that Next.js generates during the build process.

## Root Causes

1. **Build Output Directory Mismatch**: Vercel was looking for the file in the wrong location
2. **Next.js 15 Compatibility**: Some experimental features in Next.js 15 can interfere with Vercel builds
3. **Build Process Issues**: The build script was not properly handling the Vercel environment
4. **Prisma Generation**: Database client generation during build could interfere with the build output

## Applied Fixes

### 1. Updated Next.js Configuration (`next.config.js`)

- Added `outputFileTracingRoot: process.cwd()` to ensure proper build output
- Enhanced webpack configuration for Vercel builds
- Added proper chunk and asset naming for Vercel compatibility
- Removed problematic experimental features that could interfere with builds

### 2. Updated Vercel Configuration (`vercel.json`)

- Moved `vercel.json` to the frontend root directory for proper detection
- Added `regions: ["iad1"]` for Washington, D.C. deployment
- Ensured proper `outputDirectory: ".next"` configuration
- Configured proper build commands and environment variables

### 3. Enhanced Build Scripts

- **`scripts/build-env-check.js`**: Added Vercel-specific environment variable handling
- **`scripts/vercel-build-fix.js`**: New script to diagnose and fix Vercel build issues
- **`package.json`**: Updated build script to include the fix scripts

### 4. Build Process Improvements

- Removed `--no-lint` flag from build command to ensure proper build validation
- Added proper environment variable handling for Vercel builds
- Enhanced error handling and logging during the build process

## Key Changes Made

### Next.js Config Updates

```javascript
experimental: {
  // Ensure proper build output for Vercel
  outputFileTracingRoot: process.cwd(),
  // Other experimental features...
}

webpack: (config, { isServer, dev, webpack }) => {
  // Ensure proper output for Vercel builds
  if (isVercel) {
    config.output = {
      ...config.output,
      // Ensure proper chunk naming for Vercel
      chunkFilename: isServer 
        ? 'static/chunks/[id].js' 
        : 'static/chunks/[name].[chunkhash].js',
      // Ensure proper asset naming
      assetModuleFilename: 'static/media/[name].[hash][ext]',
    };
  }
  return config;
}
```

### Vercel Configuration

```json
{
  "version": 2,
  "name": "jewgo-frontend",
  "buildCommand": "npm run validate-env && npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Build Script Updates

```json
{
  "scripts": {
    "build": "node scripts/build-env-check.js && node scripts/vercel-build-fix.js && prisma generate --schema=./prisma/schema.prisma && next build"
  }
}
```

## Verification Steps

After applying these fixes, verify the build works by:

1. **Local Build Test**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Check Build Output**:
   - Verify `.next/routes-manifest.json` exists
   - Check that all build artifacts are properly generated

3. **Vercel Deployment**:
   - Push changes to trigger a new Vercel build
   - Monitor build logs for any remaining issues

## Common Issues and Solutions

### Issue: Still getting routes-manifest.json error

**Solution**: Check that:
- `vercel.json` is in the frontend root directory
- Build command is properly configured
- No conflicting experimental features are enabled

### Issue: Build takes too long

**Solution**: 
- Ensure `NODE_ENV=production` is set
- Disable unnecessary experimental features
- Optimize Prisma generation if needed

### Issue: Prisma generation fails

**Solution**: 
- Check that `DATABASE_URL` is properly set for build time
- Verify Prisma schema is valid
- Ensure all dependencies are properly installed

## Prevention

To prevent this issue in the future:

1. **Always test builds locally** before deploying
2. **Keep Next.js configuration minimal** for production builds
3. **Monitor Vercel build logs** for early detection of issues
4. **Use the build fix scripts** as part of the CI/CD process
5. **Regularly update dependencies** to avoid compatibility issues

## Related Documentation

- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Next.js Guide](https://vercel.com/docs/functions/quickstart)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

## Support

If issues persist after applying these fixes:

1. Check Vercel build logs for specific error messages
2. Verify all configuration files are properly formatted
3. Test with a minimal Next.js configuration
4. Contact Vercel support if the issue is platform-specific
