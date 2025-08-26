# Admin System Migration to Supabase

## Overview

The admin RBAC and configuration system has been migrated from using the main PostgreSQL database (via Prisma) to using Supabase for consistency with the authentication system.

## Why Migrate to Supabase?

### **Consistency**
- **Authentication**: Already uses Supabase for user management
- **User Data**: User profiles and sessions are in Supabase
- **Security**: Row Level Security (RLS) policies in Supabase
- **Audit Trail**: Centralized audit logging in Supabase

### **Security Benefits**
- **Row Level Security**: Automatic data access control
- **Audit Logging**: Built-in triggers for all admin operations
- **Policy Enforcement**: Database-level security policies
- **User Context**: Automatic user context in all operations

### **Maintenance Benefits**
- **Single Source of Truth**: All user-related data in one place
- **Simplified Architecture**: No need for dual database access
- **Better Integration**: Seamless integration with auth system

## Migration Summary

### **What Changed**

#### **Database Tables**
- ✅ `admin_roles` table moved to Supabase with RLS policies
- ✅ `admin_config` table created in Supabase with RLS policies
- ✅ Audit logging triggers added for all operations
- ✅ Helper functions for role management

#### **API Endpoints**
- ✅ Updated to use Supabase client instead of Prisma
- ✅ Maintained same API interface for backward compatibility
- ✅ Enhanced error handling for Supabase operations

#### **Authentication**
- ✅ Admin role lookup now uses Supabase
- ✅ Consistent with existing auth flow
- ✅ Better integration with user sessions

### **What Stayed the Same**

#### **API Interface**
- ✅ All endpoint URLs remain the same
- ✅ Request/response formats unchanged
- ✅ Permission system unchanged
- ✅ CSRF protection unchanged

#### **Client Usage**
- ✅ No changes required for frontend components
- ✅ Same admin UI functionality
- ✅ Same role management interface

## Migration Steps

### **1. Apply Supabase Migrations**

```bash
# Apply all migrations
supabase db push

# Or apply specific migrations
supabase db push --include-all
```

### **2. Update Environment Variables**

Ensure these are set in your `.env` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **3. Seed Super Admin (Optional)**

```bash
cd frontend && ADMIN_SEED_SUPERADMIN_EMAIL="admin@example.com" npm run db:seed
```

### **4. Verify Migration**

Test the admin endpoints:
- `GET /api/admin/system/config` - Should return merged config
- `GET /api/admin/roles` - Should return admin roles
- `GET /api/admin/system/stats` - Should include health checks

## Database Schema

### **Admin Roles Table (Supabase)**

```sql
CREATE TABLE public.admin_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('moderator','data_admin','system_admin','super_admin')),
    assigned_by VARCHAR(50) REFERENCES public.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    UNIQUE(user_id, role),
    INDEX idx_admin_roles_user_id (user_id),
    INDEX idx_admin_roles_role (role),
    INDEX idx_admin_roles_active (is_active)
);
```

### **Admin Config Table (Supabase)**

```sql
CREATE TABLE public.admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(50) REFERENCES public.users(id),
    
    INDEX idx_admin_config_key (key)
);
```

## Security Features

### **Row Level Security (RLS)**

#### **Admin Roles Policies**
- Users can only view their own roles
- Only super admins can manage all roles
- Automatic user context enforcement

#### **Admin Config Policies**
- Only super admins can view configuration
- Only super admins can modify configuration
- Automatic permission checking

### **Audit Logging**

#### **Automatic Triggers**
- Role assignments logged
- Role updates logged
- Role removals logged
- Config changes logged

#### **Audit Data**
- User performing action
- Action type and details
- Old and new values
- Timestamp and metadata

## Helper Functions

### **Role Management**

```sql
-- Get user's admin role with precedence
SELECT get_user_admin_role('user_id');

-- Assign admin role (super admin only)
SELECT assign_admin_role('target_user_id', 'role', 'assigned_by');

-- Remove admin role (super admin only)
SELECT remove_admin_role('target_user_id', 'role', 'removed_by');
```

### **Configuration Management**

```sql
-- Get system configuration with defaults
SELECT get_system_config();

-- Update system configuration (super admin only)
SELECT update_system_config('key', 'value', 'updated_by');
```

## Rollback Plan

If needed, the system can be rolled back to the Prisma-based approach:

1. **Keep Legacy Migrations**: Prisma migrations are preserved
2. **API Compatibility**: Endpoints maintain same interface
3. **Gradual Migration**: Can run both systems in parallel
4. **Data Migration**: Can migrate data between systems

## Testing

### **Unit Tests**
- ✅ Admin role resolution
- ✅ Permission checking
- ✅ Configuration management
- ✅ CSRF validation

### **Integration Tests**
- ✅ API endpoint functionality
- ✅ Database operations
- ✅ Security policies
- ✅ Audit logging

### **Manual Testing**
- ✅ Admin dashboard access
- ✅ Role management UI
- ✅ Configuration updates
- ✅ User permissions

## Performance Considerations

### **Optimizations**
- ✅ Indexed queries for role lookups
- ✅ Efficient permission checking
- ✅ Cached configuration values
- ✅ Optimized audit logging

### **Monitoring**
- ✅ Query performance tracking
- ✅ Error rate monitoring
- ✅ Response time metrics
- ✅ Security event logging

## Future Enhancements

### **Planned Features**
- 🔄 Role expiration notifications
- 🔄 Bulk role operations
- 🔄 Advanced audit reporting
- 🔄 Configuration validation rules

### **Potential Improvements**
- 🔄 Role inheritance system
- 🔄 Dynamic permission assignment
- 🔄 Multi-tenant support
- 🔄 Advanced security policies

## Support

For issues with the admin system:

1. **Check Supabase Dashboard**: Verify table structure and policies
2. **Review Audit Logs**: Check for security events
3. **Test API Endpoints**: Verify functionality
4. **Check Environment**: Ensure Supabase configuration is correct

## Conclusion

The migration to Supabase provides a more consistent, secure, and maintainable admin system that integrates seamlessly with the existing authentication infrastructure. The migration maintains backward compatibility while providing enhanced security and audit capabilities.
