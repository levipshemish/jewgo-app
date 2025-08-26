# Admin Roles Production Setup Guide

## ✅ **Status: COMPLETED**

The admin role system has been successfully implemented and is fully functional in production with Supabase.

## 🎯 **Overview**

This guide covers the complete admin role-based access control (RBAC) system implemented with Supabase, including:

- **Super Admin**: Full system access
- **System Admin**: System-wide administrative access  
- **Data Admin**: Data management and moderation
- **Moderator**: Basic moderation capabilities

## 🏗️ **Architecture**

### Database Tables
- `admin_roles`: Stores user admin role assignments
- `admin_config`: System configuration settings
- `auth.users`: Supabase auth users with `is_super_admin` metadata

### Security Features
- **Row Level Security (RLS)**: Database-level access control
- **Supabase Auth Integration**: Secure user authentication
- **Role-based Functions**: Database functions for role management

## 🚀 **Quick Start**

### 1. Verify Setup
```bash
cd frontend
npm run admin:verify
```

### 2. Check Admin Users
```bash
npm run admin:list
```

### 3. Test Admin Access
```bash
npm run admin:test admin@jewgo.app
```

## 📋 **Admin Management Commands**

### Available Scripts
```bash
# Verify admin system setup
npm run admin:verify

# List all admin users
npm run admin:list

# Create a super admin (requires manual SQL)
npm run admin:create-super-admin <email> "<name>"

# Assign admin role to user
npm run admin:assign-role <email> <role>

# Get user's admin role
npm run admin:get-role <email>

# Test admin access for specific user
npm run admin:test <email>
```

## 👑 **Creating Super Admins**

### Method 1: Manual SQL (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL (replace with actual email):
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_super_admin}', 'true'::jsonb
) WHERE email = 'admin@jewgo.app';
```

### Method 2: Using Script
```bash
npm run admin:create-super-admin admin@jewgo.app "Admin Name"
```
*Note: This provides instructions for manual SQL execution*

## 🔧 **Role Assignment**

### Available Roles
- `super_admin`: Full system access
- `system_admin`: System administration
- `data_admin`: Data management
- `moderator`: Basic moderation

### Assign Role
```bash
npm run admin:assign-role user@example.com moderator
```

## 🛡️ **Security Features**

### Row Level Security (RLS)
- Users can only view their own admin roles
- Super admins can manage all admin roles
- Secure function access controls

### Authentication
- Integrated with Supabase Auth
- Service role key for admin operations
- Secure metadata storage

## 📊 **Database Schema**

### admin_roles Table
```sql
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('moderator', 'data_admin', 'system_admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);
```

### admin_config Table
```sql
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔍 **Verification**

### Check User Status
```bash
# Test specific user
npm run admin:test user@example.com

# Expected output for super admin:
# ✅ Found user: user@example.com
# 👑 Super Admin Status: ✅ YES
# 🎉 User is a super admin!
```

### Verify System Setup
```bash
npm run admin:verify

# Expected output:
# ✅ admin_roles table exists
# ✅ get_user_admin_role function exists
# ✅ assign_admin_role function exists
# ✅ Admin role setup verification complete
```

## 🚨 **Troubleshooting**

### Common Issues

#### User Not Found
```
❌ User user@example.com not found in auth.users
```
**Solution**: Ensure user has signed up through the app first

#### Permission Denied
```
❌ Error: permission denied
```
**Solution**: Check if user has proper admin role or super admin status

#### Function Not Found
```
❌ Error: function get_user_admin_role does not exist
```
**Solution**: Run `npm run admin:verify` to check setup

### Reset Admin Setup
If you need to reset the admin system:

1. **Backup existing data** (if any)
2. **Drop and recreate tables**:
```sql
DROP TABLE IF EXISTS admin_roles CASCADE;
DROP TABLE IF EXISTS admin_config CASCADE;
```
3. **Re-run migrations** using the provided SQL scripts

## 📝 **API Integration**

### Frontend Usage
```typescript
import { requireAdmin, getAdminUser } from '@/lib/admin/auth';

// Protect API routes
export async function GET(request: Request) {
  const adminUser = await requireAdmin(request);
  // ... admin logic
}
```

### Admin Functions
- `get_user_admin_role(user_id)`: Get user's admin role
- `assign_admin_role(user_id, role, assigned_by)`: Assign role
- `remove_admin_role(user_id, removed_by)`: Remove role

## 🔄 **Migration History**

### Completed Steps
1. ✅ Created admin tables with proper schema
2. ✅ Implemented RLS policies
3. ✅ Created admin management functions
4. ✅ Integrated with Supabase Auth
5. ✅ Created management scripts
6. ✅ Verified super admin setup
7. ✅ Tested admin access system

### Files Modified
- `supabase/migrations/`: Database schema and functions
- `frontend/lib/admin/auth.ts`: Admin authentication logic
- `frontend/scripts/`: Admin management scripts
- `frontend/package.json`: Admin npm scripts

## 🎯 **Next Steps**

The admin system is now fully functional. You can:

1. **Create additional super admins** using the provided methods
2. **Assign roles to users** using the management scripts
3. **Access admin endpoints** at `/api/admin/*`
4. **Use admin dashboard** at `/admin/*`

## 📞 **Support**

For issues or questions:
1. Check this documentation
2. Run verification scripts
3. Review error logs
4. Check Supabase Dashboard for database issues

---

**Last Updated**: August 26, 2025  
**Status**: ✅ Production Ready
