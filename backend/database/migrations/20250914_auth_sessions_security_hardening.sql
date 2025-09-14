-- Auth Sessions Security Hardening Migration
-- This migration adds required fields for enhanced session management and security
-- Implements requirements: 2.1, 2.2, 2.3, 2.4, 2.5
-- Run with: psql <DATABASE_URL> -f 20250914_auth_sessions_security_hardening.sql

-- Begin transaction
BEGIN;

-- ============================================================================
-- 1. Add new columns to auth_sessions table
-- ============================================================================

DO $
BEGIN
    -- Add current_jti column for JWT ID tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'current_jti') THEN
        ALTER TABLE auth_sessions ADD COLUMN current_jti UUID;
        RAISE NOTICE 'Added current_jti column to auth_sessions';
    END IF;
    
    -- Add reused_jti_of column for replay attack detection
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'reused_jti_of') THEN
        ALTER TABLE auth_sessions ADD COLUMN reused_jti_of UUID;
        RAISE NOTICE 'Added reused_jti_of column to auth_sessions';
    END IF;
    
    -- Add device_hash column for device fingerprinting
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'device_hash') THEN
        ALTER TABLE auth_sessions ADD COLUMN device_hash VARCHAR(64);
        RAISE NOTICE 'Added device_hash column to auth_sessions';
    END IF;
    
    -- Add last_ip_cidr column for IP tracking with privacy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'last_ip_cidr') THEN
        ALTER TABLE auth_sessions ADD COLUMN last_ip_cidr CIDR;
        RAISE NOTICE 'Added last_ip_cidr column to auth_sessions';
    END IF;
    
    -- Add auth_time column for step-up authentication
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'auth_time') THEN
        ALTER TABLE auth_sessions ADD COLUMN auth_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added auth_time column to auth_sessions';
    END IF;
    
    -- Ensure family_id column exists (should already exist from previous migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'family_id') THEN
        ALTER TABLE auth_sessions ADD COLUMN family_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added family_id column to auth_sessions';
    END IF;
    
    -- Ensure revoked_at column exists (should already exist from previous migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name = 'revoked_at') THEN
        ALTER TABLE auth_sessions ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added revoked_at column to auth_sessions';
    END IF;
END $;

-- ============================================================================
-- 2. Backfill legacy rows with default values
-- ============================================================================

-- Update existing rows to have family_id if they don't have one
UPDATE auth_sessions 
SET family_id = gen_random_uuid() 
WHERE family_id IS NULL;

-- Update existing rows to have auth_time if they don't have one
UPDATE auth_sessions 
SET auth_time = created_at 
WHERE auth_time IS NULL;

-- Generate device_hash for existing sessions based on user_agent
UPDATE auth_sessions 
SET device_hash = encode(sha256(COALESCE(user_agent, 'unknown')::bytea), 'hex')
WHERE device_hash IS NULL AND user_agent IS NOT NULL;

-- Set last_ip_cidr based on existing ip column (with /24 for IPv4, /64 for IPv6)
UPDATE auth_sessions 
SET last_ip_cidr = CASE 
    WHEN family(ip::inet) = 4 THEN network(set_masklen(ip::inet, 24))
    WHEN family(ip::inet) = 6 THEN network(set_masklen(ip::inet, 64))
    ELSE NULL
END
WHERE last_ip_cidr IS NULL AND ip IS NOT NULL;

-- ============================================================================
-- 3. Add constraints and defaults
-- ============================================================================

-- Add NOT NULL constraint to family_id after backfilling
ALTER TABLE auth_sessions ALTER COLUMN family_id SET NOT NULL;

-- Add NOT NULL constraint to auth_time after backfilling
ALTER TABLE auth_sessions ALTER COLUMN auth_time SET NOT NULL;

-- Set default for auth_time on new rows
ALTER TABLE auth_sessions ALTER COLUMN auth_time SET DEFAULT NOW();

-- ============================================================================
-- 4. Create performance indexes
-- ============================================================================

-- Index for current_jti lookups (used in token verification)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_current_jti ON auth_sessions(current_jti) WHERE current_jti IS NOT NULL;

-- Index for device_hash lookups (used in device tracking)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_device_hash ON auth_sessions(device_hash) WHERE device_hash IS NOT NULL;

-- Index for last_ip_cidr lookups (used in security monitoring)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_last_ip_cidr ON auth_sessions(last_ip_cidr) WHERE last_ip_cidr IS NOT NULL;

-- Index for auth_time lookups (used in step-up authentication)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_auth_time ON auth_sessions(auth_time);

-- Index for reused_jti_of lookups (used in replay attack detection)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_reused_jti_of ON auth_sessions(reused_jti_of) WHERE reused_jti_of IS NOT NULL;

