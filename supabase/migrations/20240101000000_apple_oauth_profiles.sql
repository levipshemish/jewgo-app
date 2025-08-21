-- Migration: Apple OAuth Profiles
-- Creates profiles table, RPC function for name UPSERT, and RLS policies

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Create RPC function for race-safe name UPSERT
CREATE OR REPLACE FUNCTION upsert_profile_with_name(p_user_id UUID, p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (user_id, name, updated_at)
    VALUES (p_user_id, p_name, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        name = COALESCE(NULLIF(TRIM(profiles.name), ''), EXCLUDED.name),
        updated_at = NOW()
    WHERE EXCLUDED.name IS NOT NULL AND TRIM(EXCLUDED.name) != '';
END;
$$;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent re-runs)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "RPC can upsert profiles" ON profiles;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions (tightened)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_profile_with_name(UUID, TEXT) TO authenticated;
