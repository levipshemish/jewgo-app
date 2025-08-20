-- Migration: Add Apple OAuth support to profiles table
-- Date: 2024-01-01
-- Description: Adds support for Apple OAuth with race-safe name persistence and identity linking

-- Add unique constraint on user_id to prevent race conditions
ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add provider-specific metadata columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for efficient provider-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);
CREATE INDEX IF NOT EXISTS idx_profiles_provider_user_id ON profiles(provider_user_id);

-- Add audit fields if not present
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles table
-- Ensure authenticated users can only INSERT/UPDATE their own profiles row
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS SELECT policy restricts viewing profiles to self only
-- This is a deliberate product decision to ensure user privacy
-- Adjust this policy if public profile viewing is required
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create function for race-safe name persistence
-- Uses COALESCE(NULLIF(TRIM(name), ''), EXCLUDED.name) to handle empty strings as unset
CREATE OR REPLACE FUNCTION upsert_profile_with_name(
    p_user_id UUID,
    p_name TEXT,
    p_provider VARCHAR(50) DEFAULT NULL,
    p_provider_user_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO profiles (
        user_id, 
        name, 
        provider, 
        provider_user_id, 
        updated_at
    ) VALUES (
        p_user_id, 
        p_name, 
        p_provider, 
        p_provider_user_id, 
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = COALESCE(NULLIF(TRIM(profiles.name), ''), EXCLUDED.name),
        provider = COALESCE(profiles.provider, EXCLUDED.provider),
        provider_user_id = COALESCE(profiles.provider_user_id, EXCLUDED.provider_user_id),
        last_sign_in_at = NOW(),
        updated_at = NOW()
    WHERE profiles.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION upsert_profile_with_name(UUID, TEXT, VARCHAR(50), VARCHAR(255)) TO authenticated;

-- Comments documenting the race-safe name persistence strategy
COMMENT ON FUNCTION upsert_profile_with_name IS 'Race-safe profile upsert with empty string handling for Apple OAuth name persistence';
COMMENT ON COLUMN profiles.provider IS 'OAuth provider (apple, google, etc.)';
COMMENT ON COLUMN profiles.provider_user_id IS 'Provider-specific user identifier';
COMMENT ON COLUMN profiles.last_sign_in_at IS 'Timestamp of last sign-in for analytics';
