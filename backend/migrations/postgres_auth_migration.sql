-- PostgreSQL Authentication Migration
-- This migration adds necessary columns and tables for PostgreSQL-based authentication
-- to replace Supabase authentication system.

-- Begin transaction
BEGIN;

-- Add authentication columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(100),
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Update existing users to have email verified (migration safety)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Create user roles table for RBAC
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 0,
    granted_by VARCHAR(50),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
);

-- Add foreign key constraints
ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_granted_by 
FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create auth sessions table for refresh token families
CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    family_id VARCHAR(36) NOT NULL,
    rotated_from VARCHAR(36),
    user_agent TEXT,
    ip INET,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

-- Add foreign key for auth sessions
ALTER TABLE auth_sessions
ADD CONSTRAINT fk_auth_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add authentication columns to existing sessions table (skip columns that already exist)
-- Note: Sessions table already has ip_address, user_agent, created_at, last_used from previous setup
-- ALTER TABLE sessions
-- ADD COLUMN IF NOT EXISTS ip_address INET,
-- ADD COLUMN IF NOT EXISTS user_agent TEXT,
-- ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- ADD COLUMN IF NOT EXISTS last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create authentication audit log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for audit log
ALTER TABLE auth_audit_log
ADD CONSTRAINT fk_auth_audit_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family_id ON auth_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at ON auth_sessions(revoked_at) WHERE revoked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions("sessionToken");
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_action ON auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_success ON auth_audit_log(success);

-- Create trigger to update updated_at timestamp on user_roles
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_roles_updated_at();

-- Insert default roles for existing users
-- This assumes existing users should have 'user' role by default
INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
SELECT 
    id,
    'user',
    1,
    CURRENT_TIMESTAMP,
    TRUE
FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate super admin status from isSuperAdmin column
INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
SELECT 
    id,
    'super_admin',
    99,
    CURRENT_TIMESTAMP,
    TRUE
FROM users
WHERE isSuperAdmin = TRUE
ON CONFLICT (user_id, role) DO UPDATE SET
    level = EXCLUDED.level,
    granted_at = EXCLUDED.granted_at,
    is_active = TRUE;

-- Create a view for user authentication data (helpful for queries)
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
    u.created_at,
    u.updated_at,
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
         u.locked_until, u.last_login, u.two_factor_enabled, u.created_at, u.updated_at;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id VARCHAR(50), p_permission VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN DEFAULT FALSE;
    role_rec RECORD;
BEGIN
    -- Check if user has 'all' permission (super admin)
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
    -- This is a simplified check - in practice, you'd want to store permissions in the database
    -- or use the Python RBAC class for more complex permission checks
    
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

-- Create function to get user's maximum role level
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

-- Add comments for documentation
COMMENT ON TABLE user_roles IS 'User roles and permissions for RBAC system';
COMMENT ON TABLE auth_audit_log IS 'Audit log for authentication events';
COMMENT ON VIEW user_auth_info IS 'Comprehensive view of user authentication data with active roles';
COMMENT ON FUNCTION user_has_permission(VARCHAR(50), VARCHAR(50)) IS 'Check if user has specific permission';
COMMENT ON FUNCTION get_user_max_role_level(VARCHAR(50)) IS 'Get user maximum role level for authorization checks';

-- Commit transaction
COMMIT;

-- Print migration completion message
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL authentication migration completed successfully!';
    RAISE NOTICE 'Tables created: user_roles, auth_audit_log';
    RAISE NOTICE 'Columns added to users table: password_hash, email_verified, verification_token, etc.';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'Default user roles assigned to existing users';
    RAISE NOTICE 'Super admin roles migrated from isSuperAdmin column';
END $$;