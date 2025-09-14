-- Rollback Script for Auth Sessions Security Hardening Migration
-- This script safely rolls back the auth sessions security hardening migration
-- WARNING: This will remove the new security features and may result in data loss
-- Only run this if you need to revert the migration due to issues

-- Begin transaction
BEGIN;

-- ============================================================================
-- 1. Drop views (in reverse order of creation)
-- ============================================================================

DROP VIEW IF EXISTS session_families;
DROP VIEW IF EXISTS active_sessions;

RAISE NOTICE 'Dropped views: session_families, active_sessions';

-- ============================================================================
-- 2. Drop functions (in reverse order of creation)
-- ============================================================================

DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS rotate_session_token(VARCHAR, VARCHAR, UUID, VARCHAR, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS handle_token_replay(UUID, UUID);
DROP FUNCTION IF EXISTS revoke_session_family(UUID, TEXT);

RAISE NOTICE 'Dropped functions: cleanup_expired_sessions, rotate_session_token, handle_token_replay, revoke_session_family';

-- ============================================================================
-- 3. Drop indexes (in reverse order of creation)
-- ============================================================================

DROP INDEX IF EXISTS idx_auth_sessions_unique_active_jti;
DROP INDEX IF EXISTS idx_auth_sessions_family_active;
DROP INDEX IF EXISTS idx_auth_sessions_reused_jti_of;
DROP INDEX IF EXISTS idx_auth_sessions_auth_time;
DROP INDEX IF EXISTS idx_auth_sessions_last_ip_cidr;
DROP INDEX IF EXISTS idx_auth_sessions_device_hash;
DROP INDEX IF EXISTS idx_auth_sessions_current_jti;

RAISE NOTICE 'Dropped indexes for new columns';

-- ============================================================================
-- 4. Drop foreign key constraints
-- ============================================================================

ALTER TABLE auth_sessions DROP CONSTRAINT IF EXISTS fk_auth_sessions_reused_jti_of;

RAISE NOTICE 'Dropped foreign key constraint: fk_auth_sessions_reused_jti_of';

-- ============================================================================
-- 5. Remove NOT NULL constraints before dropping columns
-- ============================================================================

-- Remove NOT NULL constraint from family_id (if we're keeping it)
-- Note: family_id might be needed by other parts of the system
-- ALTER TABLE auth_sessions ALTER COLUMN family_id DROP NOT NULL;

-- Remove NOT NULL constraint from auth_time
ALTER TABLE auth_sessions ALTER COLUMN auth_time DROP NOT NULL;

RAISE NOTICE 'Removed NOT NULL constraints';

-- ============================================================================
-- 6. Drop columns (WARNING: This will lose data!)
-- ============================================================================

-- Drop the new columns added by the migration
-- Note: This will permanently delete the data in these columns

ALTER TABLE auth_sessions DROP COLUMN IF EXISTS auth_time;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS last_ip_cidr;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS device_hash;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS reused_jti_of;
ALTER TABLE auth_sessions DROP COLUMN IF EXISTS current_jti;

RAISE NOTICE 'Dropped columns: auth_time, last_ip_cidr, device_hash, reused_jti_of, current_jti';

-- ============================================================================
-- 7. Optional: Drop family_id and revoked_at if they were added by this migration
-- ============================================================================

-- Uncomment these lines if family_id and revoked_at were added by this migration
-- and are not needed by other parts of the system

-- ALTER TABLE auth_sessions DROP COLUMN IF EXISTS revoked_at;
-- ALTER TABLE auth_sessions DROP COLUMN IF EXISTS family_id;

-- RAISE NOTICE 'Dropped columns: revoked_at, family_id';

-- ============================================================================
-- 8. Restore original table structure (if needed)
-- ============================================================================

-- If you need to restore specific constraints or defaults that were modified,
-- add those commands here. For example:

-- ALTER TABLE auth_sessions ALTER COLUMN some_column SET DEFAULT some_value;

-- ============================================================================
-- 9. Clean up any remaining artifacts
-- ============================================================================

-- Remove any comments that were added
COMMENT ON COLUMN auth_sessions.family_id IS NULL;
COMMENT ON COLUMN auth_sessions.revoked_at IS NULL;

-- Remove function comments
COMMENT ON FUNCTION revoke_session_family(UUID, TEXT) IS NULL;
COMMENT ON FUNCTION handle_token_replay(UUID, UUID) IS NULL;
COMMENT ON FUNCTION rotate_session_token(VARCHAR, VARCHAR, UUID, VARCHAR, TIMESTAMP WITH TIME ZONE) IS NULL;
COMMENT ON FUNCTION cleanup_expired_sessions() IS NULL;

-- Remove view comments
COMMENT ON VIEW active_sessions IS NULL;
COMMENT ON VIEW session_families IS NULL;

RAISE NOTICE 'Cleaned up comments and artifacts';

-- ============================================================================
-- 10. Verify rollback
-- ============================================================================

-- Check that the columns were dropped
DO $
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'auth_sessions' 
    AND column_name IN ('current_jti', 'reused_jti_of', 'device_hash', 'last_ip_cidr', 'auth_time');
    
    IF col_count > 0 THEN
        RAISE EXCEPTION 'Rollback incomplete: % columns still exist', col_count;
    END IF;
    
    RAISE NOTICE 'Rollback verification passed: All target columns removed';
END $;

-- Commit transaction
COMMIT;

-- Print completion message
DO $
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Auth Sessions Security Hardening Migration ROLLBACK completed!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Removed columns: current_jti, reused_jti_of, device_hash, last_ip_cidr, auth_time';
    RAISE NOTICE 'Removed indexes for performance optimization';
    RAISE NOTICE 'Removed unique constraint for active sessions per family';
    RAISE NOTICE 'Removed helper functions for session management';
    RAISE NOTICE 'Removed views for session monitoring';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'WARNING: Security features have been removed!';
    RAISE NOTICE 'The application may need to be updated to work without these features.';
    RAISE NOTICE '=================================================================';
END $;