-- Composite index for active sessions by family
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family_active ON auth_sessions(family_id, revoked_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- 5. Create partial unique constraint for active sessions
-- ============================================================================

-- Ensure only one active current_jti per family_id where revoked_at IS NULL
-- This prevents multiple active tokens in the same family
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_unique_active_jti 
ON auth_sessions(family_id, current_jti) 
WHERE revoked_at IS NULL AND current_jti IS NOT NULL;

-- ============================================================================
-- 6. Add foreign key constraints for referential integrity
-- ============================================================================

-- Add foreign key constraint for reused_jti_of (self-referencing)
DO $
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_auth_sessions_reused_jti_of') THEN
        ALTER TABLE auth_sessions 
        ADD CONSTRAINT fk_auth_sessions_reused_jti_of 
        FOREIGN KEY (reused_jti_of) REFERENCES auth_sessions(current_jti) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint for reused_jti_of';
    END IF;
END $;

-- ============================================================================
-- 7. Create helper functions for session management
-- ============================================================================

-- Function to revoke entire session family
CREATE OR REPLACE FUNCTION revoke_session_family(p_family_id UUID, p_reason TEXT DEFAULT 'family_revoked')
RETURNS INTEGER AS $
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE auth_sessions 
    SET revoked_at = NOW()
    WHERE family_id = p_family_id 
    AND revoked_at IS NULL;
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    
    -- Log the family revocation
    INSERT INTO auth_audit_log (action, details, success, created_at)
    VALUES (
        'session_family_revoked',
        jsonb_build_object(
            'family_id', p_family_id,
            'reason', p_reason,
            'revoked_count', revoked_count
        ),
        TRUE,
        NOW()
    );
    
    RETURN revoked_count;
END;
$ LANGUAGE plpgsql;

-- Function to detect and handle token replay
CREATE OR REPLACE FUNCTION handle_token_replay(p_current_jti UUID, p_family_id UUID)
RETURNS BOOLEAN AS $
DECLARE
    existing_session RECORD;
    revoked_count INTEGER;
BEGIN
    -- Check if this JTI was already used
    SELECT * INTO existing_session
    FROM auth_sessions 
    WHERE current_jti = p_current_jti 
    AND family_id = p_family_id;
    
    IF FOUND THEN
        -- This is a replay attack - revoke the entire family
        SELECT revoke_session_family(p_family_id, 'token_replay') INTO revoked_count;
        
        -- Log the replay attempt
        INSERT INTO auth_audit_log (action, details, success, created_at)
        VALUES (
            'token_replay_detected',
            jsonb_build_object(
                'family_id', p_family_id,
                'replayed_jti', p_current_jti,
                'revoked_count', revoked_count
            ),
            FALSE,
            NOW()
        );
        
        RETURN TRUE; -- Replay detected
    END IF;
    
    RETURN FALSE; -- No replay detected
END;
$ LANGUAGE plpgsql;

-- Function to rotate session token
CREATE OR REPLACE FUNCTION rotate_session_token(
    p_old_session_id VARCHAR(255),
    p_new_session_id VARCHAR(255),
    p_new_jti UUID,
    p_new_refresh_token_hash VARCHAR(255),
    p_new_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $
DECLARE
    old_session RECORD;
    family_uuid UUID;
BEGIN
    -- Get the old session details
    SELECT * INTO old_session
    FROM auth_sessions 
    WHERE id = p_old_session_id 
    AND revoked_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE; -- Old session not found or already revoked
    END IF;
    
    -- Check for replay attack
    IF handle_token_replay(p_new_jti, old_session.family_id) THEN
        RETURN FALSE; -- Replay detected, family revoked
    END IF;
    
    -- Revoke the old session
    UPDATE auth_sessions 
    SET revoked_at = NOW(),
        reused_jti_of = p_new_jti
    WHERE id = p_old_session_id;
    
    -- Create new session in the same family
    INSERT INTO auth_sessions (
        id, user_id, refresh_token_hash, family_id, current_jti,
        rotated_from, user_agent, ip, last_ip_cidr, device_hash,
        created_at, last_used, expires_at, auth_time
    ) VALUES (
        p_new_session_id,
        old_session.user_id,
        p_new_refresh_token_hash,
        old_session.family_id,
        p_new_jti,
        p_old_session_id,
        old_session.user_agent,
        old_session.ip,
        old_session.last_ip_cidr,
        old_session.device_hash,
        NOW(),
        NOW(),
        p_new_expires_at,
        old_session.auth_time -- Preserve original auth time
    );
    
    RETURN TRUE; -- Rotation successful
END;
$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM auth_sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep expired sessions for 7 days for audit
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO auth_audit_log (action, details, success, created_at)
    VALUES (
        'session_cleanup',
        jsonb_build_object('cleaned_count', cleanup_count),
        TRUE,
        NOW()
    );
    
    RETURN cleanup_count;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Create views for session management
-- ============================================================================

-- View for active sessions with enhanced information
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.id,
    s.user_id,
    s.family_id,
    s.current_jti,
    s.device_hash,
    s.last_ip_cidr,
    s.user_agent,
    s.auth_time,
    s.created_at,
    s.last_used,
    s.expires_at,
    u.email as user_email,
    u.name as user_name,
    CASE 
        WHEN s.auth_time > NOW() - INTERVAL '5 minutes' THEN 'fresh'
        WHEN s.auth_time > NOW() - INTERVAL '1 hour' THEN 'recent'
        ELSE 'stale'
    END as auth_freshness
FROM auth_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.revoked_at IS NULL 
AND s.expires_at > NOW();

-- View for session families with statistics
CREATE OR REPLACE VIEW session_families AS
SELECT 
    family_id,
    user_id,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE revoked_at IS NULL) as active_sessions,
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_sessions,
    MIN(created_at) as family_created_at,
    MAX(last_used) as family_last_used,
    MAX(auth_time) as latest_auth_time
FROM auth_sessions
GROUP BY family_id, user_id;

-- ============================================================================
-- 9. Add table and column comments for documentation
-- ============================================================================

COMMENT ON COLUMN auth_sessions.current_jti IS 'Current JWT ID for this session, used for token verification and replay detection';
COMMENT ON COLUMN auth_sessions.reused_jti_of IS 'JTI that was reused, triggering family revocation (for audit trail)';
COMMENT ON COLUMN auth_sessions.device_hash IS 'SHA-256 hash of device fingerprint for device tracking';
COMMENT ON COLUMN auth_sessions.last_ip_cidr IS 'Last known IP address in CIDR format for privacy-preserving tracking';
COMMENT ON COLUMN auth_sessions.auth_time IS 'Time of initial authentication for step-up auth requirements';

COMMENT ON FUNCTION revoke_session_family(UUID, TEXT) IS 'Revoke all sessions in a family, typically due to security incident';
COMMENT ON FUNCTION handle_token_replay(UUID, UUID) IS 'Detect and handle token replay attacks by revoking family';
COMMENT ON FUNCTION rotate_session_token(VARCHAR, VARCHAR, UUID, VARCHAR, TIMESTAMP WITH TIME ZONE) IS 'Safely rotate session token with replay detection';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Clean up expired sessions older than 7 days';

COMMENT ON VIEW active_sessions IS 'View of currently active sessions with user information and auth freshness';
COMMENT ON VIEW session_families IS 'Statistics view of session families for monitoring and management';

-- ============================================================================
-- 10. Create rollback script
-- ============================================================================

-- Store rollback commands in a comment for reference
/*
ROLLBACK SCRIPT - Run these commands to reverse this migration:

BEGIN;

-- Drop views
DROP VIEW IF EXISTS session_families;
DROP VIEW IF EXISTS active_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS rotate_session_token(VARCHAR, VARCHAR, UUID, VARCHAR, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS handle_token_replay(UUID, UUID);
DROP FUNCTION IF EXISTS revoke_session_family(UUID, TEXT);

-- Drop indexes
DROP INDEX IF EXISTS idx_auth_sessions_unique_active_jti;
DROP INDEX IF EXISTS idx_auth_sessions_family_active;
DROP INDEX IF EXISTS idx_auth_sessions_reused_jti_of;
DROP INDEX IF EXISTS idx_auth_sessions_auth_time;
DROP INDEX IF EXISTS idx_auth_sessions_last_ip_cidr;
DROP INDEX IF EXISTS idx_auth_sessions_device_hash;
DROP INDEX IF EXISTS idx_auth_sessions_current_jti;

-- Drop foreign key constraint
ALTER TABLE auth_sessions DROP CONSTRAINT IF EXISTS fk_auth_sessions_reused_jti_of;

-- Drop columns (WARNING: This will lose data!)
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS auth_time;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS last_ip_cidr;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS device_hash;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS reused_jti_of;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS current_jti;

COMMIT;
*/

-- Commit transaction
COMMIT;

-- Print completion message
DO $
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Auth Sessions Security Hardening Migration completed successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Added columns: current_jti, reused_jti_of, device_hash, last_ip_cidr, auth_time';
    RAISE NOTICE 'Created indexes for performance optimization';
    RAISE NOTICE 'Added unique constraint for active sessions per family';
    RAISE NOTICE 'Created helper functions for session management';
    RAISE NOTICE 'Created views for session monitoring';
    RAISE NOTICE 'Backfilled existing sessions with default values';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Requirements implemented: 2.1, 2.2, 2.3, 2.4, 2.5';
    RAISE NOTICE 'Next steps: Update application code to use new session management features';
    RAISE NOTICE '=================================================================';
END $;