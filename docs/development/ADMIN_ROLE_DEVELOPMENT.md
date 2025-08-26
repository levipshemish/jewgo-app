# Admin Role Development Guide

## Overview

This guide explains how to work with admin roles and permissions during local development, including the development overrides that make testing easier.

## 🔐 Admin Role System

### Available Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `moderator` | Basic moderation access | Restaurant approval, review moderation |
| `data_admin` | Data management access | Restaurant editing, user viewing, bulk operations |
| `system_admin` | System administration | Full access except role management |
| `super_admin` | Complete system access | All permissions including role management |

### Permission Matrix

| Permission | moderator | data_admin | system_admin | super_admin |
|------------|-----------|------------|--------------|-------------|
| `restaurant:view` | ✅ | ✅ | ✅ | ✅ |
| `restaurant:edit` | ❌ | ✅ | ✅ | ✅ |
| `restaurant:delete` | ❌ | ❌ | ✅ | ✅ |
| `restaurant:approve` | ✅ | ✅ | ✅ | ✅ |
| `review:view` | ✅ | ✅ | ✅ | ✅ |
| `review:moderate` | ✅ | ✅ | ✅ | ✅ |
| `review:delete` | ❌ | ❌ | ✅ | ✅ |
| `user:view` | ❌ | ✅ | ✅ | ✅ |
| `user:edit` | ❌ | ❌ | ✅ | ✅ |
| `user:delete` | ❌ | ❌ | ❌ | ✅ |
| `system:settings` | ❌ | ❌ | ✅ | ✅ |
| `audit:view` | ❌ | ❌ | ✅ | ✅ |
| `role:view` | ❌ | ❌ | ❌ | ✅ |
| `role:edit` | ❌ | ❌ | ❌ | ✅ |

## 🛠️ Development Overrides

### Problem

During local development, you might encounter 403 errors when accessing admin features because:

1. Your user account doesn't have an admin role assigned in the database
2. Your assigned role (e.g., `moderator`) doesn't have the required permissions
3. You need to test features that require higher permission levels

### Solution

The admin system includes development-only overrides that allow you to bypass these restrictions locally.

### Environment Variables

Add one of these to your `.env.local` file:

#### Option 1: Set Default Role
```bash
# Set a default admin role for development
ADMIN_DEFAULT_ROLE=system_admin
```

#### Option 2: Bypass All Permissions
```bash
# Give super admin access in development
ADMIN_BYPASS_PERMS=true
```

### Usage Examples

#### Testing User Management
If you're getting 403 errors on the Users page:

```bash
# Add to .env.local
ADMIN_DEFAULT_ROLE=system_admin
```

This gives you `user:view` and `user:edit` permissions.

#### Testing Role Management
If you need to test role assignment features:

```bash
# Add to .env.local
ADMIN_BYPASS_PERMS=true
```

This gives you all permissions including `role:view` and `role:edit`.

#### Testing with Specific Role
To test how a specific role behaves:

```bash
# Add to .env.local
ADMIN_DEFAULT_ROLE=moderator
```

This lets you test the moderator experience and see what features are restricted.

### Security Notes

⚠️ **Important**: These overrides only work in development mode (`NODE_ENV=development`). They are completely ignored in production.

- `ADMIN_DEFAULT_ROLE` only accepts valid role names: `moderator`, `data_admin`, `system_admin`, `super_admin`
- `ADMIN_BYPASS_PERMS=true` gives you full super admin access
- These settings should never be committed to production environments

## 🔧 Implementation Details

### Code Location
The development overrides are implemented in `frontend/lib/admin/auth.ts` in the `requireAdmin` function.

### How It Works

1. **Role Override**: If `ADMIN_DEFAULT_ROLE` is set, it overrides the database role
2. **Permission Bypass**: If `ADMIN_BYPASS_PERMS=true`, it returns a super admin user
3. **Environment Check**: Both only work when `NODE_ENV=development`

### Example Flow

```typescript
// Normal flow (production)
user.id → getUserAdminRole() → database role → permissions

// Development override flow
user.id → getUserAdminRole() → check env vars → override role/permissions
```

## 🚀 Quick Start

1. **Create `.env.local`** in the frontend directory
2. **Add override**: `ADMIN_DEFAULT_ROLE=system_admin`
3. **Restart dev server**: `npm run dev`
4. **Test admin features**: Navigate to `/admin/database/users`

## 🐛 Troubleshooting

### Still Getting 403 Errors?

1. **Check environment**: Ensure `NODE_ENV=development`
2. **Restart server**: Environment variables require server restart
3. **Check syntax**: No spaces around `=` in `.env.local`
4. **Verify role**: Use one of the valid role names

### Valid Role Names
- `moderator`
- `data_admin` 
- `system_admin`
- `super_admin`

### Common Issues

#### "Invalid role" error
Make sure you're using one of the valid role names listed above.

#### Override not working
- Check that `.env.local` is in the `frontend/` directory
- Ensure the dev server was restarted after adding the variable
- Verify `NODE_ENV=development` in your environment

#### Production concerns
These overrides are completely disabled in production. The code includes explicit checks for `NODE_ENV=development`.

## 📝 Best Practices

1. **Use specific roles** when testing role-specific features
2. **Use bypass** when testing super admin features
3. **Document your setup** in team documentation
4. **Never commit** these settings to production
5. **Test without overrides** to ensure proper permission checks work

## 🔄 Switching Between Roles

To test different permission levels:

```bash
# Test moderator access
echo 'ADMIN_DEFAULT_ROLE=moderator' > .env.local

# Test data admin access  
echo 'ADMIN_DEFAULT_ROLE=data_admin' > .env.local

# Test system admin access
echo 'ADMIN_DEFAULT_ROLE=system_admin' > .env.local

# Test super admin access
echo 'ADMIN_BYPASS_PERMS=true' > .env.local
```

Remember to restart the dev server after changing the environment variable.
