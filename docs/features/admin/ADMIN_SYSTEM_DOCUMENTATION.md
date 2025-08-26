# Admin System Documentation

## Overview

The JewGo admin system provides comprehensive administrative capabilities for managing users, restaurants, reviews, and system configuration. The system includes role-based access control (RBAC), audit logging, and secure authentication mechanisms.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Authentication & Security](#authentication--security)
3. [Admin Dashboard](#admin-dashboard)
4. [Database Management](#database-management)
5. [API Endpoints](#api-endpoints)
6. [Deployment & Configuration](#deployment--configuration)
7. [Troubleshooting](#troubleshooting)
8. [Recent Fixes](#recent-fixes)

## System Architecture

### Frontend Components

```
frontend/app/admin/
├── page.tsx                    # Main admin dashboard
├── layout.tsx                  # Admin layout with authentication
├── actions.ts                  # Server actions for admin operations
├── database/                   # Database management pages
│   ├── restaurants/page.tsx
│   ├── reviews/page.tsx
│   ├── synagogues/page.tsx
│   └── users/page.tsx
└── api/                        # Admin API routes
    ├── csrf/route.ts           # CSRF token generation
    ├── restaurants/route.ts
    ├── reviews/route.ts
    ├── synagogues/route.ts
    └── users/route.ts
```

### Backend Services

```
frontend/lib/admin/
├── auth.ts                     # Admin authentication
├── database.ts                 # Database service
├── audit.ts                    # Audit logging
├── csrf.ts                     # CSRF token management
└── types.ts                    # Admin type definitions
```

## Authentication & Security

### Admin Authentication Flow

1. **Session Validation**: Admin layout validates user session using Supabase
2. **Role Verification**: Checks user's admin role in `admin_roles` table
3. **CSRF Protection**: Generates and validates CSRF tokens for admin actions
4. **Permission Checking**: Validates specific permissions for each operation

### Security Features

- **CSRF Token Protection**: All admin actions require valid CSRF tokens
- **Role-Based Access Control**: Granular permissions for different admin functions
- **Audit Logging**: All admin actions are logged with user and timestamp
- **Session Management**: Secure session handling with automatic timeout
- **Input Validation**: Comprehensive validation of all admin inputs

### Environment Variables

```bash
# Required for admin functionality
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Admin Dashboard

### Main Dashboard Features

- **System Statistics**: Real-time metrics for users, restaurants, reviews
- **Database Overview**: Table counts and data insights
- **Audit Logs**: Recent admin actions and system events
- **Quick Actions**: Direct links to common admin tasks

### Database Management Pages

#### Restaurants Management
- View all restaurants with pagination
- Edit restaurant details
- Manage restaurant hours and specials
- Bulk operations for restaurant data

#### Reviews Management
- Moderate user reviews
- Filter reviews by status and rating
- Bulk approve/reject operations
- Review analytics and trends

#### Synagogues Management
- Manage synagogue listings
- Update location and contact information
- Handle synagogue claims and verifications

#### Users Management
- View user accounts and roles
- Manage user permissions
- Handle user account issues
- User activity monitoring

## Database Management

### Database Schema

#### Admin Tables (Supabase)
```sql
-- Admin roles table
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin configuration table
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Main Database Tables (PostgreSQL)
- `restaurants` - Restaurant listings and details
- `reviews` - User reviews and ratings
- `florida_synagogues` - Synagogue information (ignored by Prisma)
- `users` - User accounts and profiles

### Raw SQL Queries

For tables marked with `@@ignore` in Prisma schema (like `florida_synagogues`), the admin system uses raw SQL queries:

```typescript
// Example: Synagogues API route
const synagogues = await prisma.$queryRawUnsafe(`
  SELECT 
    id, name, address, city, state, zip_code, 
    phone, website, email, created_at, updated_at
  FROM florida_synagogues 
  WHERE ($1::text IS NULL OR name ILIKE $1)
  ORDER BY name ASC
  LIMIT $2 OFFSET $3
`, searchTerm, limit, offset);
```

## API Endpoints

### Authentication Endpoints

#### GET `/api/admin/csrf`
- **Purpose**: Generate CSRF token for admin actions
- **Authentication**: Requires admin session
- **Response**: `{ token: string }`

### Database Management Endpoints

#### GET `/api/admin/restaurants`
- **Purpose**: List restaurants with pagination and filtering
- **Parameters**: `page`, `limit`, `search`, `status`
- **Response**: `{ restaurants: Restaurant[], total: number, page: number }`

#### GET `/api/admin/reviews`
- **Purpose**: List reviews with moderation controls
- **Parameters**: `page`, `limit`, `status`, `rating`
- **Response**: `{ reviews: Review[], total: number, page: number }`

#### GET `/api/admin/synagogues`
- **Purpose**: List synagogues using raw SQL queries
- **Parameters**: `page`, `limit`, `search`
- **Response**: `{ synagogues: Synagogue[], total: number, page: number }`

#### GET `/api/admin/users`
- **Purpose**: List users with role management
- **Parameters**: `page`, `limit`, `role`
- **Response**: `{ users: User[], total: number, page: number }`

### Admin Actions Endpoints

#### PUT `/api/admin/users/:id/role`
- **Purpose**: Update user admin role
- **Body**: `{ role: string, permissions: object }`
- **Response**: `{ success: boolean, user: User }`

#### DELETE `/api/admin/reviews/:id`
- **Purpose**: Delete or reject a review
- **Response**: `{ success: boolean }`

## Deployment & Configuration

### Vercel Configuration

The admin system requires specific environment variables in Vercel:

```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
    "NEXT_PUBLIC_BACKEND_URL": "https://your-backend.onrender.com",
    "DATABASE_URL": "postgresql://...",
    "NEXTAUTH_SECRET": "your-secret",
    "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
  }
}
```

### Build Configuration

The admin system requires specific Next.js build settings:

```javascript
// next.config.js
module.exports = {
  webpackBuildWorker: false, // Prevents webpack build issues
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  }
}
```

### Environment Validation

Use the environment check script to validate admin configuration:

```bash
npm run env:check
```

## Troubleshooting

### Common Issues

#### 1. 500 Internal Server Error on Admin Page

**Symptoms**: Admin page returns 500 error in production
**Causes**: 
- Missing environment variables
- Database connection issues
- Missing API routes

**Solutions**:
1. Verify all environment variables are set in Vercel
2. Check database connectivity
3. Ensure all admin API routes exist
4. Clear Next.js build cache: `rm -rf .next && npm run build`

#### 2. CSRF Token Errors

**Symptoms**: Admin actions fail with CSRF token errors
**Causes**: 
- Missing CSRF API route
- Invalid token generation

**Solutions**:
1. Verify `/api/admin/csrf` route exists
2. Check CSRF token generation logic
3. Ensure proper token validation

#### 3. Database Query Errors

**Symptoms**: Admin pages fail to load data
**Causes**: 
- Prisma model issues
- Missing database tables
- Connection problems

**Solutions**:
1. For ignored models, use raw SQL queries
2. Verify database schema is up to date
3. Check database connection string

#### 4. Build Failures

**Symptoms**: Build fails with webpack or module errors
**Causes**: 
- Missing dependencies
- Module resolution issues
- Cache corruption

**Solutions**:
1. Clear build cache: `rm -rf .next node_modules/.cache`
2. Reinstall dependencies: `npm install`
3. Check for missing files or imports

### Debug Mode

Enable debug logging for admin operations:

```typescript
// Add to admin layout or pages
console.log('Admin Debug:', { user, session, permissions });
```

## Recent Fixes

### January 2025 - Admin System Overhaul

#### Critical Fixes Implemented

1. **500 Internal Server Error Resolution**
   - Fixed server-side rendering issues in admin dashboard
   - Added comprehensive error handling and fallbacks
   - Resolved environment variable configuration issues

2. **CSRF Token Implementation**
   - Created missing `/api/admin/csrf` API route
   - Implemented proper CSRF token generation and validation
   - Added error handling for CSRF token fetch failures

3. **Synagogues API Route Fix**
   - Updated to use raw SQL queries instead of ignored Prisma model
   - Implemented secure parameterized queries
   - Added proper error handling and pagination

4. **Build Process Optimization**
   - Fixed webpack module resolution issues
   - Resolved Next.js build configuration problems
   - Implemented proper cache management

5. **Environment Configuration**
   - Added missing production environment variables to Vercel config
   - Configured proper database connection settings
   - Set up authentication and security variables

#### Security Enhancements

- **Enhanced Error Handling**: Admin pages now handle failures gracefully
- **Input Validation**: Comprehensive validation of all admin inputs
- **Audit Logging**: All admin actions are logged with full context
- **Session Security**: Improved session management and timeout handling

#### Performance Improvements

- **Optimized Queries**: Efficient database queries with proper indexing
- **Caching**: Implemented caching for frequently accessed data
- **Pagination**: Proper pagination for large datasets
- **Error Recovery**: System continues to function with partial failures

### Testing & Validation

#### Manual Testing Checklist

- [ ] Admin dashboard loads without errors
- [ ] All database management pages function correctly
- [ ] CSRF tokens are generated and validated properly
- [ ] Admin actions are logged in audit system
- [ ] Error handling works for various failure scenarios
- [ ] Environment variables are properly configured

#### Automated Testing

```bash
# Run admin-specific tests
npm run test:admin

# Check admin build
npm run build

# Validate environment
npm run env:check
```

## Future Enhancements

### Planned Improvements

1. **Advanced Analytics Dashboard**
   - Real-time system metrics
   - User behavior analytics
   - Performance monitoring

2. **Enhanced Security Features**
   - Two-factor authentication for admins
   - IP-based access restrictions
   - Advanced audit trail analysis

3. **Bulk Operations**
   - Bulk restaurant management
   - Mass review moderation
   - Batch user operations

4. **API Rate Limiting**
   - Admin-specific rate limits
   - Abuse detection and prevention
   - Automated blocking of suspicious activity

### Maintenance Schedule

- **Daily**: Monitor admin system logs and performance
- **Weekly**: Review audit logs for suspicious activity
- **Monthly**: Update admin permissions and roles
- **Quarterly**: Security audit and penetration testing

## Support & Maintenance

### Getting Help

1. **Check Documentation**: Review this documentation and related guides
2. **Review Logs**: Check application logs for error details
3. **Environment Validation**: Run environment check scripts
4. **Contact Support**: Reach out to development team with specific error details

### Maintenance Procedures

1. **Regular Backups**: Ensure database backups include admin tables
2. **Security Updates**: Keep admin system dependencies updated
3. **Performance Monitoring**: Monitor admin system performance metrics
4. **User Management**: Regularly review and update admin user permissions

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintainer**: Development Team
