# Migration Guide: Server-Only Module Import Restrictions

## Overview

To improve security and prevent accidental exposure of server-only code to the client, we've implemented import restrictions for server-only modules.

## Affected Modules

The following modules are now restricted from client-side imports:

- `@/lib/server/**` - All server-only utilities
- `@/lib/admin/**` - All admin-related modules
- `@/lib/utils/admin` - Legacy admin utilities

## Migration Steps

### 1. Server Components

If you're working in a server component (files with `use server` directive or API routes), update your imports:

**Before:**
```typescript
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/utils/admin';
```

**After:**
```typescript
import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { hasPermission } from '@/lib/server/admin-utils';
```

### 2. Client Components

If you're working in a client component and need admin functionality:

**Option A: Use the `useAuth` hook**
```typescript
import { useAuth } from '@/lib/hooks/useAuth';

function MyComponent() {
  const { user, isAdmin } = useAuth();
  
  if (!isAdmin) {
    return <div>Access denied</div>;
  }
  
  return <div>Admin content</div>;
}
```

**Option B: Create a server action**
```typescript
// In a separate server file (e.g., actions/admin.ts)
'use server';

import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { hasPermission } from '@/lib/server/admin-utils';

export async function performAdminAction(data: any) {
  const admin = await requireAdminOrThrow();
  // ... admin logic
}

// In your client component
import { performAdminAction } from '@/lib/actions/admin';

function MyComponent() {
  const handleAction = async () => {
    await performAdminAction(data);
  };
  
  return <button onClick={handleAction}>Perform Action</button>;
}
```

### 3. API Routes

For API routes, ensure you're using the proper patterns:

```typescript
import { handleRoute, json } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

// Ensure Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    // ... your logic
    return json({ success: true });
  });
}
```

## Common Patterns

### Permission Checking

**Server-side:**
```typescript
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';

if (!hasPermission(admin, ADMIN_PERMISSIONS.RESTAURANT_EDIT)) {
  throw new Error('Insufficient permissions');
}
```

**Client-side:**
```typescript
import { useAuth } from '@/lib/hooks/useAuth';

const { user } = useAuth();
const canEditRestaurants = user?.permissions?.includes('restaurant:edit');
```

### Admin Authentication

**Server-side:**
```typescript
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

const admin = await requireAdminOrThrow(request);
```

**Client-side:**
```typescript
import { useAuth } from '@/lib/hooks/useAuth';

const { isAdmin } = useAuth();
```

## Troubleshooting

### ESLint Errors

If you see ESLint errors about restricted imports:

1. **For server components**: Update imports to use `@/lib/server/*` modules
2. **For client components**: Use the `useAuth` hook or create server actions
3. **For API routes**: Ensure you're using `handleRoute` wrapper and `runtime = 'nodejs'`

### Type Errors

If you encounter TypeScript errors:

1. Ensure you're importing the correct types from the right modules
2. Check that server-only types aren't being used in client components
3. Use proper type guards and null checks

## Security Notes

- Never import server-only modules in client components
- Always use the `handleRoute` wrapper for admin API routes
- Ensure `runtime = 'nodejs'` is set for all admin routes
- Use proper permission checking on both client and server sides

## Need Help?

If you encounter issues during migration:

1. Check the existing working examples in the codebase
2. Review the server-only module documentation
3. Create a new issue with details about your specific use case
