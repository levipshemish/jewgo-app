# Prisma Query Engine Bundling Fix

## Issue Summary

**Problem**: Next.js `optimizePackageImports` for `@prisma/client` prevented Query Engine binary from bundling, causing runtime initialization failure in production.

**Error**: `PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"`

**Root Cause**: Next.js experimental `optimizePackageImports` feature was interfering with Prisma's native binary bundling process.

## Root Cause Analysis

### 1. Next.js `optimizePackageImports` Configuration
The `next.config.js` file had:
```javascript
experimental: {
  optimizePackageImports: ['@prisma/client', 'lucide-react'],
},
```

This experimental feature, while intended for bundle size reduction, was inadvertently causing native binaries like Prisma's Query Engine to be excluded or improperly handled during the Next.js bundling process.

### 2. Prisma Query Engine Location
The error showed that Prisma was searching for the Query Engine in these locations:
- `/var/task/frontend/node_modules/.prisma/client`
- `/var/task/frontend/.next/server`
- `/vercel/path0/frontend/node_modules/@prisma/client`
- `/var/task/frontend/.prisma/client`
- `/tmp/prisma-engines`

None of these locations contained the required `libquery_engine-rhel-openssl-3.0.x.so.node` file.

### 3. Build Process Verification
The `package.json` confirmed that `prisma generate` was executed before `next build`:
```json
"build": "prisma generate && next build && node scripts/post-build-fix.js"
```

This ruled out a missing `prisma generate` step as the direct cause.

## Implemented Fix

### 1. Removed `@prisma/client` from `optimizePackageImports`

**File**: `frontend/next.config.js`

**Change**:
```javascript
// Before
experimental: {
  optimizePackageImports: ['@prisma/client', 'lucide-react'],
},

// After
experimental: {
  // Removed @prisma/client from optimizePackageImports to prevent Query Engine bundling issues
  optimizePackageImports: ['lucide-react'],
},
```

### 2. Enhanced Webpack Configuration

**File**: `frontend/next.config.js`

**Added**:
```javascript
// Handle Prisma Query Engine binaries for server-side rendering
if (isServer) {
  // Copy Prisma Query Engine binaries to the output directory
  config.externals = config.externals || [];
  config.externals.push({
    '@prisma/client': 'commonjs @prisma/client',
  });

  // Ensure Prisma binaries are properly bundled
  config.module.rules.push({
    test: /\.node$/,
    use: 'node-loader',
    type: 'javascript/auto',
  });
}
```

### 3. Updated Post-Build Script

**File**: `frontend/scripts/post-build-fix.js`

**Added**: `copyPrismaBinaries()` function that:
- Locates Prisma Query Engine binaries in `node_modules/.prisma/client`
- Copies them to `.next/server/` directory
- Ensures they're available at runtime

### 4. Enhanced Prisma Client Configuration

**File**: `frontend/lib/db/prisma.ts`

**Improvements**:
- Better error handling and logging
- Proper singleton pattern for production vs development
- Graceful shutdown handling
- Explicit datasource configuration

### 5. Added Vercel Configuration

**File**: `frontend/vercel.json`

**Added**:
```json
{
  "env": {
    "PRISMA_QUERY_ENGINE_TYPE": "library"
  }
}
```

### 6. Added Dependencies

**Added**: `node-loader` package for handling `.node` files in webpack.

## Verification Steps

### 1. Build Process Verification
```bash
npm run build
```

**Expected Output**:
```
🔧 Copying Prisma Query Engine binaries...
📦 Copied: libquery_engine-darwin-arm64.dylib.node
📦 Copied: libquery_engine-linux-musl.so.node
✅ Prisma binaries copied: 2 file(s)
```

### 2. Binary Location Verification
```bash
ls -la .next/server/ | grep query_engine
```

**Expected Output**:
```
-rwxr-xr-x@  1 user  staff  17251592 Aug 17 18:30 libquery_engine-darwin-arm64.dylib.node
-rwxr-xr-x@  1 user  staff  16132392 Aug 17 18:30 libquery_engine-linux-musl.so.node
```

### 3. Configuration Test
```bash
npm run test:prisma
```

**Expected Output**:
```
✅ Prisma client directory exists
✅ Query Engine files found: libquery_engine-darwin-arm64.dylib.node, libquery_engine-linux-musl.so.node
✅ Prisma client can be imported
✅ Prisma client can be instantiated
✅ Prisma client configuration is valid
```

## Environment Variables

### Required for Production
- `DATABASE_URL`: Database connection string
- `PRISMA_QUERY_ENGINE_TYPE`: Set to "library" for Vercel deployment

### Development
- `DATABASE_URL`: Local database connection string

## Deployment Considerations

### Vercel
- The `vercel.json` configuration ensures proper Query Engine handling
- Post-build script automatically copies binaries to the correct location
- Environment variable `PRISMA_QUERY_ENGINE_TYPE=library` is set

### Other Platforms
- Ensure the post-build script runs after `next build`
- Verify that `.node` files are not excluded from deployment
- Check that the server directory contains the Query Engine binaries

## Monitoring and Maintenance

### Health Checks
- Monitor for `PrismaClientInitializationError` in production logs
- Verify Query Engine binaries are present in deployment artifacts
- Test database connectivity after deployments

### Troubleshooting
1. **Missing Query Engine**: Run `npm run test:prisma` to verify configuration
2. **Build Failures**: Check that `node-loader` is installed
3. **Runtime Errors**: Verify environment variables are set correctly

## Related Files

- `frontend/next.config.js` - Main configuration changes
- `frontend/lib/db/prisma.ts` - Prisma client configuration
- `frontend/scripts/post-build-fix.js` - Post-build binary copying
- `frontend/vercel.json` - Vercel-specific configuration
- `frontend/scripts/test-prisma-config.js` - Configuration testing
- `frontend/package.json` - Build scripts and dependencies

## Prevention

To prevent similar issues in the future:

1. **Avoid experimental features** for critical dependencies like Prisma
2. **Test native binary bundling** in staging environments
3. **Monitor build artifacts** to ensure all required files are present
4. **Use comprehensive testing** scripts for database connectivity
5. **Document deployment requirements** for native dependencies

## References

- [Prisma Next.js Integration Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Next.js Experimental Features](https://nextjs.org/docs/app/api-reference/next-config-js#experimental)
- [Prisma Query Engine Troubleshooting](https://www.prisma.io/docs/guides/troubleshooting/environmental-issues/query-engine-not-found)
