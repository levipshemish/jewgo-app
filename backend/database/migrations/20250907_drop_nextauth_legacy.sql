-- Safe drop of legacy NextAuth tables if they exist
-- This migration removes old NextAuth tables that are no longer used
-- by the application after migrating to PostgreSQL-auth.

BEGIN;

-- Drop foreign keys to these tables if any exist (best-effort, ignore errors)
-- Note: Adjust constraint names if your DB used specific names
DO $$
BEGIN
  -- Example: nothing enforced here; kept as placeholder for site-specific constraints
  NULL;
EXCEPTION WHEN OTHERS THEN
  -- Ignore; continue
  NULL;
END $$;

-- Drop tables if they exist
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Important: we do NOT drop the "users" table because it is the primary users table
--             for the PostgreSQL-auth system. The legacy NextAuth ORM against "users"
--             has been removed from the codebase.

COMMIT;

