# Admin Authentication Migration Guide

## Overview

This document outlines the migration from legacy admin authentication patterns to the new server-only architecture.

## requireAdmin Signature Change

### Before (Legacy)
```typescript
// Old signature - accepted any request type
export async function requireAdmin(request: any): Promise<AdminUser | null>
```

### After (Current)
```typescript
// New signature - requires Fetch Request object
export async function requireAdmin(request: Request): Promise<AdminUser | null>
```

### Migration Steps

1. **Update Import Paths**
   ```typescript
   // Old
   import { requireAdmin } from '@/lib/admin/auth';
   
   // New
   import { requireAdmin } from '@/lib/server/admin-auth';
   ```

2. **Update Route Handlers**
   ```typescript
   // Old - NextRequest
   import { NextRequest } from 'next/server';
   
   export async function GET(request: NextRequest) {
     const admin = await requireAdmin(request);
     // ...
   }
   
   // New - Fetch Request
   export async function GET(request: Request) {
     const admin = await requireAdmin(request);
     // ...
   }
   ```

3. **Use handleRoute Wrapper**
   ```typescript
   // Recommended pattern
   import { handleRoute } from '@/lib/server/route-helpers';
   import { requireAdminOrThrow } from '@/lib/server/admin-auth';
   
   export async function GET(request: Request) {
     return handleRoute(async () => {
       const admin = await requireAdminOrThrow(request);
       return Response.json({ data: 'success' });
     });
   }
   ```

## Type Safety Improvements

### AdminUser.token is now optional
```typescript
// Before
export type AdminUser = {
  // ...
  token: string; // Required
};

// After
export type AdminUser = {
  // ...
  token?: string; // Optional - may not be available in all contexts
};
```

### Permission Normalization
All permission checks now use centralized normalization:
```typescript
// Before - inconsistent normalization
user.permissions.includes(permission.toLowerCase())

// After - centralized normalization
import { normalizePermission, normalizePermissions } from '@/lib/server/security';
const normalizedPermission = normalizePermission(permission);
const normalizedUserPermissions = normalizePermissions(user.permissions);
normalizedUserPermissions.includes(normalizedPermission)
```

## Security Improvements

### X-Forwarded-For Parsing
IP address extraction now properly handles proxy headers:
```typescript
// Before
const clientIP = (request as any).ip || 'unknown';

// After
const xff = request.headers.get('x-forwarded-for') || '';
const clientIP = xff.split(',')[0]?.trim() || 'unknown';
```

### Content-Type Handling
No-store headers no longer include Content-Type to avoid overriding non-JSON responses:
```typescript
// Before
export function getNoStoreHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json', // Could override non-JSON responses
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    // ...
  };
}

// After
export function getNoStoreHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    // Content-Type must be set explicitly by callers
  };
}
```

## ESLint Enforcement

Add this rule to enforce proper route handling:

```javascript
// .eslintrc.js
{
  files: ['app/api/admin/**/*.ts'],
  rules: {
    'no-restricted-exports': [
      'error',
      {
        restrictedNamedExports: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        message: 'Admin API routes must use handleRoute wrapper. Export a function that returns handleRoute(...) instead.'
      }
    ]
  }
}
```

## Breaking Changes

1. **requireAdmin now requires Fetch Request object** - Update all route handlers
2. **AdminUser.token is optional** - Handle cases where token may not be available
3. **Permission normalization is centralized** - All permission checks use the same normalization
4. **Content-Type must be set explicitly** - Update response headers where needed

## Testing

After migration, verify:
1. All admin routes work correctly
2. Permission checks function as expected
3. Error responses have proper Content-Type headers
4. No cross-request leaks occur (use handleRoute wrapper)
