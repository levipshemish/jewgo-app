-- Performance Optimization Indexes for Authentication System
-- This migration adds composite indexes for better query performance

-- Begin transaction
BEGIN;

-- Composite index for login queries (email + account status)
CREATE INDEX IF NOT EXISTS idx_users_email_active 
ON users(email, locked_until, failed_login_attempts) 
WHERE email IS NOT NULL;

-- Composite index for role queries with all relevant fields
CREATE INDEX IF NOT EXISTS idx_user_roles_composite 
ON user_roles(user_id, is_active, expires_at, role, level) 
WHERE is_active = TRUE;

-- Partial index for session cleanup (expired sessions)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_cleanup 
ON auth_sessions(expires_at, revoked_at) 
WHERE revoked_at IS NULL;

-- Composite index for audit log queries (user + action + time)
CREATE INDEX IF NOT EXISTS idx_auth_audit_composite 
ON auth_audit_log(user_id, action, created_at) 
WHERE user_id IS NOT NULL;

-- Index for session family management
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family_active 
ON auth_sessions(family_id, revoked_at, expires_at) 
WHERE revoked_at IS NULL;

-- Index for token hash lookups (refresh token validation)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash 
ON auth_sessions(refresh_token_hash) 
WHERE refresh_token_hash IS NOT NULL;

-- Index for user verification tokens
CREATE INDEX IF NOT EXISTS idx_users_verification_active 
ON users(verification_token, verification_expires) 
WHERE verification_token IS NOT NULL AND verification_expires > NOW();

-- Index for password reset tokens
CREATE INDEX IF NOT EXISTS idx_users_reset_active 
ON users(reset_token, reset_expires) 
WHERE reset_token IS NOT NULL AND reset_expires > NOW();

-- Index for account lockout queries
CREATE INDEX IF NOT EXISTS idx_users_lockout_status 
ON users(locked_until, failed_login_attempts) 
WHERE locked_until IS NOT NULL OR failed_login_attempts > 0;

-- Index for user search by name (for admin functions)
CREATE INDEX IF NOT EXISTS idx_users_name_search 
ON users USING gin(to_tsvector('english', name)) 
WHERE name IS NOT NULL;

-- Index for email domain queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_users_email_domain 
ON users(substring(email from '@(.*)$')) 
WHERE email IS NOT NULL;

-- Commit transaction
COMMIT;

-- Add comments for documentation
COMMENT ON INDEX idx_users_email_active IS 'Composite index for login queries with account status';
COMMENT ON INDEX idx_user_roles_composite IS 'Composite index for role queries with all relevant fields';
COMMENT ON INDEX idx_auth_sessions_cleanup IS 'Partial index for session cleanup operations';
COMMENT ON INDEX idx_auth_audit_composite IS 'Composite index for audit log queries';
COMMENT ON INDEX idx_auth_sessions_family_active IS 'Index for session family management';
COMMENT ON INDEX idx_auth_sessions_token_hash IS 'Index for refresh token hash lookups';
COMMENT ON INDEX idx_users_verification_active IS 'Index for active verification tokens';
COMMENT ON INDEX idx_users_reset_active IS 'Index for active password reset tokens';
COMMENT ON INDEX idx_users_lockout_status IS 'Index for account lockout status queries';
COMMENT ON INDEX idx_users_name_search IS 'Full-text search index for user names';
COMMENT ON INDEX idx_users_email_domain IS 'Index for email domain analytics';
