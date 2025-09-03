# PostgreSQL Authentication Migration Guide

This guide walks you through the complete migration from Supabase authentication to a PostgreSQL-based authentication system.

## Overview

The migration replaces Supabase JWT verification with a custom PostgreSQL-based system that includes:

- User registration and authentication
- JWT token management (access + refresh tokens)
- Role-based access control (RBAC)
- Password security (bcrypt hashing)
- Rate limiting and security features
- Admin user management
- Comprehensive audit logging

## Prerequisites

1. **Environment Variables**: Add these to your `.env` files:

```bash
# Backend (.env)
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters
JWT_ACCESS_EXPIRE_HOURS=24
JWT_REFRESH_EXPIRE_DAYS=30
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=15

# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8082
# Keep existing Supabase vars during migration
```

2. **Dependencies**: Ensure these are installed:

```bash
# Backend
pip install bcrypt pyjwt

# Frontend
npm install # existing dependencies should work
```

## Step 1: Database Migration

Run the database migration to create the required tables and columns:

```bash
cd backend
python scripts/migrate_to_postgres_auth.py
```

This will:
- Add authentication columns to the `users` table
- Create `user_roles` and `auth_audit_log` tables
- Set up indexes for performance
- Migrate existing super admin users
- Create database functions for permission checking

## Step 2: Backend Integration

Update your Flask app factory to use PostgreSQL authentication:

```python
# In your app_factory.py or main Flask setup
from utils.app_factory_postgres_auth import init_postgres_auth_app

def create_app():
    app = Flask(__name__)
    
    # ... existing setup ...
    
    # Initialize PostgreSQL authentication
    init_postgres_auth_app(app)
    
    # ... rest of setup ...
    
    return app
```

## Step 3: Frontend Integration

### Option A: Complete Frontend Migration

Replace Supabase auth context with PostgreSQL auth:

```tsx
// In your main layout or app component
import { AuthProvider } from '@/lib/contexts/PostgresAuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

Update components to use the new auth context:

```tsx
import { useAuth } from '@/lib/contexts/PostgresAuthContext';

function MyComponent() {
  const { user, login, logout, isAdmin } = useAuth();
  
  // ... rest of component
}
```

### Option B: Gradual Migration

Keep both auth systems running during transition:

```tsx
// Create a migration wrapper
function AuthMigrationProvider({ children }: { children: React.ReactNode }) {
  const usePostgresAuth = process.env.NEXT_PUBLIC_USE_POSTGRES_AUTH === 'true';
  
  if (usePostgresAuth) {
    return (
      <PostgresAuthProvider>
        {children}
      </PostgresAuthProvider>
    );
  }
  
  return (
    <SupabaseAuthProvider>
      {children}
    </SupabaseAuthProvider>
  );
}
```

## Step 4: Route Updates

Update your API routes to use PostgreSQL authentication:

### Protected Routes
```python
from utils.rbac import require_auth, require_admin

@app.route('/api/protected')
@require_auth
def protected_route():
    from flask import g
    user_id = g.user_id
    return {'message': f'Hello user {user_id}'}
```

### Admin Routes
```python
@app.route('/api/admin/users')
@require_admin
def admin_users():
    # Admin-only functionality
    pass
```

### Role-Based Routes
```python
from utils.rbac import require_permission, require_role_level

@app.route('/api/moderate')
@require_permission('moderate_reviews')
def moderate_content():
    pass

@app.route('/api/high-level')
@require_role_level(10)  # Admin level
def admin_function():
    pass
```

## Step 5: Testing

Run the comprehensive test suite:

```bash
cd backend
python -m pytest tests/test_postgres_auth.py -v

# Or run integration tests directly
python tests/test_postgres_auth.py
```

Test authentication flows:

1. **Registration**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`
3. **Token Refresh**: `POST /api/auth/refresh`
4. **Profile Management**: `GET/PUT /api/auth/profile`
5. **Admin Functions**: `/api/auth/admin/*`

## Step 6: Security Verification

1. **Rate Limiting**: Test rate limits on auth endpoints
2. **Token Security**: Verify JWT tokens contain proper claims
3. **Password Security**: Confirm bcrypt hashing is working
4. **Role Permissions**: Test RBAC system thoroughly
5. **Account Lockout**: Test failed login attempt handling

## Step 7: Data Migration

If you have existing Supabase user data to migrate:

