# PostgreSQL Authentication Migration Plan

## Overview
This document outlines the complete migration from Supabase authentication to a PostgreSQL-based authentication system.

## Current State Analysis

### Supabase Dependencies
- **Backend**: 22 Python files with Supabase dependencies
- **Frontend**: 59 TypeScript files with Supabase dependencies  
- **Core Components**: JWT verification, role management, session handling
- **Database**: Existing NextAuth.js compatible tables (unused)

### Migration Benefits
- **Simplified Architecture**: Single database system
- **Reduced Dependencies**: No external auth service
- **Better Control**: Complete ownership of auth flow
- **Cost Reduction**: No Supabase subscription fees
- **Improved Performance**: Direct PostgreSQL queries

## Database Schema Design

### Enhanced User Authentication Tables

```sql
-- Enhanced Users table with comprehensive auth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- User roles and permissions
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 0,
    granted_by VARCHAR(50) REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role)
);

-- Enhanced sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- OAuth providers (keep existing accounts table structure)
-- Add audit log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at);
```

## Backend Authentication Service

### New PostgreSQL Auth Manager
```python
# backend/utils/postgres_auth.py
class PostgresAuthManager:
    """PostgreSQL-based authentication manager to replace Supabase"""
    
    def __init__(self, db_manager):
        self.db = db_manager
        self.jwt_secret = os.getenv('JWT_SECRET')
        self.jwt_algorithm = 'HS256'
        self.token_expire_hours = 24
    
    def create_user(self, email: str, password: str, name: str = None) -> Dict[str, Any]:
        """Create new user with hashed password"""
        
    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email/password"""
        
    def generate_jwt_token(self, user_id: str) -> str:
        """Generate JWT token for authenticated user"""
        
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return user data"""
        
    def create_session(self, user_id: str, ip_address: str = None, user_agent: str = None) -> str:
        """Create session and return session token"""
        
    def verify_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Verify session token and return user data"""
        
    def invalidate_session(self, session_token: str) -> bool:
        """Invalidate user session"""
        
    def get_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user roles and permissions"""
        
    def assign_user_role(self, user_id: str, role: str, level: int, granted_by: str) -> bool:
        """Assign role to user"""
```

### Role-Based Access Control
```python
# backend/utils/rbac.py
class RoleBasedAccessControl:
    """Role-based access control system"""
    
    ROLES = {
        'user': {'level': 1, 'permissions': ['read_restaurants', 'create_reviews']},
        'moderator': {'level': 5, 'permissions': ['moderate_reviews', 'edit_restaurants']},
        'admin': {'level': 10, 'permissions': ['manage_users', 'system_admin']},
        'super_admin': {'level': 99, 'permissions': ['all']}
    }
    
    def check_permission(self, user_roles: List[Dict], required_permission: str) -> bool:
        """Check if user has required permission"""
        
    def check_role_level(self, user_roles: List[Dict], required_level: int) -> bool:
        """Check if user has minimum role level"""
```

## Frontend Migration Plan

### Phase 1: Auth Context Replacement
- Replace Supabase auth context with custom PostgreSQL auth context
- Update auth utilities to use new backend endpoints
- Maintain existing component interfaces

### Phase 2: API Route Updates
- Update all auth-related API routes to use PostgreSQL backend
- Implement session management endpoints
- Update middleware for JWT/session verification

### Phase 3: Component Updates
- Update sign-in/sign-up forms
- Replace Supabase auth hooks with custom hooks
- Update admin components to use new role system

## Security Considerations

### Password Security
- Use bcrypt for password hashing (cost factor 12+)
- Implement password strength requirements
- Add rate limiting for authentication attempts
- Account lockout after failed attempts

### Session Management
- Secure session tokens with httpOnly cookies
- Implement session expiration and renewal
- Track session metadata (IP, user agent)
- Provide session management UI

### JWT Security
- Use strong JWT secret (256+ bit)
- Implement token rotation
- Add token blacklisting for logout
- Include essential claims only

### Admin Security
- Multi-factor authentication for admin accounts
- Audit logging for all admin actions
- Role-based permission granularity
- Session timeout for sensitive operations

## Migration Steps

### Step 1: Database Migration
1. Run schema updates on PostgreSQL
2. Create migration script for existing user data
3. Verify data integrity

### Step 2: Backend Implementation
1. Implement PostgresAuthManager
2. Create new auth endpoints
3. Update existing decorators
4. Add comprehensive testing

### Step 3: Frontend Migration
1. Create new auth context and hooks
2. Update API routes gradually
3. Test authentication flows
4. Update admin system

### Step 4: Testing & Validation
1. Comprehensive auth flow testing
2. Security penetration testing
3. Performance benchmarking
4. Admin functionality verification

### Step 5: Deployment
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Monitor system health

## Rollback Strategy

### Database Rollback
- Keep Supabase tables during migration
- Maintain dual authentication during transition
- Quick rollback scripts if issues arise

### Application Rollback
- Feature flags for auth system selection
- Gradual rollout to user segments
- Monitoring and alerting for auth failures

## Timeline

- **Week 1**: Database schema and backend auth service
- **Week 2**: Core authentication endpoints and testing
- **Week 3**: Frontend auth context and basic flows  
- **Week 4**: Admin system migration and testing
- **Week 5**: Security hardening and performance optimization
- **Week 6**: Production deployment and monitoring

## Success Metrics

- **Zero authentication downtime** during migration
- **Sub-200ms response times** for auth endpoints
- **100% test coverage** for auth flows
- **Successful admin role migration** for all existing admins
- **No security vulnerabilities** in penetration testing