-- OAuth, Magic Link, and Guest Authentication Migration for v5
-- Production-ready with security considerations

BEGIN;

-- Add required PostgreSQL extensions (run as superuser if needed)
-- These statements are safe if extensions already exist.
DO $$
BEGIN
    BEGIN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS citext';
    EXCEPTION WHEN insufficient_privilege THEN
        -- Extension creation requires superuser; skip if not permitted
        RAISE NOTICE 'Skipping citext extension creation due to insufficient privileges';
    END;

    BEGIN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping pgcrypto extension creation due to insufficient privileges';
    END;
END $$;

-- 1. Enhance existing accounts table: add raw_profile JSONB if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'raw_profile'
    ) THEN
        ALTER TABLE accounts ADD COLUMN raw_profile JSONB;
    END IF;
END $$;

-- 2. Create magic links table
CREATE TABLE IF NOT EXISTS magic_links_v5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create OAuth state tracking table
CREATE TABLE IF NOT EXISTS oauth_states_v5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_token VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL,
    return_to VARCHAR(500),
    extra_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links_v5(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links_v5(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_links_id_email ON magic_links_v5(id, email);
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states_v5(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states_v5(expires_at);

-- Ensure accounts lookup index exists for provider + account id
CREATE INDEX IF NOT EXISTS idx_accounts_provider_pid 
    ON accounts(provider, provideraccountid);

COMMIT;