```python
# Create a migration script for your specific needs
from utils.postgres_auth import get_postgres_auth
import supabase_client  # your existing Supabase client

def migrate_users():
    auth_manager = get_postgres_auth()
    
    # Get users from Supabase
    supabase_users = supabase_client.auth.admin.list_users()
    
    for supabase_user in supabase_users:
        try:
            # Create user in PostgreSQL (they'll need to reset password)
            user_info = auth_manager.create_user(
                email=supabase_user.email,
                password=generate_temporary_password(),  # User resets this
                name=supabase_user.user_metadata.get('name')
            )
            
            # Migrate roles if they exist
            if supabase_user.app_metadata.get('role'):
                role = supabase_user.app_metadata['role']
                level = get_role_level(role)  # Define this mapping
                auth_manager.assign_user_role(user_info['user_id'], role, level)
                
            print(f"Migrated user: {supabase_user.email}")
            
        except Exception as e:
            print(f"Failed to migrate {supabase_user.email}: {e}")
```

## Step 8: Production Deployment

### Environment Setup
1. Generate a strong JWT secret for production
2. Configure proper CORS origins
3. Set up rate limiting with Redis (optional)
4. Configure logging and monitoring

### Database
1. Run migration on production database
2. Verify all indexes are created
3. Test database performance under load

### Security
1. Enable HTTPS for all auth endpoints
2. Configure proper cookie settings if using cookies
3. Set up monitoring for failed authentication attempts
4. Implement alerting for security events

## Step 9: Cleanup (After Migration)

Once PostgreSQL authentication is stable:

1. **Remove Supabase Dependencies**:
```bash
# Backend
pip uninstall supabase-py

# Frontend
npm uninstall @supabase/supabase-js
```

2. **Clean Up Code**:
- Remove Supabase auth imports
- Delete Supabase auth utilities
- Remove Supabase environment variables
- Update documentation

3. **Database Cleanup**:
- Remove unused Supabase-related columns (optional)
- Drop old auth tables if not needed

## Common Issues and Solutions

### Issue: JWT_SECRET Not Set
```bash
export JWT_SECRET="your-super-secure-secret-key-here"
```

### Issue: Database Connection Errors
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists and is accessible

### Issue: Rate Limiting Too Aggressive
Adjust rate limits in auth endpoints:
```python
@rate_limit(max_requests=20, window_seconds=3600)  # More lenient
```

### Issue: Token Expiration
- Implement automatic token refresh on frontend
- Adjust token expiration times
- Handle expired tokens gracefully

### Issue: Role Migration
Check and update role assignments:
```sql
-- Check user roles
SELECT u.email, ur.role, ur.level 
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
WHERE ur.is_active = true;

-- Fix missing roles
INSERT INTO user_roles (user_id, role, level, is_active)
SELECT id, 'user', 1, true 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_roles);
```

## Monitoring and Maintenance

### Log Monitoring
Monitor these log patterns:
- `AUTH_401_*`: Authentication failures
- `AUTH_SUCCESS`: Successful logins
- `RATE_LIMIT_EXCEEDED`: Rate limit hits
- `PASSWORD_CHANGED`: Security events

### Database Maintenance
- Monitor `auth_audit_log` table size
- Set up log rotation for audit logs
- Monitor failed login attempts
- Check for locked accounts

### Performance Monitoring
- Track authentication endpoint response times
- Monitor JWT token generation/verification performance
- Watch database connection pool usage
- Monitor rate limiter memory usage

## Support and Troubleshooting

### Debug Mode
Enable debug logging:
```python
import logging
logging.getLogger('utils.postgres_auth').setLevel(logging.DEBUG)
```

### Health Checks
Use the health check endpoint:
```bash
curl http://localhost:8082/api/auth/health
```

### Database Queries
Useful queries for debugging:
```sql
-- Check recent authentication attempts
SELECT * FROM auth_audit_log ORDER BY created_at DESC LIMIT 20;

-- Check user roles
SELECT u.email, ur.role, ur.level 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
WHERE ur.is_active = true;

-- Check locked accounts
SELECT email, failed_login_attempts, locked_until 
FROM users 
WHERE locked_until > NOW();
```

## Migration Checklist

- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Backend auth system integrated
- [ ] Frontend auth context updated
- [ ] All routes use new auth decorators
- [ ] Tests passing
- [ ] Security verification completed
- [ ] User data migrated (if applicable)
- [ ] Production deployment tested
- [ ] Monitoring and logging configured
- [ ] Documentation updated
- [ ] Team trained on new system

## Rollback Plan

If issues arise, you can rollback by:

1. **Immediate**: Switch environment variable to disable PostgreSQL auth
2. **Code**: Revert to Supabase auth context in frontend
3. **Database**: Keep Supabase data intact during migration period
4. **Full Rollback**: Restore from backup if necessary

The migration is designed to be reversible until you remove Supabase dependencies completely.