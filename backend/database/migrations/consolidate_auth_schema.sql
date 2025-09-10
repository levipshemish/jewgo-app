-- Consolidate Authentication Schema Migration
-- This migration ensures all authentication tables are properly set up and consistent
-- Run this with: psql <DATABASE_URL> -f consolidate_auth_schema.sql

-- Begin transaction
BEGIN;

-- ============================================================================
-- 1. Ensure users table has all required authentication columns
-- ============================================================================

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
    -- Core authentication fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_token') THEN
        ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_expires') THEN
        ALTER TABLE users ADD COLUMN verification_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token') THEN
        ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_expires') THEN
        ALTER TABLE users ADD COLUMN reset_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Security fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Guest user support
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_guest') THEN
        ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- 2FA support (for future implementation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================================================
-- 2. Create user_roles table for RBAC
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    granted_by VARCHAR(50),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_user_roles_user_id') THEN
        ALTER TABLE user_roles 
        ADD CONSTRAINT fk_user_roles_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_user_roles_granted_by') THEN
        ALTER TABLE user_roles 
        ADD CONSTRAINT fk_user_roles_granted_by 
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. Create auth_sessions table for JWT refresh token management
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    family_id VARCHAR(255) NOT NULL,
    rotated_from VARCHAR(255), -- References previous session ID in rotation chain
    user_agent TEXT,
    ip VARCHAR(45), -- Supports IPv6
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_auth_sessions_user_id') THEN
        ALTER TABLE auth_sessions 
        ADD CONSTRAINT fk_auth_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 4. Create auth_audit_log table for security monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255), -- NULL for events like failed login attempts where user unknown
    action VARCHAR(100) NOT NULL, -- e.g., 'login_success', 'login_failed', 'password_reset', etc.
    ip_address VARCHAR(45), -- Client IP address
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    details JSONB DEFAULT '{}', -- Additional event-specific details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_auth_audit_log_user_id') THEN
        ALTER TABLE auth_audit_log 
        ADD CONSTRAINT fk_auth_audit_log_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 5. Create accounts table for OAuth providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    providerAccountId VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(50),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, providerAccountId)
);

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_accounts_user_id') THEN
        ALTER TABLE accounts 
        ADD CONSTRAINT fk_accounts_user_id 
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 6. Create performance indexes
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- User roles table indexes  
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active, expires_at);

-- Auth sessions table indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family_id ON auth_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at ON auth_sessions(revoked_at) WHERE revoked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_rthash ON auth_sessions(refresh_token_hash);

-- Auth audit log table indexes
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_success ON auth_audit_log(success);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_ip_address ON auth_audit_log(ip_address);

-- Accounts table indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(userId);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider);
CREATE INDEX IF NOT EXISTS idx_accounts_provider_account ON accounts(provider, providerAccountId);

-- ============================================================================
-- 7. Create triggers for updated_at timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_user_roles_updated_at') THEN
        CREATE TRIGGER update_user_roles_updated_at
            BEFORE UPDATE ON user_roles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_accounts_updated_at') THEN
        CREATE TRIGGER update_accounts_updated_at
            BEFORE UPDATE ON accounts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- 8. Insert default roles for existing users
-- ============================================================================

-- Ensure all existing users have 'user' role by default
INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
SELECT 
    id,
    'user',
    1,
    NOW(),
    TRUE
FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate super admin status from isSuperAdmin column (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isSuperAdmin') THEN
        INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
        SELECT 
            id,
            'super_admin',
            99,
            NOW(),
            TRUE
        FROM users
        WHERE isSuperAdmin = TRUE
        ON CONFLICT (user_id, role) DO UPDATE SET
            level = EXCLUDED.level,
            granted_at = EXCLUDED.granted_at,
            is_active = TRUE;
    END IF;
END $$;

-- ============================================================================
-- 9. Create useful views and functions
-- ============================================================================

-- View for user authentication data
CREATE OR REPLACE VIEW user_auth_info AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.email_verified,
    u.failed_login_attempts,
    u.locked_until,
    u.last_login,
    u.two_factor_enabled,
    u.is_guest,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'role', ur.role,
                'level', ur.level,
                'granted_at', ur.granted_at,
                'expires_at', ur.expires_at
            )
        ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
        '[]'
    ) as active_roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.name, u.email, u.email_verified, u.failed_login_attempts, 
         u.locked_until, u.last_login, u.two_factor_enabled, u.is_guest;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id VARCHAR(50), p_permission VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN DEFAULT FALSE;
BEGIN
    -- Check if user has 'super_admin' role (all permissions)
    SELECT TRUE INTO has_perm
    FROM user_roles ur
    WHERE ur.user_id = p_user_id 
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    AND ur.role = 'super_admin'
    LIMIT 1;
    
    IF has_perm THEN
        RETURN TRUE;
    END IF;
    
    -- Check specific permission based on role definitions
    -- Admin permissions
    IF p_permission IN ('manage_users', 'manage_restaurants', 'access_admin_panel', 'view_analytics', 'system_configuration') THEN
        SELECT TRUE INTO has_perm
        FROM user_roles ur
        WHERE ur.user_id = p_user_id 
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND ur.role IN ('admin', 'super_admin')
        LIMIT 1;
    END IF;
    
    -- Moderator permissions
    IF p_permission IN ('moderate_reviews', 'edit_restaurant_hours', 'view_reported_content', 'manage_user_reports') THEN
        SELECT TRUE INTO has_perm
        FROM user_roles ur
        WHERE ur.user_id = p_user_id 
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND ur.role IN ('moderator', 'admin', 'super_admin')
        LIMIT 1;
    END IF;
    
    -- Basic user permissions (all authenticated users)
    IF p_permission IN ('read_restaurants', 'create_reviews', 'manage_own_profile', 'view_public_content') THEN
        SELECT TRUE INTO has_perm
        FROM user_roles ur
        WHERE ur.user_id = p_user_id 
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(has_perm, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's maximum role level
CREATE OR REPLACE FUNCTION get_user_max_role_level(p_user_id VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    max_level INTEGER DEFAULT 0;
BEGIN
    SELECT COALESCE(MAX(ur.level), 0) INTO max_level
    FROM user_roles ur
    WHERE ur.user_id = p_user_id 
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
    
    RETURN max_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE user_roles IS 'User roles and permissions for RBAC system';
COMMENT ON TABLE auth_sessions IS 'JWT refresh token session management with rotation and family tracking';
COMMENT ON TABLE auth_audit_log IS 'Comprehensive authentication event logging for security monitoring';
COMMENT ON TABLE accounts IS 'OAuth provider account linking for users';

COMMENT ON COLUMN auth_sessions.family_id IS 'Groups related sessions for family-wide revocation on token reuse';
COMMENT ON COLUMN auth_sessions.rotated_from IS 'Previous session ID in rotation chain for audit trail';
COMMENT ON COLUMN auth_sessions.refresh_token_hash IS 'SHA-256 hash of refresh token for secure storage';
COMMENT ON COLUMN auth_audit_log.details IS 'JSONB field for flexible event-specific metadata storage';

COMMENT ON VIEW user_auth_info IS 'Comprehensive view of user authentication data with active roles';
COMMENT ON FUNCTION user_has_permission(VARCHAR(50), VARCHAR(50)) IS 'Check if user has specific permission';
COMMENT ON FUNCTION get_user_max_role_level(VARCHAR(50)) IS 'Get user maximum role level for authorization checks';

-- Commit transaction
COMMIT;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Authentication schema consolidation completed successfully!';
    RAISE NOTICE 'Tables verified/created: users, user_roles, auth_sessions, auth_audit_log, accounts';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'Default user roles assigned to existing users';
    RAISE NOTICE 'Views and functions created for authentication management';
END $$;
