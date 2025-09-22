-- WebAuthn Support Migration
-- Created: 2025-01-27
-- Description: Add WebAuthn credential storage and management

-- Create WebAuthn credentials table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id SERIAL PRIMARY KEY,
    credential_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign key constraint
    CONSTRAINT fk_webauthn_credentials_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_is_active ON webauthn_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_created_at ON webauthn_credentials(created_at);

-- Create partial unique index for active credentials per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_webauthn_credentials_user_active 
    ON webauthn_credentials(user_id, credential_id) 
    WHERE is_active = TRUE;

-- Add WebAuthn support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS webauthn_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS webauthn_credentials_count INTEGER DEFAULT 0;

-- Create function to update WebAuthn credentials count
CREATE OR REPLACE FUNCTION update_webauthn_credentials_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
        UPDATE users 
        SET webauthn_credentials_count = webauthn_credentials_count + 1
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
            UPDATE users 
            SET webauthn_credentials_count = webauthn_credentials_count - 1
            WHERE id = NEW.user_id;
        ELSIF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
            UPDATE users 
            SET webauthn_credentials_count = webauthn_credentials_count + 1
            WHERE id = NEW.user_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active = TRUE THEN
        UPDATE users 
        SET webauthn_credentials_count = webauthn_credentials_count - 1
        WHERE id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for WebAuthn credentials count
DROP TRIGGER IF EXISTS trigger_update_webauthn_credentials_count ON webauthn_credentials;
CREATE TRIGGER trigger_update_webauthn_credentials_count
    AFTER INSERT OR UPDATE OR DELETE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION update_webauthn_credentials_count();

-- Create WebAuthn challenges table for temporary storage
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id SERIAL PRIMARY KEY,
    challenge VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'registration' or 'authentication'
    credential_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraint
    CONSTRAINT fk_webauthn_challenges_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for WebAuthn challenges
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

-- Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webauthn_challenges 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add WebAuthn configuration to system settings
INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
    ('webauthn_enabled', 'false', 'Enable WebAuthn authentication', NOW(), NOW()),
    ('webauthn_rp_id', 'jewgo.app', 'WebAuthn Relying Party ID', NOW(), NOW()),
    ('webauthn_rp_name', 'JewGo', 'WebAuthn Relying Party Name', NOW(), NOW()),
    ('webauthn_timeout', '300', 'WebAuthn challenge timeout in seconds', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Create view for WebAuthn user statistics
CREATE OR REPLACE VIEW webauthn_user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.webauthn_enabled,
    u.webauthn_credentials_count,
    COUNT(wc.id) as active_credentials,
    MAX(wc.created_at) as last_credential_created,
    MAX(wc.last_used) as last_credential_used
FROM users u
LEFT JOIN webauthn_credentials wc ON u.id = wc.user_id AND wc.is_active = TRUE
GROUP BY u.id, u.email, u.name, u.webauthn_enabled, u.webauthn_credentials_count;

-- Add comments for documentation
COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn/FIDO2 credentials for users';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Unique identifier for the WebAuthn credential';
COMMENT ON COLUMN webauthn_credentials.public_key IS 'Public key for the WebAuthn credential';
COMMENT ON COLUMN webauthn_credentials.counter IS 'Signature counter for replay attack prevention';
COMMENT ON COLUMN webauthn_credentials.transports IS 'Supported transports (usb, nfc, ble, internal)';

COMMENT ON TABLE webauthn_challenges IS 'Temporary storage for WebAuthn challenges';
COMMENT ON COLUMN webauthn_challenges.challenge IS 'Random challenge string for WebAuthn operations';
COMMENT ON COLUMN webauthn_challenges.challenge_type IS 'Type of challenge: registration or authentication';

COMMENT ON VIEW webauthn_user_stats IS 'Statistics view for WebAuthn user data';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON webauthn_credentials TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON webauthn_challenges TO your_app_user;
-- GRANT SELECT ON webauthn_user_stats TO your_app_user;

-- Migration completed
INSERT INTO migration_history (version, description, applied_at)
VALUES ('20250127_webauthn_support', 'Add WebAuthn/FIDO2 support with credential storage and management', NOW())
ON CONFLICT (version) DO NOTHING;